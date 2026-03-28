import base64
import json
from flask import Blueprint, request, jsonify, current_app, Response
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity,
)
from datetime import timedelta, datetime, timezone

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier

from models import db, User, WebAuthnCredential, WebAuthnChallenge

webauthn_bp = Blueprint('webauthn', __name__)


def _cleanup_expired_challenges():
    expired = WebAuthnChallenge.query.filter(
        WebAuthnChallenge.created_at < db.func.datetime('now', '-5 minutes')
    ).all()
    for challenge in expired:
        db.session.delete(challenge)
    if expired:
        db.session.commit()


def _store_challenge(user_id, challenge, challenge_type):
    WebAuthnChallenge.query.filter_by(user_id=user_id, challenge_type=challenge_type).delete()
    new_challenge = WebAuthnChallenge(
        user_id=user_id,
        challenge=challenge,
        challenge_type=challenge_type,
    )
    db.session.add(new_challenge)
    db.session.commit()
    return new_challenge


def _get_challenge(user_id, challenge_type):
    challenge = WebAuthnChallenge.query.filter_by(
        user_id=user_id, challenge_type=challenge_type
    ).first()
    if challenge is None:
        return None
    if challenge.is_expired():
        db.session.delete(challenge)
        db.session.commit()
        return None
    challenge_data = challenge.challenge
    db.session.delete(challenge)
    db.session.commit()
    return challenge_data


def _make_tokens(user):
    access_token = create_access_token(
        identity=str(user.id),
        expires_delta=timedelta(hours=24),
        additional_claims={
            'user_type': user.user_type,
            'email': user.email,
            'nickname': user.nickname,
            'full_name': user.full_name,
        }
    )
    refresh_token = create_refresh_token(identity=str(user.id))
    return access_token, refresh_token


@webauthn_bp.route('/register-options', methods=['POST'])
@jwt_required()
def register_options():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    rp_id = current_app.config['WEBAUTHN_RP_ID']
    rp_name = current_app.config['WEBAUTHN_RP_NAME']

    existing = WebAuthnCredential.query.filter_by(user_id=user_id).all()
    exclude_credentials = [PublicKeyCredentialDescriptor(id=cred.credential_id) for cred in existing]

    options = generate_registration_options(
        rp_id=rp_id,
        rp_name=rp_name,
        user_id=str(user_id).encode(),
        user_name=user.email or user.nickname or f'user_{user_id}',
        user_display_name=user.full_name or user.nickname or user.email or '',
        exclude_credentials=exclude_credentials,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
        supported_pub_key_algs=[
            COSEAlgorithmIdentifier.ECDSA_SHA_256,
            COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,
        ],
    )

    _store_challenge(user_id, options.challenge, 'registration')
    return Response(options_to_json(options), status=200, mimetype='application/json')


@webauthn_bp.route('/register', methods=['POST'])
@jwt_required()
def register():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data'}), 400

    challenge = _get_challenge(user_id, 'registration')
    if challenge is None:
        return jsonify({'error': 'Challenge expired or not found'}), 400

    rp_id = current_app.config['WEBAUTHN_RP_ID']
    origin = current_app.config['WEBAUTHN_ORIGIN']

    try:
        verification = verify_registration_response(
            credential=data,
            expected_challenge=challenge,
            expected_rp_id=rp_id,
            expected_origin=origin,
        )
    except Exception as e:
        return jsonify({'error': f'Verification failed: {str(e)}'}), 400

    existing = WebAuthnCredential.query.filter_by(credential_id=verification.credential_id).first()
    if existing:
        return jsonify({'error': 'Credential already registered'}), 409

    device_name = data.get('deviceName', 'Unknown device')
    credential = WebAuthnCredential(
        user_id=user_id,
        credential_id=verification.credential_id,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
        device_name=device_name,
    )
    db.session.add(credential)
    db.session.commit()

    return jsonify({'message': 'Credential registered', 'credential': credential.to_dict()}), 201


@webauthn_bp.route('/authenticate-options', methods=['POST'])
def authenticate_options():
    data = request.get_json()
    identifier = (data.get('identifier') or data.get('email') or '').strip().lower() if data else ''
    if not identifier:
        return jsonify({'error': 'Email or nickname required'}), 400

    if '@' in identifier and '.' in identifier:
        user = User.query.filter_by(email=identifier).first()
    else:
        user = User.query.filter(db.func.lower(User.nickname) == identifier).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    credentials = WebAuthnCredential.query.filter_by(user_id=user.id).all()
    if not credentials:
        return jsonify({'error': 'No biometric credentials registered'}), 404

    rp_id = current_app.config['WEBAUTHN_RP_ID']
    allow_credentials = [PublicKeyCredentialDescriptor(id=cred.credential_id) for cred in credentials]

    options = generate_authentication_options(
        rp_id=rp_id,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    _store_challenge(user.id, options.challenge, 'authentication')
    return Response(options_to_json(options), status=200, mimetype='application/json')


@webauthn_bp.route('/authenticate', methods=['POST'])
def authenticate():
    data = request.get_json()
    identifier = (data.get('identifier') or data.get('email') or '').strip().lower() if data else ''
    if not identifier:
        return jsonify({'error': 'Email or nickname required'}), 400

    if '@' in identifier and '.' in identifier:
        user = User.query.filter_by(email=identifier).first()
    else:
        user = User.query.filter(db.func.lower(User.nickname) == identifier).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    challenge = _get_challenge(user.id, 'authentication')
    if challenge is None:
        return jsonify({'error': 'Challenge expired or not found'}), 400

    credential_data = data.get('credential')
    if not credential_data:
        return jsonify({'error': 'Credential data required'}), 400

    raw_id = base64.urlsafe_b64decode(credential_data['rawId'] + '==')
    stored_cred = WebAuthnCredential.query.filter_by(credential_id=raw_id, user_id=user.id).first()
    if not stored_cred:
        return jsonify({'error': 'Credential not found'}), 404

    rp_id = current_app.config['WEBAUTHN_RP_ID']
    origin = current_app.config['WEBAUTHN_ORIGIN']

    try:
        verification = verify_authentication_response(
            credential=credential_data,
            expected_challenge=challenge,
            expected_rp_id=rp_id,
            expected_origin=origin,
            credential_public_key=stored_cred.public_key,
            credential_current_sign_count=stored_cred.sign_count,
        )
    except Exception as e:
        return jsonify({'error': f'Authentication failed: {str(e)}'}), 400

    stored_cred.sign_count = verification.new_sign_count
    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    access_token, refresh_token = _make_tokens(user)
    return jsonify({
        'user': user.to_dict(include_sensitive=True),
        'access_token': access_token,
        'refresh_token': refresh_token,
    }), 200


@webauthn_bp.route('/credentials', methods=['GET'])
@jwt_required()
def list_credentials():
    user_id = int(get_jwt_identity())
    credentials = WebAuthnCredential.query.filter_by(user_id=user_id).all()
    return jsonify([c.to_dict() for c in credentials]), 200


@webauthn_bp.route('/credentials/<int:credential_id>', methods=['DELETE'])
@jwt_required()
def delete_credential(credential_id):
    user_id = int(get_jwt_identity())
    credential = WebAuthnCredential.query.filter_by(id=credential_id, user_id=user_id).first()
    if not credential:
        return jsonify({'error': 'Credential not found'}), 404

    db.session.delete(credential)
    db.session.commit()
    return jsonify({'message': 'Credential deleted'}), 200

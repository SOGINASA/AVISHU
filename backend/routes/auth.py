from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from models import db, User, NotificationPreference
from datetime import datetime, timedelta, timezone
import re

auth_bp = Blueprint('auth', __name__)


def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_nickname(nickname):
    pattern = r'^[a-zA-Z0-9._-]{3,20}$'
    return bool(re.match(pattern, nickname))


def is_email(identifier):
    return '@' in identifier and '.' in identifier


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


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email', '').strip().lower() if data.get('email') else None
    nickname = data.get('nickname', '').strip() if data.get('nickname') else None
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip() if data.get('full_name') else ''

    identifier = data.get('identifier', '').strip() if data.get('identifier') else None
    if identifier and not email and not nickname:
        if is_email(identifier):
            email = identifier.lower()
        else:
            nickname = identifier

    if not email and not nickname:
        return jsonify({'error': 'Email or nickname required'}), 400

    if not password:
        return jsonify({'error': 'Password required'}), 400

    if email and not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400

    if nickname and not validate_nickname(nickname):
        return jsonify({'error': 'Nickname must be 3-20 characters (letters, digits, dots, underscores, dashes)'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if email and User.query.filter_by(email=email).first():
        return jsonify({'error': 'User with this email already exists'}), 400

    if nickname and User.query.filter(db.func.lower(User.nickname) == nickname.lower()).first():
        return jsonify({'error': 'This nickname is already taken'}), 400

    VALID_ROLES = {'client'}
    role = data.get('role', '').strip().lower()
    user_type = role if role in VALID_ROLES else 'client'

    try:
        user = User(
            email=email,
            nickname=nickname,
            full_name=full_name or nickname or (email.split('@')[0] if email else nickname),
            user_type=user_type,
            is_active=True,
            is_verified=False,
            last_login=datetime.now(timezone.utc),
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        access_token, refresh_token = _make_tokens(user)
        db.session.commit()

        return jsonify({
            'user': user.to_dict(include_sensitive=True),
            'access_token': access_token,
            'refresh_token': refresh_token,
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Register error: {e}")
        return jsonify({'error': 'Account creation failed'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('password'):
        return jsonify({'error': 'Fill in all fields'}), 400

    password = data.get('password', '')
    identifier = data.get('identifier', '').strip().lower() if data.get('identifier') else ''
    email = data.get('email', '').strip().lower() if data.get('email') else ''
    nickname = data.get('nickname', '').strip().lower() if data.get('nickname') else ''

    user = None
    if identifier:
        if is_email(identifier):
            user = User.query.filter_by(email=identifier, is_active=True).first()
        else:
            user = User.query.filter(
                db.func.lower(User.nickname) == identifier,
                User.is_active == True
            ).first()
    elif email:
        user = User.query.filter_by(email=email, is_active=True).first()
    elif nickname:
        user = User.query.filter(
            db.func.lower(User.nickname) == nickname,
            User.is_active == True
        ).first()
    else:
        return jsonify({'error': 'Provide email, nickname, or identifier'}), 400

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401

    try:
        user.last_login = datetime.now(timezone.utc)

        client_tz = data.get('timezone')
        if client_tz:
            from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
            try:
                ZoneInfo(client_tz)
                prefs = NotificationPreference.query.filter_by(user_id=user.id).first()
                if not prefs:
                    prefs = NotificationPreference(user_id=user.id, timezone=client_tz)
                    db.session.add(prefs)
                elif prefs.timezone != client_tz:
                    prefs.timezone = client_tz
            except (ZoneInfoNotFoundError, Exception):
                pass

        db.session.commit()

        access_token, refresh_token = _make_tokens(user)

        return jsonify({
            'user': user.to_dict(include_sensitive=True),
            'access_token': access_token,
            'refresh_token': refresh_token,
        })

    except Exception as e:
        db.session.rollback()
        print(f"Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'User not found'}), 404

        access_token, _ = _make_tokens(user)
        return jsonify({'access_token': access_token})

    except Exception as e:
        print(f"Refresh token error: {e}")
        return jsonify({'error': 'Token refresh failed'}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({'user': user.to_dict(include_sensitive=True)})

    except Exception as e:
        print(f"Get user error: {e}")
        return jsonify({'error': 'Failed to get user'}), 500


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        if 'full_name' in data and data['full_name']:
            user.full_name = data['full_name'].strip()

        if 'nickname' in data and data['nickname']:
            new_nickname = data['nickname'].strip()
            if not validate_nickname(new_nickname):
                return jsonify({'error': 'Invalid nickname format'}), 400
            existing = User.query.filter(
                db.func.lower(User.nickname) == new_nickname.lower(),
                User.id != user.id
            ).first()
            if existing:
                return jsonify({'error': 'Nickname already taken'}), 400
            user.nickname = new_nickname

        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']

        # Обновление роли (для завершения регистрации OAuth)
        if 'role' in data and data['role']:
            role = data['role'].strip().lower()
            if role in VALID_ROLES:
                user.user_type = role

        # Завершение онбординга
        if 'onboarding_completed' in data:
            user.onboarding_completed = bool(data['onboarding_completed'])

        db.session.commit()
        return jsonify({'user': user.to_dict(include_sensitive=True)})

    except Exception as e:
        db.session.rollback()
        print(f"Update profile error: {e}")
        return jsonify({'error': 'Failed to update profile'}), 500


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        if not data or not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Current and new passwords required'}), 400

        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Wrong current password'}), 400

        if len(data['new_password']) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        user.set_password(data['new_password'])
        db.session.commit()
        return jsonify({'message': 'Password changed'})

    except Exception as e:
        db.session.rollback()
        print(f"Change password error: {e}")
        return jsonify({'error': 'Failed to change password'}), 500


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({'error': 'Email required'}), 400

    user = User.query.filter_by(email=data['email'].lower(), is_active=True).first()

    # Always return the same message for security
    if not user:
        return jsonify({'message': 'If this email exists, instructions have been sent'})

    try:
        import secrets
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.session.commit()

        # TODO: send reset email with reset_token
        print(f"[Auth] Password reset token for {user.email}: {reset_token}")

        return jsonify({'message': 'If this email exists, instructions have been sent'})

    except Exception as e:
        db.session.rollback()
        print(f"Forgot password error: {e}")
        return jsonify({'error': 'Failed to process request'}), 500


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    if not data or not data.get('token') or not data.get('password'):
        return jsonify({'error': 'Token and new password required'}), 400

    user = User.query.filter_by(reset_token=data['token']).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.now(timezone.utc):
        return jsonify({'error': 'Invalid or expired token'}), 400

    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    try:
        user.set_password(data['password'])
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        return jsonify({'message': 'Password changed successfully'})

    except Exception as e:
        db.session.rollback()
        print(f"Reset password error: {e}")
        return jsonify({'error': 'Failed to reset password'}), 500


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    data = request.get_json()
    if not data or not data.get('token'):
        return jsonify({'error': 'Verification token required'}), 400

    user = User.query.filter_by(verification_token=data['token']).first()
    if not user:
        return jsonify({'error': 'Invalid verification token'}), 400

    try:
        user.is_verified = True
        user.verification_token = None
        db.session.commit()
        return jsonify({'message': 'Email verified'})

    except Exception as e:
        db.session.rollback()
        print(f"Verify email error: {e}")
        return jsonify({'error': 'Failed to verify email'}), 500


@auth_bp.route('/deactivate', methods=['POST'])
@jwt_required()
def deactivate_account():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        if not data or not data.get('password'):
            return jsonify({'error': 'Password confirmation required'}), 400

        if not user.check_password(data['password']):
            return jsonify({'error': 'Wrong password'}), 400

        user.is_active = False
        db.session.commit()
        return jsonify({'message': 'Account deactivated'})

    except Exception as e:
        db.session.rollback()
        print(f"Deactivate account error: {e}")
        return jsonify({'error': 'Failed to deactivate account'}), 500


@auth_bp.route('/deactivate', methods=['DELETE'])
@jwt_required()
def delete_account():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'Account deleted'})

    except Exception as e:
        db.session.rollback()
        print(f"Delete account error: {e}")
        return jsonify({'error': 'Failed to delete account'}), 500

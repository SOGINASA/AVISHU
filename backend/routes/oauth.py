from flask import Blueprint, request, jsonify, redirect
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from models import db, User
from services.oauth_service import get_oauth_service
from services.auth_logger import auth_logger
from config import Config
from datetime import datetime, timedelta, timezone
import secrets
import time

oauth_bp = Blueprint('oauth', __name__)

# State tokens store (use Redis in production)
_state_tokens = {}


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


@oauth_bp.route('/start/<provider>', methods=['GET'])
def oauth_start(provider):
    try:
        if provider not in ['google', 'github', 'telegram']:
            return jsonify({'error': f'Unsupported provider: {provider}'}), 400

        mobile = request.args.get('mobile', 'false') == 'true'
        token = secrets.token_urlsafe(32)
        state = f"mob.{token}" if mobile else token
        _state_tokens[state] = {
            'created_at': datetime.now(timezone.utc),
            'ttl': 600,
        }

        auth_url = get_oauth_service().get_authorization_url(provider, state)
        return jsonify({'redirect_url': auth_url, 'state': state}), 200

    except Exception as e:
        print(f"[ERROR] OAuth start error: {str(e)}")
        return jsonify({'error': str(e)}), 400


@oauth_bp.route('/callback/<provider>', methods=['GET'])
def oauth_callback(provider):
    start_time = time.time()
    try:
        code = request.args.get('code')
        state = request.args.get('state')
        error = request.args.get('error')

        if error:
            return jsonify({'error': f'OAuth error: {error}'}), 400

        if not code or not state:
            return jsonify({'error': 'Missing code or state'}), 400

        token_response = get_oauth_service().exchange_code(provider, code)
        access_token = token_response.get('access_token')

        oauth_user = get_oauth_service().get_user_info(provider, access_token)

        user = User.query.filter(
            User.oauth_provider == provider,
            User.oauth_id == oauth_user['id']
        ).first()

        is_new_user = False

        if user:
            user.last_login = datetime.now(timezone.utc)
            db.session.commit()
            auth_logger.log_login(
                user=user, method='oauth', oauth_provider=provider, success=True,
                duration_ms=int((time.time() - start_time) * 1000)
            )
        else:
            name = oauth_user.get('name') or oauth_user.get('login') or ''
            email = oauth_user.get('email') or f"{oauth_user.get('login', oauth_user['id'])}@{provider}.oauth"
            email_part = (email or '').split('@')[0] if email else ''

            user = User(
                email=email,
                nickname=(name or email_part or '').replace(' ', '_').lower() or str(oauth_user['id']),
                full_name=name or email_part or str(oauth_user['id']),
                oauth_provider=provider,
                oauth_id=oauth_user['id'],
                oauth_access_token=access_token,
                oauth_token_expires=datetime.now(timezone.utc) + timedelta(days=365),
                user_type='user',
                is_active=True,
                is_verified=True,
                email_verified_at=datetime.now(timezone.utc),
                last_login=datetime.now(timezone.utc),
                onboarding_completed=False,
            )

            base_nickname = user.nickname
            counter = 1
            while User.query.filter(db.func.lower(User.nickname) == user.nickname.lower()).first():
                user.nickname = f"{base_nickname}_{counter}"
                counter += 1

            db.session.add(user)
            db.session.flush()
            db.session.commit()

            is_new_user = True
            auth_logger.log_register(
                user=user, method='oauth', oauth_provider=provider, success=True,
                duration_ms=int((time.time() - start_time) * 1000)
            )

        access_token_jwt, refresh_token_jwt = _make_tokens(user)

        from urllib.parse import urlencode
        import json
        callback_params = {
            'access_token': access_token_jwt,
            'refresh_token': refresh_token_jwt,
            'user': json.dumps(user.to_dict(include_sensitive=True)),
            'is_new_user': 'true' if is_new_user else 'false',
        }

        is_mobile = state.startswith('mob.')
        base_url = 'avishu://oauth/callback' if is_mobile else f"{Config.FRONTEND_URL}/oauth/callback"
        return redirect(f"{base_url}?{urlencode(callback_params)}"), 302

    except Exception as e:
        import traceback
        db.session.rollback()
        auth_logger.log_login(
            user=None, method='oauth', oauth_provider=provider, success=False,
            error=str(e), error_details=traceback.format_exc()
        )
        print(f"[ERROR] OAuth callback error: {str(e)}")
        return jsonify({'error': 'OAuth callback failed'}), 400


@oauth_bp.route('/telegram', methods=['POST'])
def telegram_auth():
    start_time = time.time()
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        from services.telegram_service import verify_telegram_auth
        if not verify_telegram_auth(dict(data)):
            return jsonify({'error': 'Invalid Telegram auth data'}), 401

        telegram_id = str(data.get('id'))
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        username = data.get('username', '')
        full_name = f"{first_name} {last_name}".strip() or username or f"tg_{telegram_id}"

        user = User.query.filter(
            User.oauth_provider == 'telegram',
            User.oauth_id == telegram_id
        ).first()

        is_new_user = False

        if user:
            user.last_login = datetime.now(timezone.utc)
            db.session.commit()
            auth_logger.log_login(user=user, method='oauth', oauth_provider='telegram', success=True,
                                  duration_ms=int((time.time() - start_time) * 1000))
        else:
            nickname_base = (username or first_name.lower().replace(' ', '_') or f"tg_{telegram_id}")
            nickname = nickname_base
            counter = 1
            while User.query.filter(db.func.lower(User.nickname) == nickname.lower()).first():
                nickname = f"{nickname_base}_{counter}"
                counter += 1

            user = User(
                nickname=nickname,
                full_name=full_name,
                oauth_provider='telegram',
                oauth_id=telegram_id,
                oauth_linked_at=datetime.now(timezone.utc),
                user_type='user',
                is_active=True,
                is_verified=True,
                last_login=datetime.now(timezone.utc),
                onboarding_completed=False,
            )
            db.session.add(user)
            db.session.flush()
            db.session.commit()
            is_new_user = True
            auth_logger.log_register(user=user, method='oauth', oauth_provider='telegram', success=True,
                                     duration_ms=int((time.time() - start_time) * 1000))

        access_token_jwt, refresh_token_jwt = _make_tokens(user)

        return jsonify({
            'access_token': access_token_jwt,
            'refresh_token': refresh_token_jwt,
            'user': user.to_dict(include_sensitive=True),
            'is_new_user': is_new_user,
        }), 200

    except Exception as e:
        import traceback
        db.session.rollback()
        auth_logger.log_login(user=None, method='oauth', oauth_provider='telegram', success=False,
                              error=str(e), error_details=traceback.format_exc())
        print(f"[ERROR] Telegram auth error: {str(e)}")
        return jsonify({'error': 'Telegram authentication failed'}), 400


@oauth_bp.route('/link/<provider>', methods=['POST'])
@jwt_required()
def oauth_link(provider):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        code = data.get('code')
        state = data.get('state')

        if not code or not state:
            return jsonify({'error': 'Missing code or state'}), 400

        if state not in _state_tokens:
            return jsonify({'error': 'Invalid state'}), 400
        del _state_tokens[state]

        token_response = get_oauth_service().exchange_code(provider, code)
        access_token = token_response.get('access_token')
        oauth_user = get_oauth_service().get_user_info(provider, access_token)

        existing = User.query.filter(
            User.oauth_provider == provider,
            User.oauth_id == oauth_user['id'],
            User.id != user_id
        ).first()
        if existing:
            auth_logger.log_oauth_link(user, provider, success=False, error="OAuth account already linked")
            return jsonify({'error': 'This OAuth account is already linked to another user'}), 400

        user.oauth_provider = provider
        user.oauth_id = oauth_user['id']
        user.oauth_access_token = access_token
        user.oauth_token_expires = datetime.now(timezone.utc) + timedelta(days=365)
        user.oauth_linked_at = datetime.now(timezone.utc)

        db.session.commit()
        auth_logger.log_oauth_link(user, provider, success=True)

        return jsonify({
            'message': f'{provider.capitalize()} account linked',
            'oauth_accounts': [{'provider': user.oauth_provider, 'linked_at': user.oauth_linked_at.isoformat()}],
        }), 200

    except Exception as e:
        db.session.rollback()
        auth_logger.log_oauth_link(user, provider, success=False, error=str(e))
        print(f"[ERROR] OAuth link error: {str(e)}")
        return jsonify({'error': 'Failed to link OAuth account'}), 400


@oauth_bp.route('/unlink/<provider>', methods=['DELETE'])
@jwt_required()
def oauth_unlink(provider):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.oauth_provider != provider:
            return jsonify({'error': 'Provider not linked'}), 400

        if not user.password_hash:
            return jsonify({'error': 'Cannot unlink OAuth without a password set'}), 400

        user.oauth_provider = None
        user.oauth_id = None
        user.oauth_access_token = None
        user.oauth_refresh_token = None
        user.oauth_token_expires = None
        db.session.commit()

        return jsonify({'message': f'{provider.capitalize()} account unlinked'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] OAuth unlink error: {str(e)}")
        return jsonify({'error': 'Failed to unlink OAuth account'}), 400


@oauth_bp.route('/accounts', methods=['GET'])
@jwt_required()
def get_oauth_accounts():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        oauth_accounts = []
        if user.oauth_provider:
            oauth_accounts.append({
                'provider': user.oauth_provider,
                'linked_at': user.oauth_linked_at.isoformat() if user.oauth_linked_at else None,
                'email': user.email,
            })

        return jsonify({
            'oauth_accounts': oauth_accounts,
            'has_password': bool(user.password_hash),
        }), 200

    except Exception as e:
        print(f"[ERROR] Get OAuth accounts error: {str(e)}")
        return jsonify({'error': str(e)}), 400

import uuid
from datetime import datetime, timedelta, timezone
from flask import request
from models import db, AuditLog
from utils.request_helpers import get_request_context


class AuthLogger:
    def log_action(self, user_id=None, action=None, action_type=None, status='success',
                   oauth_provider=None, error_message=None, error_details=None,
                   duration_ms=None, request_context=None):
        try:
            if request_context is None:
                try:
                    request_context = get_request_context(request)
                except Exception:
                    request_context = {
                        'ip_address': '0.0.0.0',
                        'user_agent': 'Unknown',
                        'device_type': 'Unknown',
                        'browser': 'Unknown',
                        'os': 'Unknown',
                    }

            log = AuditLog(
                user_id=user_id,
                action=action,
                action_type=action_type,
                status=status,
                ip_address=request_context.get('ip_address'),
                user_agent=request_context.get('user_agent'),
                device_type=request_context.get('device_type'),
                browser=request_context.get('browser'),
                os=request_context.get('os'),
                oauth_provider=oauth_provider,
                error_message=error_message,
                error_details=error_details,
                session_id=self._get_session_id(),
                request_id=str(uuid.uuid4()),
                duration_ms=duration_ms,
            )
            db.session.add(log)
            db.session.commit()
            return log.request_id

        except Exception as e:
            db.session.rollback()
            print(f"[LOGGER ERROR] Failed to log action: {str(e)}")
            return None

    def log_register(self, user, method='email', oauth_provider=None,
                     success=True, error=None, error_details=None, duration_ms=None):
        action = 'REGISTER_OAUTH' if method == 'oauth' else 'REGISTER_EMAIL'
        return self.log_action(
            user_id=user.id if user else None,
            action=action, action_type='auth',
            status='success' if success else 'failure',
            oauth_provider=oauth_provider,
            error_message=error, error_details=error_details, duration_ms=duration_ms,
            request_context=get_request_context(request),
        )

    def log_login(self, user, method='email', oauth_provider=None,
                  success=True, error=None, error_details=None, duration_ms=None):
        action = 'LOGIN_OAUTH' if method == 'oauth' else 'LOGIN_EMAIL'
        if not success:
            action = 'LOGIN_FAILED'
        return self.log_action(
            user_id=user.id if user else None,
            action=action, action_type='auth',
            status='success' if success else 'failure',
            oauth_provider=oauth_provider,
            error_message=error, error_details=error_details, duration_ms=duration_ms,
            request_context=get_request_context(request),
        )

    def log_oauth_link(self, user, provider, success=True, error=None):
        return self.log_action(
            user_id=user.id,
            action='OAUTH_LINK' if success else 'OAUTH_LINK_FAILED',
            action_type='oauth',
            status='success' if success else 'failure',
            oauth_provider=provider,
            error_message=error,
            request_context=get_request_context(request),
        )

    def count_failed_attempts(self, ip, minutes=10):
        since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        return AuditLog.query.filter(
            AuditLog.ip_address == ip,
            AuditLog.action == 'LOGIN_FAILED',
            AuditLog.created_at >= since,
        ).count()

    def _get_session_id(self):
        try:
            return request.cookies.get('session_id') or str(uuid.uuid4())
        except Exception:
            return str(uuid.uuid4())


auth_logger = AuthLogger()

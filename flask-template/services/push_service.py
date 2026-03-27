import json
import threading
from pywebpush import webpush, WebPushException
from flask import current_app
from models import db, PushSubscription, Notification, NotificationPreference
from services import websocket_service


class PushService:
    @staticmethod
    def send_to_user(user_id, notification):
        """Send Web Push to all user devices (background thread)"""
        subscriptions = PushSubscription.query.filter_by(user_id=user_id).all()
        if not subscriptions:
            return False

        vapid_private_key = current_app.config.get('VAPID_PRIVATE_KEY', '')
        if not vapid_private_key:
            return False

        vapid_claims = {'sub': current_app.config['VAPID_CLAIMS_EMAIL']}

        payload = json.dumps({
            'title': notification.title,
            'body': notification.body,
            'icon': '/logo192.png',
            'badge': '/logo192.png',
            'category': notification.category,
            'notificationId': notification.id,
            'url': '/',
        }, ensure_ascii=False)

        sub_dicts = [sub.to_webpush_dict() for sub in subscriptions]
        sub_ids = [sub.id for sub in subscriptions]
        notification_id = notification.id
        app = current_app._get_current_object()

        def _send_in_background():
            with app.app_context():
                sent = False
                for sub_dict, sub_id in zip(sub_dicts, sub_ids):
                    try:
                        webpush(
                            subscription_info=sub_dict,
                            data=payload,
                            vapid_private_key=vapid_private_key,
                            vapid_claims=vapid_claims,
                        )
                        sent = True
                    except WebPushException as e:
                        if e.response and e.response.status_code == 410:
                            expired = PushSubscription.query.get(sub_id)
                            if expired:
                                db.session.delete(expired)
                    except Exception:
                        pass

                notif = Notification.query.get(notification_id)
                if notif:
                    notif.is_pushed = sent
                db.session.commit()

        thread = threading.Thread(target=_send_in_background, daemon=True)
        thread.start()
        return True


def create_and_push_notification(user_id, title, body, category, related_type=None, related_id=None):
    """Create a notification record and push it via WebSocket + Web Push"""
    notification = Notification(
        user_id=user_id,
        title=title,
        body=body,
        category=category,
        related_type=related_type,
        related_id=related_id,
    )
    db.session.add(notification)
    db.session.flush()

    prefs = NotificationPreference.query.filter_by(user_id=user_id).first()
    should_push = prefs and prefs.push_enabled and prefs.system_notifications

    db.session.commit()

    # Instant delivery via WebSocket
    websocket_service.send_notification(user_id, notification.to_dict())

    unread = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    websocket_service.send_unread_count(user_id, unread)

    # Background Web Push
    if should_push:
        PushService.send_to_user(user_id, notification)

    return notification

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from models import db, Notification, NotificationPreference, PushSubscription
from services.push_service import create_and_push_notification

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/get', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'notifications': [n.to_dict() for n in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
        'hasMore': pagination.has_next,
    })


@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    user_id = int(get_jwt_identity())
    count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({'count': count})


@notifications_bp.route('/read/<int:notification_id>', methods=['POST'])
@jwt_required()
def mark_as_read(notification_id):
    user_id = int(get_jwt_identity())
    notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if not notification:
        return jsonify({'error': 'Notification not found'}), 404

    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({'message': 'Marked as read'})


@notifications_bp.route('/read-all', methods=['POST'])
@jwt_required()
def mark_all_as_read():
    user_id = int(get_jwt_identity())
    now = datetime.now(timezone.utc)
    Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True, 'read_at': now})
    db.session.commit()
    return jsonify({'message': 'All notifications marked as read'})


@notifications_bp.route('/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    user_id = int(get_jwt_identity())
    notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if not notification:
        return jsonify({'error': 'Notification not found'}), 404

    db.session.delete(notification)
    db.session.commit()
    return jsonify({'message': 'Notification deleted'})


@notifications_bp.route('/delete-all', methods=['DELETE'])
@jwt_required()
def delete_all_notifications():
    user_id = int(get_jwt_identity())
    count = Notification.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': f'Deleted {count} notifications', 'deleted': count})


@notifications_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_preferences():
    user_id = int(get_jwt_identity())
    prefs = NotificationPreference.query.filter_by(user_id=user_id).first()
    if not prefs:
        prefs = NotificationPreference(user_id=user_id)
        db.session.add(prefs)
        db.session.commit()
    return jsonify({'preferences': prefs.to_dict()})


@notifications_bp.route('/preferences', methods=['PUT'])
@jwt_required()
def save_preferences():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    prefs = NotificationPreference.query.filter_by(user_id=user_id).first()
    if not prefs:
        prefs = NotificationPreference(user_id=user_id)
        db.session.add(prefs)

    if 'systemNotifications' in data:
        prefs.system_notifications = data['systemNotifications']
    if 'securityAlerts' in data:
        prefs.security_alerts = data['securityAlerts']
    if 'marketingNotifications' in data:
        prefs.marketing_notifications = data['marketingNotifications']
    if 'pushEnabled' in data:
        prefs.push_enabled = data['pushEnabled']
    if 'timezone' in data:
        try:
            ZoneInfo(data['timezone'])
            prefs.timezone = data['timezone']
        except (ZoneInfoNotFoundError, KeyError):
            pass

    db.session.commit()
    return jsonify({'message': 'Preferences saved', 'preferences': prefs.to_dict()})


@notifications_bp.route('/subscribe', methods=['POST'])
@jwt_required()
def subscribe_push():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    endpoint = data.get('endpoint')
    keys = data.get('keys', {})
    p256dh = keys.get('p256dh')
    auth = keys.get('auth')

    if not all([endpoint, p256dh, auth]):
        return jsonify({'error': 'Incomplete subscription data'}), 400

    with db.session.no_autoflush:
        existing = PushSubscription.query.filter_by(endpoint=endpoint).first()
        if existing:
            existing.user_id = user_id
            existing.p256dh_key = p256dh
            existing.auth_key = auth
            existing.user_agent = request.headers.get('User-Agent', '')
        else:
            sub = PushSubscription(
                user_id=user_id,
                endpoint=endpoint,
                p256dh_key=p256dh,
                auth_key=auth,
                user_agent=request.headers.get('User-Agent', ''),
            )
            db.session.add(sub)

        prefs = NotificationPreference.query.filter_by(user_id=user_id).first()
        if prefs:
            prefs.push_enabled = True
        else:
            prefs = NotificationPreference(user_id=user_id, push_enabled=True)
            db.session.add(prefs)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        existing = PushSubscription.query.filter_by(endpoint=endpoint).first()
        if existing:
            existing.user_id = user_id
            existing.p256dh_key = p256dh
            existing.auth_key = auth
            existing.user_agent = request.headers.get('User-Agent', '')
            db.session.commit()

    return jsonify({'message': 'Subscription saved'}), 201


@notifications_bp.route('/unsubscribe', methods=['DELETE'])
@jwt_required()
def unsubscribe_push():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    endpoint = data.get('endpoint')

    if endpoint:
        PushSubscription.query.filter_by(user_id=user_id, endpoint=endpoint).delete()
    else:
        PushSubscription.query.filter_by(user_id=user_id).delete()

    remaining = PushSubscription.query.filter_by(user_id=user_id).count()
    if remaining == 0:
        prefs = NotificationPreference.query.filter_by(user_id=user_id).first()
        if prefs:
            prefs.push_enabled = False

    db.session.commit()
    return jsonify({'message': 'Unsubscribed'})


@notifications_bp.route('/vapid-key', methods=['GET'])
def get_vapid_key():
    return jsonify({'publicKey': current_app.config['VAPID_PUBLIC_KEY']})


@notifications_bp.route('/test', methods=['POST'])
@jwt_required()
def send_test_notification():
    user_id = int(get_jwt_identity())
    prefs = NotificationPreference.query.filter_by(user_id=user_id).first()
    subs = PushSubscription.query.filter_by(user_id=user_id).all()
    vapid_set = bool(current_app.config.get('VAPID_PRIVATE_KEY'))

    notification = create_and_push_notification(
        user_id=user_id,
        title='Test notification',
        body='Push notifications are working!',
        category='system',
    )

    return jsonify({
        'message': 'Test notification sent',
        'notification': notification.to_dict(),
        'debug': {
            'vapid_configured': vapid_set,
            'push_enabled': prefs.push_enabled if prefs else False,
            'subscriptions_count': len(subs),
            'is_pushed': notification.is_pushed,
        },
    })

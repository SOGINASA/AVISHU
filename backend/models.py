from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

db = SQLAlchemy()


def _utc_iso(dt):
    """Convert datetime to ISO string with Z suffix."""
    if dt is None:
        return None
    s = dt.isoformat()
    if not s.endswith('Z') and '+' not in s:
        s += 'Z'
    return s


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    nickname = db.Column(db.String(50), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=True)

    full_name = db.Column(db.String(100))
    avatar_url = db.Column(db.String(500), nullable=True)
    user_type = db.Column(db.String(20), default='user')  # user, admin
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = db.Column(db.DateTime)

    # Password reset / email verification tokens
    reset_token = db.Column(db.String(100), unique=True, nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
    verification_token = db.Column(db.String(100), unique=True, nullable=True)
    onboarding_completed = db.Column(db.Boolean, default=False)

    # OAuth fields
    oauth_provider = db.Column(db.String(50), nullable=True, index=True)
    oauth_id = db.Column(db.String(255), nullable=True)
    oauth_access_token = db.Column(db.Text, nullable=True)
    oauth_refresh_token = db.Column(db.Text, nullable=True)
    oauth_token_expires = db.Column(db.DateTime, nullable=True)
    oauth_linked_at = db.Column(db.DateTime, nullable=True)
    email_verified_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.UniqueConstraint('oauth_provider', 'oauth_id', name='uq_oauth_provider_id'),
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'email': self.email,
            'nickname': self.nickname,
            'full_name': self.full_name,
            'avatar_url': self.avatar_url,
            'user_type': self.user_type,
            'onboarding_completed': self.onboarding_completed,
            'created_at': _utc_iso(self.created_at),
            'last_login': _utc_iso(self.last_login),
            'oauth_provider': self.oauth_provider,
        }
        if include_sensitive:
            data['is_active'] = self.is_active
            data['is_verified'] = self.is_verified
        return data


class WebAuthnCredential(db.Model):
    __tablename__ = 'webauthn_credentials'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    credential_id = db.Column(db.LargeBinary, unique=True, nullable=False)
    public_key = db.Column(db.LargeBinary, nullable=False)
    sign_count = db.Column(db.Integer, default=0)
    device_name = db.Column(db.String(255), default='')

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref=db.backref('webauthn_credentials', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'deviceName': self.device_name,
            'createdAt': _utc_iso(self.created_at),
        }


class WebAuthnChallenge(db.Model):
    __tablename__ = 'webauthn_challenges'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    challenge = db.Column(db.LargeBinary, nullable=False)
    challenge_type = db.Column(db.String(20), nullable=False)  # 'registration' or 'authentication'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index('ix_webauthn_challenges_user_type', 'user_id', 'challenge_type'),
    )

    def is_expired(self):
        created = self.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - created).total_seconds() > 300


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)

    action = db.Column(db.String(50), nullable=False, index=True)
    action_type = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='success')

    ip_address = db.Column(db.String(45), index=True)
    user_agent = db.Column(db.Text)
    device_type = db.Column(db.String(50))
    browser = db.Column(db.String(50))
    os = db.Column(db.String(50))

    oauth_provider = db.Column(db.String(50), nullable=True)
    oauth_id = db.Column(db.String(255), nullable=True)

    error_code = db.Column(db.String(50), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    error_details = db.Column(db.Text, nullable=True)

    changes = db.Column(db.Text, nullable=True)

    session_id = db.Column(db.String(100), index=True)
    request_id = db.Column(db.String(100), unique=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    duration_ms = db.Column(db.Integer)

    __table_args__ = (
        db.Index('ix_audit_user_action_date', 'user_id', 'action', 'created_at'),
        db.Index('ix_audit_ip_date', 'ip_address', 'created_at'),
        db.Index('ix_audit_session', 'session_id', 'created_at'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'action_type': self.action_type,
            'status': self.status,
            'ip_address': self.ip_address,
            'device_type': self.device_type,
            'browser': self.browser,
            'os': self.os,
            'oauth_provider': self.oauth_provider,
            'error_message': self.error_message,
            'created_at': _utc_iso(self.created_at),
            'duration_ms': self.duration_ms,
        }


class PushSubscription(db.Model):
    __tablename__ = 'push_subscriptions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    endpoint = db.Column(db.Text, nullable=False)
    p256dh_key = db.Column(db.String(255), nullable=False)
    auth_key = db.Column(db.String(255), nullable=False)
    user_agent = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref=db.backref('push_subscriptions', lazy='dynamic', cascade='all, delete-orphan'))

    __table_args__ = (
        db.UniqueConstraint('endpoint', name='uq_push_endpoint'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'userAgent': self.user_agent,
            'createdAt': _utc_iso(self.created_at),
        }

    def to_webpush_dict(self):
        return {
            'endpoint': self.endpoint,
            'keys': {
                'p256dh': self.p256dh_key,
                'auth': self.auth_key,
            }
        }


class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    # Generic categories: system, alert, reminder, update, security
    category = db.Column(db.String(30), nullable=False, index=True)

    related_type = db.Column(db.String(30), nullable=True)
    related_id = db.Column(db.Integer, nullable=True)

    is_read = db.Column(db.Boolean, default=False, index=True)
    is_pushed = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    read_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', backref=db.backref('notifications', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'body': self.body,
            'category': self.category,
            'relatedType': self.related_type,
            'relatedId': self.related_id,
            'isRead': self.is_read,
            'createdAt': _utc_iso(self.created_at),
            'readAt': _utc_iso(self.read_at),
        }


class NotificationPreference(db.Model):
    __tablename__ = 'notification_preferences'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)

    # Generic toggles — add app-specific ones as needed
    system_notifications = db.Column(db.Boolean, default=True)
    security_alerts = db.Column(db.Boolean, default=True)
    marketing_notifications = db.Column(db.Boolean, default=False)

    push_enabled = db.Column(db.Boolean, default=False)
    timezone = db.Column(db.String(50), default='UTC')

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref=db.backref('notification_preferences', uselist=False, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'systemNotifications': self.system_notifications,
            'securityAlerts': self.security_alerts,
            'marketingNotifications': self.marketing_notifications,
            'pushEnabled': self.push_enabled,
            'timezone': self.timezone,
        }


class Feedback(db.Model):
    __tablename__ = 'feedbacks'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category = db.Column(db.String(30), nullable=False)  # bug, feature, improvement, other
    rating = db.Column(db.Integer, nullable=True)  # 1-5
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref=db.backref('feedbacks', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self, include_user=False):
        data = {
            'id': self.id,
            'userId': self.user_id,
            'category': self.category,
            'rating': self.rating,
            'message': self.message,
            'isRead': self.is_read,
            'createdAt': _utc_iso(self.created_at),
        }
        if include_user and self.user:
            data['user'] = {
                'name': self.user.full_name or self.user.nickname or 'User',
                'email': self.user.email or '—',
            }
        return data


# ─── Catalog ────────────────────────────────────────────────────────────────

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Float, nullable=False)
    image_url = db.Column(db.String(500), nullable=True)
    category = db.Column(db.String(50), nullable=True)
    is_preorder = db.Column(db.Boolean, default=False)
    in_stock = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'imageUrl': self.image_url,
            'category': self.category,
            'isPreorder': self.is_preorder,
            'inStock': self.in_stock,
        }


# ─── Orders ─────────────────────────────────────────────────────────────────

# Status flow: placed → accepted → sewing → ready → delivered
ORDER_STATUSES = ['placed', 'accepted', 'sewing', 'ready', 'delivered']


class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)

    client_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    franchisee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)

    status = db.Column(db.String(20), nullable=False, default='placed', index=True)
    quantity = db.Column(db.Integer, default=1)
    total_price = db.Column(db.Float, nullable=False)
    notes = db.Column(db.Text, nullable=True)

    # For preorders
    desired_date = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    seamstress_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    claimed_at = db.Column(db.DateTime, nullable=True)

    client = db.relationship('User', foreign_keys=[client_id],
                             backref=db.backref('orders_as_client', lazy='dynamic'))
    franchisee = db.relationship('User', foreign_keys=[franchisee_id],
                                 backref=db.backref('orders_as_franchisee', lazy='dynamic'))
    seamstress = db.relationship('User', foreign_keys=[seamstress_id],
                                 backref=db.backref('orders_as_seamstress', lazy='dynamic'))
    product = db.relationship('Product', backref=db.backref('orders', lazy='dynamic'))

    def to_dict(self, include_client=False, include_product=False):
        data = {
            'id': self.id,
            'clientId': self.client_id,
            'franchiseeId': self.franchisee_id,
            'productId': self.product_id,
            'seamstressId': self.seamstress_id,
            'claimedAt': _utc_iso(self.claimed_at),
            'status': self.status,
            'quantity': self.quantity,
            'totalPrice': self.total_price,
            'notes': self.notes,
            'desiredDate': _utc_iso(self.desired_date),
            'createdAt': _utc_iso(self.created_at),
            'updatedAt': _utc_iso(self.updated_at),
        }
        if include_client and self.client:
            data['client'] = {
                'id': self.client.id,
                'name': self.client.full_name or self.client.nickname or 'Client',
                'email': self.client.email or '—',
            }
            if self.seamstress:
                data['seamstress'] = {'id': self.seamstress.id, 'name': self.seamstress.full_name or '—'}
        if include_product and self.product:
            data['product'] = self.product.to_dict()
        return data


CUSTOM_ORDER_STATUSES = ['pending_review', 'pending_payment', 'placed', 'accepted', 'sewing', 'ready', 'delivered']


class CustomOrder(db.Model):
    __tablename__ = 'custom_orders'
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    seamstress_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    photo_url = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(30), default='pending_review', nullable=False, index=True)
    price = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    claimed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))
    client = db.relationship('User', foreign_keys=[client_id], backref=db.backref('custom_orders_as_client', lazy='dynamic'))
    manager = db.relationship('User', foreign_keys=[manager_id])
    seamstress = db.relationship('User', foreign_keys=[seamstress_id])

    def to_dict(self, include_client=False):
        data = {
            'id': self.id,
            'clientId': self.client_id,
            'managerId': self.manager_id,
            'seamstressId': self.seamstress_id,
            'title': self.title,
            'description': self.description,
            'photoUrl': self.photo_url,
            'status': self.status,
            'price': self.price,
            'notes': self.notes,
            'claimedAt': _utc_iso(self.claimed_at),
            'createdAt': _utc_iso(self.created_at),
            'updatedAt': _utc_iso(self.updated_at),
            'isCustom': True,
        }
        if include_client and self.client:
            data['client'] = {
                'id': self.client.id,
                'name': self.client.full_name or self.client.nickname or 'Client',
                'email': self.client.email or '—',
            }
        if self.seamstress:
            data['seamstress'] = {'id': self.seamstress.id, 'name': self.seamstress.full_name or '—'}
        return data

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Feedback, AuditLog, Order
from functools import wraps

admin_bp = Blueprint('admin', __name__)


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '').strip()

    query = User.query
    if search:
        query = query.filter(
            db.or_(
                User.email.ilike(f'%{search}%'),
                User.nickname.ilike(f'%{search}%'),
                User.full_name.ilike(f'%{search}%'),
            )
        )

    pagination = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'users': [u.to_dict(include_sensitive=True) for u in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
    })


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict(include_sensitive=True)})


@admin_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
@admin_required
def deactivate_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user.is_active = False
    db.session.commit()
    return jsonify({'message': f'User {user_id} deactivated'})


@admin_bp.route('/users/<int:user_id>/activate', methods=['POST'])
@admin_required
def activate_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user.is_active = True
    db.session.commit()
    return jsonify({'message': f'User {user_id} activated'})


@admin_bp.route('/feedback', methods=['GET'])
@admin_required
def list_feedback():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    unread_only = request.args.get('unread', 'false').lower() == 'true'

    query = Feedback.query
    if unread_only:
        query = query.filter_by(is_read=False)

    pagination = query.order_by(Feedback.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'feedbacks': [f.to_dict(include_user=True) for f in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
    })


@admin_bp.route('/feedback/<int:feedback_id>/read', methods=['POST'])
@admin_required
def mark_feedback_read(feedback_id):
    feedback = Feedback.query.get(feedback_id)
    if not feedback:
        return jsonify({'error': 'Feedback not found'}), 404
    feedback.is_read = True
    db.session.commit()
    return jsonify({'message': 'Marked as read'})


@admin_bp.route('/audit-logs', methods=['GET'])
@admin_required
def list_audit_logs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    action_type = request.args.get('action_type')
    status = request.args.get('status')

    query = AuditLog.query
    if action_type:
        query = query.filter_by(action_type=action_type)
    if status:
        query = query.filter_by(status=status)

    pagination = query.order_by(AuditLog.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'logs': [log.to_dict() for log in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
    })


@admin_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    full_name = (data.get('full_name') or '').strip()
    password = data.get('password') or ''
    role = (data.get('role') or '').strip().lower()

    VALID_ROLES = {'client', 'franchisee', 'production', 'admin'}
    if role not in VALID_ROLES:
        return jsonify({'error': 'Invalid role'}), 400
    if not email or not password or not full_name:
        return jsonify({'error': 'email, full_name, password required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password min 6 chars'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 400

    user = User(
        email=email,
        full_name=full_name,
        user_type=role,
        is_active=True,
        is_verified=True,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'user': user.to_dict(include_sensitive=True)}), 201


@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    total_users = User.query.count()
    active_users = User.query.filter_by(is_active=True).count()
    unread_feedback = Feedback.query.filter_by(is_read=False).count()
    total_orders = Order.query.count()
    new_orders = Order.query.filter_by(status='placed').count()

    return jsonify({
        'users': {'total': total_users, 'active': active_users},
        'feedback': {'unread': unread_feedback},
        'orders': {'total': total_orders, 'new': new_orders},
    })

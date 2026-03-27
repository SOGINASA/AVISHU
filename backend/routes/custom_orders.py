import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
from models import db, User, CustomOrder, CUSTOM_ORDER_STATUSES
from services import websocket_service

custom_orders_bp = Blueprint('custom_orders', __name__)

ALLOWED_EXT = {'jpg', 'jpeg', 'png', 'webp'}

CUSTOM_TRANSITIONS = {
    'franchisee': {
        'placed': 'accepted',
        'accepted': 'sewing',
        'ready': 'delivered',
    },
    'production': {
        'accepted': 'sewing',
        'sewing': 'ready',
    },
    'admin': {
        'placed': 'accepted',
        'accepted': 'sewing',
        'sewing': 'ready',
        'ready': 'delivered',
    },
}


def _broadcast(order, event_type='custom_order_updated'):
    payload = order.to_dict(include_client=True)
    msg = {'type': event_type, 'payload': payload}
    websocket_service.send_to_user(order.client_id, msg)
    staff = User.query.filter(
        User.user_type.in_(['franchisee', 'production', 'admin']),
        User.is_active == True
    ).all()
    for u in staff:
        websocket_service.send_to_user(u.id, msg)


@custom_orders_bp.route('/', methods=['POST'])
@jwt_required()
def create():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type != 'client':
        return jsonify({'error': 'Clients only'}), 403
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'title required'}), 400
    order = CustomOrder(
        client_id=user_id,
        title=title,
        description=data.get('description', '').strip() or None,
        notes=data.get('notes', '').strip() or None,
        status='pending_review',
    )
    db.session.add(order)
    db.session.commit()
    _broadcast(order, 'custom_order_new')
    return jsonify({'order': order.to_dict()}), 201


@custom_orders_bp.route('/<int:order_id>/photo', methods=['POST'])
@jwt_required()
def upload_photo(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    order = CustomOrder.query.get(order_id)
    if not order:
        return jsonify({'error': 'Not found'}), 404
    if order.client_id != user_id and user.user_type not in ('admin', 'franchisee'):
        return jsonify({'error': 'Forbidden'}), 403
    if 'photo' not in request.files:
        return jsonify({'error': 'No file'}), 400
    file = request.files['photo']
    ext = (file.filename or '').rsplit('.', 1)[-1].lower()
    if ext not in ALLOWED_EXT:
        return jsonify({'error': 'Only jpg, png, webp allowed'}), 400
    upload_dir = os.path.join(current_app.root_path, 'static', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(upload_dir, filename))
    order.photo_url = f"/static/uploads/{filename}"
    order.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({'order': order.to_dict()})


@custom_orders_bp.route('/', methods=['GET'])
@jwt_required()
def list_orders():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    if user.user_type == 'client':
        orders = CustomOrder.query.filter_by(client_id=user_id).order_by(CustomOrder.created_at.desc()).all()
    elif user.user_type == 'production':
        orders = CustomOrder.query.filter(
            db.or_(
                db.and_(CustomOrder.status.in_(['accepted', 'sewing', 'ready']),
                        db.or_(CustomOrder.seamstress_id == None, CustomOrder.seamstress_id == user_id)),
                CustomOrder.seamstress_id == user_id
            )
        ).order_by(CustomOrder.created_at.desc()).all()
    else:
        orders = CustomOrder.query.order_by(CustomOrder.created_at.desc()).all()
    return jsonify({'orders': [o.to_dict(include_client=True) for o in orders]})


@custom_orders_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    order = CustomOrder.query.get(order_id)
    if not order:
        return jsonify({'error': 'Not found'}), 404
    if user.user_type == 'client' and order.client_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403
    return jsonify({'order': order.to_dict(include_client=True)})


@custom_orders_bp.route('/<int:order_id>/price', methods=['PATCH'])
@jwt_required()
def set_price(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type not in ('franchisee', 'admin'):
        return jsonify({'error': 'Forbidden'}), 403
    order = CustomOrder.query.get(order_id)
    if not order or order.status != 'pending_review':
        return jsonify({'error': 'Order not in pending_review'}), 400
    data = request.get_json() or {}
    price = data.get('price')
    if price is None or float(price) <= 0:
        return jsonify({'error': 'Valid price required'}), 400
    order.price = float(price)
    order.manager_id = user_id
    order.status = 'pending_payment'
    order.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    _broadcast(order, 'custom_order_updated')
    return jsonify({'order': order.to_dict(include_client=True)})


@custom_orders_bp.route('/<int:order_id>/pay', methods=['POST'])
@jwt_required()
def pay(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    order = CustomOrder.query.get(order_id)
    if not order:
        return jsonify({'error': 'Not found'}), 404
    if order.client_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403
    if order.status != 'pending_payment':
        return jsonify({'error': 'Not ready for payment'}), 400
    order.status = 'placed'
    order.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    _broadcast(order, 'custom_order_updated')
    return jsonify({'order': order.to_dict()})


@custom_orders_bp.route('/<int:order_id>/claim', methods=['POST'])
@jwt_required()
def claim(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type != 'production':
        return jsonify({'error': 'Production only'}), 403
    order = CustomOrder.query.get(order_id)
    if not order or order.status not in ('accepted',):
        return jsonify({'error': 'Order not available'}), 400
    if order.seamstress_id and order.seamstress_id != user_id:
        return jsonify({'error': 'Already claimed'}), 409
    order.seamstress_id = user_id
    order.claimed_at = datetime.now(timezone.utc)
    order.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    _broadcast(order, 'custom_order_updated')
    return jsonify({'order': order.to_dict(include_client=True)})


@custom_orders_bp.route('/<int:order_id>/unclaim', methods=['POST'])
@jwt_required()
def unclaim(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type != 'production':
        return jsonify({'error': 'Production only'}), 403
    order = CustomOrder.query.get(order_id)
    if not order or order.seamstress_id != user_id:
        return jsonify({'error': 'Not your order'}), 403
    order.seamstress_id = None
    order.claimed_at = None
    order.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    _broadcast(order, 'custom_order_updated')
    return jsonify({'order': order.to_dict(include_client=True)})


@custom_orders_bp.route('/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
def update_status(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type not in ('franchisee', 'production', 'admin'):
        return jsonify({'error': 'Forbidden'}), 403
    order = CustomOrder.query.get(order_id)
    if not order:
        return jsonify({'error': 'Not found'}), 404
    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in CUSTOM_ORDER_STATUSES:
        return jsonify({'error': 'Invalid status'}), 400
    if user.user_type == 'production' and order.seamstress_id != user_id:
        return jsonify({'error': 'Claim this order first'}), 403
    allowed = CUSTOM_TRANSITIONS.get(user.user_type, {})
    if user.user_type != 'admin' and allowed.get(order.status) != new_status:
        return jsonify({'error': f'Cannot transition {order.status} → {new_status}'}), 400
    old_status = order.status
    order.status = new_status
    order.updated_at = datetime.now(timezone.utc)
    if new_status == 'accepted' and not order.manager_id:
        order.manager_id = user_id
    db.session.commit()
    _broadcast(order, 'custom_order_updated')
    return jsonify({'order': order.to_dict(include_client=True), 'transition': f'{old_status} → {new_status}'})

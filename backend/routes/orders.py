from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
from models import db, User, Order, Product, ORDER_STATUSES
from services import websocket_service

orders_bp = Blueprint('orders', __name__)

ALLOWED_TRANSITIONS = {
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


def _broadcast_order(order, event_type='order_updated'):
    payload = order.to_dict(include_client=True, include_product=True)
    msg = {'type': event_type, 'payload': payload}
    websocket_service.send_to_user(order.client_id, msg)
    staff = User.query.filter(
        User.user_type.in_(['franchisee', 'production', 'admin']),
        User.is_active == True
    ).all()
    for u in staff:
        websocket_service.send_to_user(u.id, msg)


@orders_bp.route('/', methods=['POST'])
@jwt_required()
def create_order():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data'}), 400

    product_id = data.get('productId') or data.get('product_id')
    if not product_id:
        return jsonify({'error': 'productId required'}), 400

    product = Product.query.filter_by(id=product_id, is_active=True).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    quantity = int(data.get('quantity', 1))
    total_price = product.price * quantity

    desired_date = None
    if data.get('desiredDate'):
        try:
            desired_date = datetime.fromisoformat(data['desiredDate'].replace('Z', '+00:00'))
        except Exception:
            pass

    order = Order(
        client_id=user_id,
        product_id=product_id,
        status='placed',
        quantity=quantity,
        total_price=total_price,
        notes=data.get('notes'),
        desired_date=desired_date,
    )
    db.session.add(order)
    db.session.commit()

    _broadcast_order(order, 'order_new')
    return jsonify({'order': order.to_dict(include_product=True)}), 201


@orders_bp.route('/', methods=['GET'])
@jwt_required()
def list_orders():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status_filter = request.args.get('status')

    if user.user_type == 'client':
        query = Order.query.filter_by(client_id=user_id)
    elif user.user_type == 'production':
        query = Order.query.filter(
            db.or_(
                db.and_(Order.status == 'accepted', db.or_(Order.seamstress_id == None, Order.seamstress_id == user_id)),
                Order.seamstress_id == user_id
            )
        )
    elif user.user_type in ('franchisee', 'admin'):
        query = Order.query
    else:
        query = Order.query.filter_by(client_id=user_id)

    if status_filter:
        query = query.filter_by(status=status_filter)

    pagination = query.order_by(Order.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'orders': [o.to_dict(include_client=True, include_product=True) for o in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
    })


@orders_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404

    if user.user_type == 'client' and order.client_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403

    return jsonify({'order': order.to_dict(include_client=True, include_product=True)})


@orders_bp.route('/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
def update_status(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({'error': 'Unauthorized'}), 401

    if user.user_type not in ('franchisee', 'production', 'admin'):
        return jsonify({'error': 'Forbidden'}), 403

    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404

    if user.user_type == 'production' and order.seamstress_id != user_id:
        return jsonify({'error': 'Claim this order first'}), 403

    data = request.get_json()
    new_status = data.get('status')

    if new_status not in ORDER_STATUSES:
        return jsonify({'error': f'Invalid status. Valid: {ORDER_STATUSES}'}), 400

    allowed = ALLOWED_TRANSITIONS.get(user.user_type, {})
    if user.user_type != 'admin' and allowed.get(order.status) != new_status:
        return jsonify({
            'error': f'Cannot transition {order.status} → {new_status} as {user.user_type}'
        }), 400

    old_status = order.status
    order.status = new_status
    order.updated_at = datetime.now(timezone.utc)

    if new_status == 'accepted' and not order.franchisee_id:
        order.franchisee_id = user_id

    db.session.commit()

    _broadcast_order(order, 'order_updated')
    return jsonify({
        'order': order.to_dict(include_client=True, include_product=True),
        'transition': f'{old_status} → {new_status}',
    })


@orders_bp.route('/<int:order_id>/claim', methods=['POST'])
@jwt_required()
def claim_order(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type != 'production':
        return jsonify({'error': 'Production only'}), 403
    order = Order.query.get(order_id)
    if not order or order.status != 'accepted':
        return jsonify({'error': 'Order not available'}), 400
    if order.seamstress_id and order.seamstress_id != user_id:
        return jsonify({'error': 'Already claimed'}), 409
    order.seamstress_id = user_id
    order.claimed_at = datetime.now(timezone.utc)
    order.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    _broadcast_order(order, 'order_updated')
    return jsonify({'order': order.to_dict(include_client=True, include_product=True)})


@orders_bp.route('/<int:order_id>/unclaim', methods=['POST'])
@jwt_required()
def unclaim_order(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type != 'production':
        return jsonify({'error': 'Production only'}), 403
    order = Order.query.get(order_id)
    if not order or order.seamstress_id != user_id:
        return jsonify({'error': 'Not your order'}), 403
    order.seamstress_id = None
    order.claimed_at = None
    order.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    _broadcast_order(order, 'order_updated')
    return jsonify({'order': order.to_dict(include_client=True, include_product=True)})

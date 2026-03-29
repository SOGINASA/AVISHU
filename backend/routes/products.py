import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Product

ALLOWED_EXT = {'jpg', 'jpeg', 'png', 'webp'}

products_bp = Blueprint('products', __name__)


@products_bp.route('/', methods=['GET'])
def list_products():
    category = request.args.get('category')
    query = Product.query.filter_by(is_active=True)
    if category:
        query = query.filter_by(category=category)
    products = query.order_by(Product.created_at.desc()).all()
    return jsonify({'products': [p.to_dict() for p in products]})


@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.filter_by(id=product_id, is_active=True).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    return jsonify({'product': product.to_dict()})


@products_bp.route('/', methods=['POST'])
@jwt_required()
def create_product():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type not in ('admin', 'franchisee'):
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json()
    if not data or not data.get('name') or not data.get('price'):
        return jsonify({'error': 'name and price required'}), 400

    product = Product(
        name=data['name'],
        description=data.get('description'),
        price=float(data['price']),
        image_url=data.get('imageUrl') or data.get('image_url'),
        category=data.get('category'),
        care_instructions=data.get('careInstructions') or data.get('care_instructions'),
        is_preorder=data.get('isPreorder', False),
        in_stock=data.get('inStock', True),
    )
    sizes = data.get('sizes')
    if sizes and isinstance(sizes, list):
        product.set_sizes(sizes)
    db.session.add(product)
    db.session.commit()
    return jsonify({'product': product.to_dict()}), 201


@products_bp.route('/<int:product_id>', methods=['PATCH'])
@jwt_required()
def update_product(product_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type not in ('admin', 'franchisee'):
        return jsonify({'error': 'Access denied'}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Not found'}), 404
    data = request.get_json() or {}
    if 'name' in data:        product.name = data['name']
    if 'price' in data:       product.price = float(data['price'])
    if 'description' in data: product.description = data['description']
    if 'category' in data:    product.category = data['category']
    if 'sizes' in data:       product.set_sizes(data['sizes'] if isinstance(data['sizes'], list) else [])
    if 'careInstructions' in data or 'care_instructions' in data:
        product.care_instructions = data.get('careInstructions') or data.get('care_instructions')
    if 'isPreorder' in data:  product.is_preorder = data['isPreorder']
    if 'inStock' in data:     product.in_stock = data['inStock']
    db.session.commit()
    return jsonify({'product': product.to_dict()})


@products_bp.route('/<int:product_id>/image', methods=['POST'])
@jwt_required()
def upload_image(product_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type not in ('admin', 'franchisee'):
        return jsonify({'error': 'Access denied'}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Not found'}), 404
    if 'image' not in request.files:
        return jsonify({'error': 'No file'}), 400
    file = request.files['image']
    ext = (file.filename or '').rsplit('.', 1)[-1].lower()
    if ext not in ALLOWED_EXT:
        return jsonify({'error': 'Only jpg, png, webp allowed'}), 400
    upload_dir = os.path.join(current_app.root_path, 'static', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(upload_dir, filename))
    product.image_url = f"/static/uploads/{filename}"
    db.session.commit()
    return jsonify({'product': product.to_dict()})


@products_bp.route('/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type != 'admin':
        return jsonify({'error': 'Admin only'}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Not found'}), 404
    product.is_active = False
    db.session.commit()
    return jsonify({'ok': True})

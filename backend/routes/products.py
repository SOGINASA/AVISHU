from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Product

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
        is_preorder=data.get('isPreorder', False),
        in_stock=data.get('inStock', True),
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({'product': product.to_dict()}), 201


@products_bp.route('/seed', methods=['POST'])
@jwt_required()
def seed_products():
    """Seed demo products for hackathon demo."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type != 'admin':
        return jsonify({'error': 'Admin only'}), 403

    if Product.query.count() > 0:
        return jsonify({'message': 'Already seeded', 'count': Product.query.count()})

    demo = [
        {'name': 'AVISHU COAT NO.1', 'description': 'Строгое пальто из шерсти. Прямой крой, потайные пуговицы.', 'price': 89000, 'category': 'outerwear', 'is_preorder': False, 'in_stock': True},
        {'name': 'AVISHU JACKET SS-24', 'description': 'Структурированный жакет. Плечи с подкладом, минимальная фурнитура.', 'price': 67000, 'category': 'jackets', 'is_preorder': False, 'in_stock': True},
        {'name': 'AVISHU DRESS EDIT', 'description': 'Платье-футляр. Натуральный шёлк, асимметричный воротник.', 'price': 54000, 'category': 'dresses', 'is_preorder': True, 'in_stock': False},
        {'name': 'AVISHU TROUSERS NO.3', 'description': 'Широкие брюки. Высокая посадка, стрелки, боковые карманы.', 'price': 38000, 'category': 'trousers', 'is_preorder': False, 'in_stock': True},
        {'name': 'AVISHU BLOUSE ARCHIVE', 'description': 'Блуза из хлопка. Объёмные рукава, скрытые пуговицы.', 'price': 29000, 'category': 'tops', 'is_preorder': True, 'in_stock': False},
        {'name': 'AVISHU COAT BESPOKE', 'description': 'Пальто на заказ. Индивидуальный крой, 6–8 недель пошива.', 'price': 145000, 'category': 'outerwear', 'is_preorder': True, 'in_stock': False},
    ]

    for item in demo:
        p = Product(**item)
        db.session.add(p)

    db.session.commit()
    return jsonify({'message': 'Seeded', 'count': len(demo)})

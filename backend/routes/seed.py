from flask import Blueprint, jsonify
from models import db, User, Product, Order
from datetime import datetime, timezone, timedelta

seed_bp = Blueprint('seed', __name__)


@seed_bp.route('/demo', methods=['POST'])
def run():
    products = _seed_products()
    users = _seed_users()
    _seed_orders(users, products)
    return jsonify({
        'ok': True,
        'logins': [
            {'email': 'client@avishu.kz', 'password': 'demo1234', 'role': 'client'},
            {'email': 'partner@avishu.kz', 'password': 'demo1234', 'role': 'franchisee'},
            {'email': 'workshop@avishu.kz', 'password': 'demo1234', 'role': 'production'},
        ]
    })


def _seed_products():
    if Product.query.count() > 0:
        return Product.query.all()

    items = [
        Product(name='AVISHU COAT NO.1', description='Строгое пальто из шерсти. Прямой крой, потайные пуговицы.', price=89000, category='outerwear', is_preorder=False, in_stock=True),
        Product(name='AVISHU JACKET SS-24', description='Структурированный жакет. Плечи с подкладом, минимальная фурнитура.', price=67000, category='jackets', is_preorder=False, in_stock=True),
        Product(name='AVISHU DRESS EDIT', description='Платье-футляр. Натуральный шёлк, асимметричный воротник.', price=54000, category='dresses', is_preorder=True, in_stock=False),
        Product(name='AVISHU TROUSERS NO.3', description='Широкие брюки. Высокая посадка, стрелки, боковые карманы.', price=38000, category='trousers', is_preorder=False, in_stock=True),
        Product(name='AVISHU BLOUSE ARCHIVE', description='Блуза из хлопка. Объёмные рукава, скрытые пуговицы.', price=29000, category='tops', is_preorder=True, in_stock=False),
        Product(name='AVISHU COAT BESPOKE', description='Пальто на заказ. Индивидуальный крой, 6–8 недель пошива.', price=145000, category='outerwear', is_preorder=True, in_stock=False),
    ]
    for p in items:
        db.session.add(p)
    db.session.flush()
    return items


def _seed_users():
    result = {}

    specs = [
        ('client@avishu.kz', 'Алина Соколова', 'client'),
        ('partner@avishu.kz', 'Марат Джаксыбеков', 'franchisee'),
        ('workshop@avishu.kz', 'Гүлнар Бекова', 'production'),
    ]

    for email, name, role in specs:
        u = User.query.filter_by(email=email).first()
        if not u:
            u = User(
                email=email,
                full_name=name,
                user_type=role,
                is_active=True,
                is_verified=True,
                last_login=datetime.now(timezone.utc),
            )
            u.set_password('demo1234')
            db.session.add(u)
        result[role] = u

    db.session.flush()
    return result


def _seed_orders(users, products):
    client = users.get('client')
    if not client or Order.query.filter_by(client_id=client.id).count() > 0:
        return

    now = datetime.now(timezone.utc)

    rows = [
        Order(client_id=client.id, product_id=products[0].id, status='sewing', quantity=1, total_price=products[0].price, created_at=now - timedelta(days=2)),
        Order(client_id=client.id, product_id=products[1].id, status='ready', quantity=1, total_price=products[1].price, created_at=now - timedelta(days=5)),
        Order(client_id=client.id, product_id=products[3].id, status='placed', quantity=2, total_price=products[3].price * 2, created_at=now - timedelta(hours=3)),
        Order(client_id=client.id, product_id=products[2].id, status='delivered', quantity=1, total_price=products[2].price, created_at=now - timedelta(days=14)),
    ]

    for o in rows:
        db.session.add(o)

    db.session.commit()

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db, User, Product, Order
from datetime import datetime, timezone, timedelta

app = create_app()

with app.app_context():
    print('Seeding products...')
    if Product.query.count() == 0:
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
        print(f'  Created {len(items)} products')
    else:
        items = Product.query.all()
        print(f'  Already have {len(items)} products')

    print('Seeding users...')
    specs = [
        ('client@avishu.kz', 'Алина Соколова', 'client'),
        ('partner@avishu.kz', 'Марат Джаксыбеков', 'franchisee'),
        ('workshop@avishu.kz', 'Гүлнар Бекова', 'production'),
    ]
    users = {}
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
            print(f'  Created {role}: {email}')
        else:
            print(f'  Already exists: {email}')
        users[role] = u

    db.session.flush()

    print('Seeding orders...')
    client = users['client']
    if Order.query.filter_by(client_id=client.id).count() == 0:
        now = datetime.now(timezone.utc)
        rows = [
            Order(client_id=client.id, product_id=items[0].id, status='placed',    quantity=1, total_price=items[0].price, created_at=now - timedelta(hours=1)),
            Order(client_id=client.id, product_id=items[1].id, status='accepted',  quantity=1, total_price=items[1].price, created_at=now - timedelta(hours=3)),
            Order(client_id=client.id, product_id=items[3].id, status='sewing',    quantity=2, total_price=items[3].price * 2, created_at=now - timedelta(days=1)),
            Order(client_id=client.id, product_id=items[2].id, status='ready',     quantity=1, total_price=items[2].price, created_at=now - timedelta(days=3)),
            Order(client_id=client.id, product_id=items[4].id, status='delivered', quantity=1, total_price=items[4].price, created_at=now - timedelta(days=7)),
        ]
        for o in rows:
            db.session.add(o)
        print(f'  Created {len(rows)} orders')
    else:
        print('  Orders already exist, skipping')

    db.session.commit()
    print()
    print('Done. Login credentials:')
    print('  client@avishu.kz   / demo1234  (client)')
    print('  partner@avishu.kz  / demo1234  (franchisee)')
    print('  workshop@avishu.kz / demo1234  (production)')

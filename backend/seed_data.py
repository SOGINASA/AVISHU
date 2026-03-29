"""
Seed script — creates synthetic test data on first run.
Run from the backend directory:  python seed_data.py

Safe to re-run: checks for existing data before inserting anything.
"""

from datetime import datetime, timezone, timedelta
import random

from models import (
    db, User, Product, Order, CustomOrder,
    Feedback, Notification, NotificationPreference,
)

# ── sentinel: skip if already seeded ─────────────────────────────────────────
SEED_MARKER_EMAIL = "client@avishu.kz"


def already_seeded():
    return User.query.filter_by(email=SEED_MARKER_EMAIL).first() is not None


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def ago(**kw):
    return datetime.now(timezone.utc) - timedelta(**kw)


def make_user(email, nickname, full_name, role, password="test1234"):
    u = User(
        email=email,
        nickname=nickname,
        full_name=full_name,
        user_type=role,
        is_active=True,
        is_verified=True,
        onboarding_completed=True,
        created_at=ago(days=random.randint(10, 60)),
        last_login=ago(hours=random.randint(1, 72)),
    )
    u.set_password(password)
    return u


# ─────────────────────────────────────────────────────────────────────────────
# Data definitions
# ─────────────────────────────────────────────────────────────────────────────

USERS = [
    # clients
    ("client@avishu.kz",      "client",       "Алина Смирнова",    "client",      "demo1234"),
    ("seed_client_2@test.com", "client2",      "Михаил Орлов",      "client",      "test1234"),
    ("seed_client_3@test.com", "client3",      "Екатерина Белова",  "client",      "test1234"),
    # franchisees / managers
    ("partner@avishu.kz",      "franchisee",   "Ирина Козлова",     "franchisee",  "demo1234"),
    ("seed_franchisee_2@test.com", "franchisee2", "Дмитрий Лебедев", "franchisee", "test1234"),
    # production / seamstresses
    ("workshop@avishu.kz",     "workshop",     "Наталья Петрова",   "production",  "demo1234"),
    ("seed_prod_2@test.com",   "seamstress2",  "Ольга Соколова",    "production",  "test1234"),
]

# (name, description, price, category, preorder, in_stock, image_file, sizes, care_instructions)
PRODUCTS = [
    (
        "Юбка ALL.INN Black",
        "Элегантная юбка-миди прямого кроя из плотного крепа. "
        "Высокая посадка подчёркивает талию, потайная молния сзади. "
        "Идеально сочетается с блузками и топами для делового или вечернего образа.",
        4200.0, "Юбки", False, True,
        "ALL.INN_skirt-bl1-1536x2048.webp",
        ["XS", "S", "M", "L", "XL"],
        "Ручная стирка при 30°C. Не отбеливать. Гладить при низкой температуре с изнаночной стороны. Не сушить в барабане."
    ),
    (
        "Футболка ALL.INN Taupe",
        "Базовая футболка оверсайз из мягкого хлопка с добавлением эластана. "
        "Приглушённый бежево-серый оттенок taupe. Усиленные швы, "
        "удлинённая спинка. Подходит для повседневных образов и многослойных комбинаций.",
        2900.0, "Футболки", False, True,
        "ALL.INN_t-shirt-taup2-1536x2048.webp",
        ["XS", "S", "M", "L", "XL", "XXL"],
        "Машинная стирка при 30°C. Не отбеливать. Сушить в расправленном виде. Гладить при средней температуре."
    ),
    (
        "Рубашка ALL.INN White",
        "Классическая белая рубашка свободного кроя из премиального хлопка поплин. "
        "Удлинённая линия плеча, скрытая планка с пуговицами. "
        "Универсальная вещь — носите навыпуск с джинсами или заправьте в юбку.",
        5800.0, "Рубашки", False, True,
        "ALLINN_wh3-1536x2048.webp",
        ["XS", "S", "M", "L"],
        "Машинная стирка при 40°C. Допускается отбеливание без хлора. Гладить при высокой температуре. Химчистка разрешена."
    ),
    (
        "Платье ALTER Blue",
        "Воздушное платье А-силуэта из струящегося шифона глубокого синего цвета. "
        "V-образный вырез, длинные рукава с манжетами на пуговицах, подкладка из вискозы. "
        "Длина миди, пояс в комплекте.",
        7500.0, "Платья", False, True,
        "alter_bl4-1536x2048.webp",
        ["XS", "S", "M", "L", "XL"],
        "Деликатная стирка при 30°C. Не отжимать. Сушить на плечиках. Гладить через влажную ткань при низкой температуре."
    ),
    (
        "Топ AVI White",
        "Минималистичный топ из плотного трикотажа с круглым вырезом. "
        "Укороченная длина, чистые линии кроя. "
        "Прекрасно работает как самостоятельная вещь или слой под пиджак.",
        3400.0, "Топы", False, True,
        "avi_wh2-1536x2048.webp",
        ["XS", "S", "M", "L"],
        "Ручная стирка при 30°C. Не отбеливать. Сушить в горизонтальном положении. Не гладить."
    ),
    (
        "Платье BRIGHT Fuchsia",
        "Яркое платье-футляр из эластичной ткани насыщенного оттенка фуксии. "
        "Приталенный крой, длина до колена, молния на спинке. "
        "Идеально для вечернего выхода или особого события.",
        8200.0, "Платья", False, True,
        "BRIGHT_madg5-1536x2048.webp",
        ["S", "M", "L", "XL"],
        "Ручная стирка при 30°C. Не отбеливать. Гладить при низкой температуре с изнанки. Рекомендуется химчистка."
    ),
    (
        "Худи BRNX Grey",
        "Объёмное худи из плотного футера трёхнитки с начёсом. "
        "Капюшон на кулиске, карман-кенгуру, рубчик на манжетах и подоле. "
        "Универсальный серый меланж на каждый день.",
        5500.0, "Худи", False, True,
        "BRNX_grey1.webp",
        ["S", "M", "L", "XL", "XXL"],
        "Машинная стирка при 40°C, вывернув наизнанку. Не отбеливать. Сушить в барабане при низкой температуре. Не гладить принт."
    ),
    (
        "Пальто AVISHU Oversize",
        "Пальто свободного кроя из смесовой шерсти. "
        "Двубортная застёжка, широкие лацканы, прорезные карманы. "
        "Длина ниже колена. Подходит для межсезонья и мягкой зимы.",
        18500.0, "Пальто", False, True,
        "IMG_0335-1-1536x2048.webp",
        ["XS", "S", "M", "L"],
        "Только сухая химчистка. Хранить на широких плечиках. Не стирать, не отбеливать. Пропаривать для удаления складок."
    ),
    (
        "Костюм LOOM Grey",
        "Брючный костюм из костюмной ткани с добавлением шерсти. "
        "Пиджак прямого кроя с одной пуговицей, брюки со стрелками, "
        "высокая посадка. Элегантный серый оттенок для офиса и мероприятий.",
        14900.0, "Костюмы", True, False,
        "LOOM_grey1-1536x2048.webp",
        ["XS", "S", "M", "L", "XL"],
        "Только сухая химчистка. Гладить через проутюжильник. Хранить на плечиках в чехле. Не стирать."
    ),
    (
        "Платье SKIN Coffee",
        "Трикотажное платье-водолазка длины макси. "
        "Глубокий кофейный оттенок, мягкая текстура, облегающий силуэт с разрезом сбоку. "
        "Пошив по индивидуальным меркам.",
        9800.0, "Платья", True, False,
        "SKIN-cofee_1-1536x2048.webp",
        ["XS", "S", "M", "L"],
        "Ручная стирка при 30°C. Не отжимать, не выкручивать. Сушить в горизонтальном положении. Гладить при низкой температуре."
    ),
]

# (title, description, status, price_or_None)
CUSTOM_ORDERS = [
    ("Платье для выпускного",         "Нежно-голубое платье в пол, корсетный верх, пышная юбка", "pending_review",  None),
    ("Брючный костюм на работу",      "Строгий брючный костюм, серый меланж, размер 46",         "pending_payment", 8500.0),
    ("Пошив детского костюма",        "Костюм зайчика для новогоднего утренника",                "placed",          3200.0),
    ("Ремонт свадебного платья",      "Ушить платье в талии на 3 см, подшить подол",             "accepted",        1500.0),
    ("Пальто по меркам",              "Двубортное пальто из кашемира, бежевый, размер 44",       "sewing",          14000.0),
    ("Вечернее платье на юбилей",     "Изумрудное платье с пайетками, длина миди",               "ready",           7200.0),
    ("Школьная форма на троих детей", "Три комплекта школьной формы (блуза + юбка/брюки)",       "delivered",       9600.0),
]


def seed_orders(clients, franchisees, seamstresses, products):
    """Create regular orders spread across all statuses."""
    statuses = ["placed", "accepted", "sewing", "ready", "delivered"]
    orders = []
    for i, client in enumerate(clients):
        for j, product in enumerate(random.sample(products, k=min(3, len(products)))):
            if product.is_preorder and not product.in_stock:
                continue
            qty = random.randint(1, 3)
            status = statuses[(i + j) % len(statuses)]
            franchisee = franchisees[(i + j) % len(franchisees)]
            seamstress = None
            claimed_at = None
            if status in ("sewing", "ready", "delivered"):
                seamstress = seamstresses[j % len(seamstresses)]
                claimed_at = ago(days=random.randint(1, 5))
            o = Order(
                client_id=client.id,
                franchisee_id=franchisee.id,
                product_id=product.id,
                seamstress_id=seamstress.id if seamstress else None,
                status=status,
                quantity=qty,
                total_price=round(product.price * qty, 2),
                notes="Тестовый заказ" if random.random() < 0.4 else None,
                created_at=ago(days=random.randint(1, 30)),
                claimed_at=claimed_at,
            )
            orders.append(o)
    return orders


def seed_custom_orders(clients, franchisees, seamstresses):
    result = []
    for idx, (title, desc, status, price) in enumerate(CUSTOM_ORDERS):
        client = clients[idx % len(clients)]
        manager = franchisees[idx % len(franchisees)]
        seamstress = None
        claimed_at = None
        if status in ("sewing", "ready", "delivered"):
            seamstress = seamstresses[idx % len(seamstresses)]
            claimed_at = ago(days=random.randint(1, 7))
        co = CustomOrder(
            client_id=client.id,
            manager_id=manager.id if status != "pending_review" else None,
            seamstress_id=seamstress.id if seamstress else None,
            title=title,
            description=desc,
            status=status,
            price=price,
            claimed_at=claimed_at,
            created_at=ago(days=random.randint(1, 25)),
        )
        result.append(co)
    return result


def seed_feedback(users):
    entries = [
        ("bug",         4, "Кнопка «Оформить заказ» иногда не реагирует на нажатие на мобильном"),
        ("feature",     5, "Добавьте фильтр по категориям в каталог, было бы очень удобно"),
        ("improvement", 3, "Время загрузки страницы заказов немного великовато"),
        ("other",       5, "Всё отлично, очень нравится интерфейс!"),
        ("bug",         2, "После обновления страницы теряется содержимое корзины"),
        ("feature",     4, "Хотелось бы видеть историю статусов по каждому заказу"),
        ("improvement", 4, "Добавьте возможность прикрепить несколько фото к нестандартному заказу"),
    ]
    result = []
    for i, (cat, rating, msg) in enumerate(entries):
        f = Feedback(
            user_id=users[i % len(users)].id,
            category=cat,
            rating=rating,
            message=msg,
            is_read=(i % 3 == 0),
            created_at=ago(days=random.randint(1, 20)),
        )
        result.append(f)
    return result


def seed_notifications(all_users, orders, custom_orders):
    notifs = []
    templates = [
        ("system",   "Добро пожаловать!",               "Аккаунт успешно создан. Начните знакомство с каталогом."),
        ("update",   "Статус заказа изменён",            "Ваш заказ перешёл на следующий этап обработки."),
        ("alert",    "Заказ готов к получению",          "Ваш заказ готов! Свяжитесь с менеджером для уточнения деталей."),
        ("reminder", "Подтвердите email",                "Для полного доступа подтвердите адрес электронной почты."),
        ("security", "Новый вход в аккаунт",             "Выполнен вход с нового устройства. Если это не вы — смените пароль."),
        ("update",   "Новый заказ ожидает обработки",    "Поступил новый нестандартный заказ от клиента."),
        ("system",   "Обновление платформы",             "Система обновлена до версии 1.2. Смотрите список изменений."),
    ]
    for i, user in enumerate(all_users):
        for j in range(random.randint(1, 3)):
            cat, title, body = templates[(i + j) % len(templates)]
            n = Notification(
                user_id=user.id,
                title=title,
                body=body,
                category=cat,
                is_read=(j == 0),
                created_at=ago(hours=random.randint(1, 240)),
            )
            notifs.append(n)
    return notifs


def seed_prefs(all_users):
    return [
        NotificationPreference(
            user_id=u.id,
            system_notifications=True,
            security_alerts=True,
            marketing_notifications=(u.user_type == "client"),
            push_enabled=False,
            timezone="Europe/Moscow",
        )
        for u in all_users
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def run():
    if already_seeded():
        print("[seed] Data already exists — skipping.")
        return

    print("[seed] Inserting test data …")

    # ── users ──────────────────────────────────────────────────────────
    user_objs = []
    for email, nick, name, role, password in USERS:
        u = make_user(email, nick, name, role, password)
        db.session.add(u)
        user_objs.append(u)
    db.session.flush()  # get IDs

    clients      = [u for u in user_objs if u.user_type == "client"]
    franchisees  = [u for u in user_objs if u.user_type == "franchisee"]
    seamstresses = [u for u in user_objs if u.user_type == "production"]

    # ── products ───────────────────────────────────────────────────────
    product_objs = []
    for name, desc, price, cat, preorder, in_stock, img, sizes, care in PRODUCTS:
        p = Product(
            name=name,
            description=desc,
            price=price,
            category=cat,
            is_preorder=preorder,
            in_stock=in_stock,
            is_active=True,
            image_url=f"/static/uploads/{img}",
            care_instructions=care,
            created_at=ago(days=random.randint(30, 90)),
        )
        p.set_sizes(sizes)
        db.session.add(p)
        product_objs.append(p)
    db.session.flush()

    # ── orders ─────────────────────────────────────────────────────────
    for o in seed_orders(clients, franchisees, seamstresses, product_objs):
        db.session.add(o)

    # ── custom orders ──────────────────────────────────────────────────
    for co in seed_custom_orders(clients, franchisees, seamstresses):
        db.session.add(co)
    db.session.flush()

    # ── feedback ───────────────────────────────────────────────────────
    for f in seed_feedback(clients + franchisees):
        db.session.add(f)

    # ── notifications ──────────────────────────────────────────────────
    all_users = user_objs
    for n in seed_notifications(all_users, [], []):
        db.session.add(n)

    # ── notification prefs ─────────────────────────────────────────────
    for pref in seed_prefs(all_users):
        db.session.add(pref)

    db.session.commit()

    print("[seed] Done. Accounts created:")
    print()
    role_map = {"client": [], "franchisee": [], "production": []}
    pwd_map = {email: pwd for email, _, _, _, pwd in USERS}
    for u in user_objs:
        role_map.get(u.user_type, []).append(u.email)
    for role, emails in role_map.items():
        for e in emails:
            print(f"  [{role:12s}]  {e}  /  {pwd_map[e]}")
    print()
    print(f"  [admin      ]  (configured in .env)")
    print()
    print(f"  Products  : {len(product_objs)}")
    print(f"  Orders    : {Order.query.count()}")
    print(f"  Custom    : {CustomOrder.query.count()}")
    print(f"  Feedback  : {Feedback.query.count()}")


if __name__ == "__main__":
    import sys
    import os
    sys.path.insert(0, os.path.dirname(__file__))
    from app import create_app
    _app = create_app()
    with _app.app_context():
        run()

"""
Аналитика для франчайзи: доход, история продаж, ML-прогноз дефицита.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone, timedelta
from sqlalchemy import func, extract, case
from models import db, User, Order, Product, CustomOrder

analytics_bp = Blueprint('analytics', __name__)


def _franchisee_or_admin(fn):
    """Декоратор: только franchisee или admin."""
    from functools import wraps
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type not in ('franchisee', 'admin'):
            return jsonify({'error': 'Access denied'}), 403
        kwargs['current_user'] = user
        return fn(*args, **kwargs)
    return wrapper


# ─── Сводка по доходам ───────────────────────────────────────────────────────

@analytics_bp.route('/revenue', methods=['GET'])
@_franchisee_or_admin
def revenue_summary(current_user):
    """
    Доход за текущий месяц, прошлый месяц, и помесячная история.
    ?months=6  — глубина истории (по умолч. 6)
    """
    months_back = request.args.get('months', 6, type=int)
    now = datetime.now(timezone.utc)

    # Базовый запрос: заказы этого франчайзи (или все для admin)
    def base_q():
        q = Order.query
        if current_user.user_type == 'franchisee':
            q = q.filter_by(franchisee_id=current_user.id)
        return q.filter(Order.status.notin_(['placed']))

    def custom_base_q():
        q = CustomOrder.query
        if current_user.user_type == 'franchisee':
            q = q.filter_by(manager_id=current_user.id)
        return q.filter(CustomOrder.status.notin_(['pending_review', 'pending_payment', 'placed']))

    # Текущий месяц
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current_month_orders = base_q().filter(Order.created_at >= month_start).all()
    current_month_custom = custom_base_q().filter(CustomOrder.created_at >= month_start).all()

    current_revenue = sum(o.total_price for o in current_month_orders) + \
                      sum(o.price or 0 for o in current_month_custom)
    current_count = len(current_month_orders) + len(current_month_custom)

    # Прошлый месяц
    prev_month_end = month_start - timedelta(seconds=1)
    prev_month_start = prev_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_orders = base_q().filter(
        Order.created_at >= prev_month_start,
        Order.created_at < month_start,
    ).all()
    prev_custom = custom_base_q().filter(
        CustomOrder.created_at >= prev_month_start,
        CustomOrder.created_at < month_start,
    ).all()
    prev_revenue = sum(o.total_price for o in prev_orders) + \
                   sum(o.price or 0 for o in prev_custom)

    # Рост
    if prev_revenue > 0:
        growth_pct = round(((current_revenue - prev_revenue) / prev_revenue) * 100, 1)
    else:
        growth_pct = 100.0 if current_revenue > 0 else 0.0

    # Помесячная история
    monthly = []
    for i in range(months_back - 1, -1, -1):
        m_start = (now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            m_end = (now - timedelta(days=30 * (i - 1))).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            m_end = now

        m_orders = base_q().filter(Order.created_at >= m_start, Order.created_at < m_end).all()
        m_custom = custom_base_q().filter(CustomOrder.created_at >= m_start, CustomOrder.created_at < m_end).all()
        rev = sum(o.total_price for o in m_orders) + sum(o.price or 0 for o in m_custom)
        cnt = len(m_orders) + len(m_custom)

        monthly.append({
            'month': m_start.strftime('%Y-%m'),
            'label': m_start.strftime('%b %Y'),
            'revenue': round(rev, 0),
            'orders': cnt,
        })

    return jsonify({
        'currentMonth': {
            'revenue': round(current_revenue, 0),
            'orders': current_count,
            'period': month_start.strftime('%Y-%m'),
        },
        'previousMonth': {
            'revenue': round(prev_revenue, 0),
        },
        'growthPct': growth_pct,
        'monthly': monthly,
    })


# ─── История продаж по товарам ──────────────────────────────────────────────

@analytics_bp.route('/sales-history', methods=['GET'])
@_franchisee_or_admin
def sales_history(current_user):
    """
    Топ товаров по продажам.
    ?days=30    — период (по умолч. 30)
    ?limit=20   — количество (по умолч. 20)
    """
    days = request.args.get('days', 30, type=int)
    limit = request.args.get('limit', 20, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    q = db.session.query(
        Product.id,
        Product.name,
        Product.category,
        Product.price,
        func.sum(Order.quantity).label('total_sold'),
        func.sum(Order.total_price).label('total_revenue'),
        func.count(Order.id).label('order_count'),
    ).join(Order, Order.product_id == Product.id)

    if current_user.user_type == 'franchisee':
        q = q.filter(Order.franchisee_id == current_user.id)

    q = q.filter(Order.created_at >= since) \
         .filter(Order.status != 'placed') \
         .group_by(Product.id, Product.name, Product.category, Product.price) \
         .order_by(func.sum(Order.quantity).desc()) \
         .limit(limit)

    rows = q.all()
    items = []
    for r in rows:
        items.append({
            'productId': r.id,
            'productName': r.name,
            'category': r.category,
            'price': r.price,
            'totalSold': int(r.total_sold or 0),
            'totalRevenue': round(float(r.total_revenue or 0), 0),
            'orderCount': int(r.order_count or 0),
        })

    return jsonify({'salesHistory': items, 'days': days})


# ─── Ежедневные продажи (для графика) ───────────────────────────────────────

@analytics_bp.route('/daily-sales', methods=['GET'])
@_franchisee_or_admin
def daily_sales(current_user):
    """
    Ежедневный доход и количество заказов.
    ?days=30  — период
    """
    days = request.args.get('days', 30, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    q = db.session.query(
        func.date(Order.created_at).label('day'),
        func.sum(Order.total_price).label('revenue'),
        func.count(Order.id).label('count'),
    )

    if current_user.user_type == 'franchisee':
        q = q.filter(Order.franchisee_id == current_user.id)

    q = q.filter(Order.created_at >= since) \
         .filter(Order.status != 'placed') \
         .group_by(func.date(Order.created_at)) \
         .order_by(func.date(Order.created_at))

    rows = q.all()
    data = []
    for r in rows:
        data.append({
            'date': str(r.day),
            'revenue': round(float(r.revenue or 0), 0),
            'orders': int(r.count or 0),
        })

    return jsonify({'dailySales': data, 'days': days})


# ─── По категориям ──────────────────────────────────────────────────────────

@analytics_bp.route('/by-category', methods=['GET'])
@_franchisee_or_admin
def by_category(current_user):
    """Продажи по категориям за период."""
    days = request.args.get('days', 30, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    q = db.session.query(
        Product.category,
        func.sum(Order.quantity).label('total_sold'),
        func.sum(Order.total_price).label('total_revenue'),
    ).join(Order, Order.product_id == Product.id)

    if current_user.user_type == 'franchisee':
        q = q.filter(Order.franchisee_id == current_user.id)

    q = q.filter(Order.created_at >= since) \
         .filter(Order.status != 'placed') \
         .group_by(Product.category) \
         .order_by(func.sum(Order.total_price).desc())

    rows = q.all()
    items = []
    for r in rows:
        items.append({
            'category': r.category or 'Без категории',
            'totalSold': int(r.total_sold or 0),
            'totalRevenue': round(float(r.total_revenue or 0), 0),
        })

    return jsonify({'categories': items, 'days': days})


# ─── ML-прогноз дефицита ────────────────────────────────────────────────────

@analytics_bp.route('/demand-forecast', methods=['GET'])
@_franchisee_or_admin
def demand_forecast(current_user):
    """
    Используем реальные данные заказов для ML-предсказания.
    Собираем историю продаж из БД и прогоним через модель.
    """
    import sys
    import os
    from pathlib import Path

    days_ahead = request.args.get('days', 7, type=int)
    history_days = request.args.get('history', 30, type=int)

    ml_dir = Path(__file__).resolve().parent.parent.parent / 'ml'
    sys.path.insert(0, str(ml_dir))

    try:
        from model import predict_single_product, load_model
        load_model()  # проверяем наличие
    except (ImportError, FileNotFoundError):
        return jsonify({
            'error': 'ML-модель не обучена. Запустите: cd ml && python model.py train',
            'forecast': [],
            'summary': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'total': 0},
        }), 200

    since = datetime.now(timezone.utc) - timedelta(days=history_days)

    # Собираем дневные продажи по товарам из БД
    products = Product.query.filter_by(is_active=True).all()

    results = []
    for product in products:
        q = db.session.query(
            func.date(Order.created_at).label('day'),
            func.coalesce(func.sum(Order.quantity), 0).label('qty'),
        ).filter(
            Order.product_id == product.id,
            Order.created_at >= since,
            Order.status != 'placed',
        )

        if current_user.user_type == 'franchisee':
            q = q.filter(Order.franchisee_id == current_user.id)

        q = q.group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at))
        daily = q.all()

        if len(daily) < 3:
            continue

        sales_history = [int(d.qty) for d in daily]

        # Текущий остаток — оценка (сумма заказов в работе)
        in_pipeline = db.session.query(
            func.coalesce(func.sum(Order.quantity), 0)
        ).filter(
            Order.product_id == product.id,
            Order.status.in_(['placed', 'accepted', 'sewing']),
        ).scalar()
        # Простая эвристика: 50 - в работе (можно заменить на реальный stock)
        current_stock = max(0, 50 - int(in_pipeline or 0))

        try:
            pred = predict_single_product(
                product_name=product.name,
                category=product.category or 'Другое',
                price=product.price,
                current_stock=current_stock,
                sales_history=sales_history,
                days_ahead=days_ahead,
            )
            results.append(pred)
        except Exception:
            continue

    # Сортировка по срочности
    urgency_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    results.sort(key=lambda r: (urgency_order.get(r['urgency'], 4), r['days_until_stockout']))

    summary = {
        'critical': sum(1 for r in results if r['urgency'] == 'critical'),
        'high': sum(1 for r in results if r['urgency'] == 'high'),
        'medium': sum(1 for r in results if r['urgency'] == 'medium'),
        'low': sum(1 for r in results if r['urgency'] == 'low'),
        'total': len(results),
    }

    return jsonify({
        'forecast': results,
        'summary': summary,
        'daysAhead': days_ahead,
    })

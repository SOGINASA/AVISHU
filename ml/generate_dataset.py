"""
Генератор синтетического датасета продаж для обучения модели предсказания спроса.

Создаёт CSV с историей ежедневных продаж для набора товаров за последние N дней.
Каждая строка — одна дата + один товар.

Колонки:
  product_id, product_name, category, price, date,
  quantity_sold, stock_remaining, day_of_week, is_weekend,
  month, week_of_year

Использование:
  python generate_dataset.py                     # по умолчанию 50 товаров, 180 дней
  python generate_dataset.py --products 100 --days 365 --out sales.csv
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

# ─── Имитация каталога Avishu ───────────────────────────────────────────────

CATEGORIES = ["Платья", "Блузки", "Юбки", "Брюки", "Жакеты", "Пальто", "Костюмы", "Аксессуары"]

PRODUCT_TEMPLATES = [
    ("Платье летнее «{v}»",        "Платья",      2500, 3500),
    ("Платье вечернее «{v}»",      "Платья",      5500, 8000),
    ("Блузка «{v}»",               "Блузки",      1500, 2500),
    ("Юбка-карандаш «{v}»",        "Юбки",        1800, 2800),
    ("Юбка плиссированная «{v}»",  "Юбки",        2200, 3200),
    ("Брюки классические «{v}»",   "Брюки",       2500, 3800),
    ("Жакет «{v}»",                "Жакеты",      3800, 5500),
    ("Пальто «{v}»",               "Пальто",      6500, 9500),
    ("Костюм «{v}»",               "Костюмы",     8000, 18000),
    ("Палантин «{v}»",             "Аксессуары",  800,  2000),
]

VARIANTS = [
    "Лаванда", "Силуэт", "Офис", "Деловая", "Волна",
    "Строгость", "Бизнес", "Весна", "Лето", "Элегант",
    "Роза", "Нежность", "Грация", "Стиль", "Шарм",
    "Классика", "Модерн", "Винтаж", "Бохо", "Минимал",
]


def _generate_product_catalog(n_products: int) -> pd.DataFrame:
    """Создаёт каталог из n_products уникальных товаров."""
    products = []
    used_names = set()
    for i in range(1, n_products + 1):
        tmpl = random.choice(PRODUCT_TEMPLATES)
        variant = random.choice(VARIANTS)
        name = tmpl[0].format(v=variant)
        # гарантируем уникальность
        while name in used_names:
            variant = random.choice(VARIANTS) + f" {i}"
            name = tmpl[0].format(v=variant)
        used_names.add(name)
        price = round(random.uniform(tmpl[2], tmpl[3]), 0)
        products.append({
            "product_id": i,
            "product_name": name,
            "category": tmpl[1],
            "price": price,
        })
    return pd.DataFrame(products)


def _seasonal_multiplier(date: datetime, category: str) -> float:
    """Сезонный коэффициент спроса: зима → пальто, лето → платья и т.д."""
    month = date.month
    if category in ("Пальто", "Жакеты"):
        if month in (10, 11, 12, 1, 2):
            return random.uniform(1.4, 2.0)
        return random.uniform(0.3, 0.7)
    if category in ("Платья", "Блузки"):
        if month in (5, 6, 7, 8):
            return random.uniform(1.3, 1.8)
        return random.uniform(0.5, 0.9)
    return random.uniform(0.8, 1.2)


def _trend_component(day_index: int, total_days: int) -> float:
    """Лёгкий линейный тренд роста."""
    return 1.0 + 0.3 * (day_index / total_days)


def generate_sales_data(
    n_products: int = 50,
    n_days: int = 180,
    end_date: datetime | None = None,
    initial_stock_range: tuple[int, int] = (30, 150),
) -> pd.DataFrame:
    """
    Генерирует датасет ежедневных продаж.

    Returns:
        DataFrame с колонками, готовыми для обучения модели.
    """
    if end_date is None:
        end_date = datetime.now()

    catalog = _generate_product_catalog(n_products)
    start_date = end_date - timedelta(days=n_days - 1)

    rows = []
    for _, product in catalog.iterrows():
        stock = random.randint(*initial_stock_range)
        base_demand = random.uniform(1.0, 6.0)  # средний спрос в день

        for day_idx in range(n_days):
            date = start_date + timedelta(days=day_idx)
            dow = date.weekday()
            is_weekend = int(dow >= 5)

            # выходные немного повышают спрос
            weekend_mult = 1.3 if is_weekend else 1.0

            seasonal = _seasonal_multiplier(date, product["category"])
            trend = _trend_component(day_idx, n_days)

            # Пуассоновское распределение для реалистичной вариативности
            lam = max(0.1, base_demand * seasonal * trend * weekend_mult)
            qty_sold = int(np.random.poisson(lam))

            # Если на складе 0 — продаж нет (дефицит → сигнал для модели)
            qty_sold = min(qty_sold, stock)
            stock = max(0, stock - qty_sold)

            # Периодическое пополнение склада (раз в ~10 дней случайно)
            if random.random() < 0.1 and stock < 20:
                restock = random.randint(20, 80)
                stock += restock

            rows.append({
                "product_id": product["product_id"],
                "product_name": product["product_name"],
                "category": product["category"],
                "price": product["price"],
                "date": date.strftime("%Y-%m-%d"),
                "quantity_sold": qty_sold,
                "stock_remaining": stock,
                "day_of_week": dow,
                "is_weekend": is_weekend,
                "month": date.month,
                "week_of_year": date.isocalendar()[1],
            })

    df = pd.DataFrame(rows)
    return df


# ─── CLI ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Генератор датасета продаж для ML-модели Avishu")
    parser.add_argument("--products", type=int, default=50, help="Количество товаров (по умолч. 50)")
    parser.add_argument("--days", type=int, default=180, help="Глубина истории в днях (по умолч. 180)")
    parser.add_argument("--out", type=str, default="data/sales_history.csv", help="Путь для сохранения CSV")
    parser.add_argument("--seed", type=int, default=42, help="Random seed для воспроизводимости")
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    print(f"Генерация: {args.products} товаров × {args.days} дней …")
    df = generate_sales_data(n_products=args.products, n_days=args.days)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)

    print(f"Готово! {len(df)} строк → {out_path}")
    print(f"Товаров: {df['product_id'].nunique()}, дней: {df['date'].nunique()}")
    print(f"\nПример:\n{df.head(10).to_string(index=False)}")


if __name__ == "__main__":
    main()

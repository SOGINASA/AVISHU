"""
Модель предсказания спроса и определения дефицита товаров.

Функционал:
  1. Обучение модели (Gradient Boosting) на историческом датасете продаж
  2. Предсказание дневного спроса на 7 дней вперёд для каждого товара
  3. Определение товаров, которые закончатся в течение недели
  4. Ранжирование по срочности дозаказа

Использование:
  python model.py train                    # обучить модель
  python model.py train --data path.csv    # обучить на своём CSV
  python model.py predict                  # предсказать на 7 дней вперёд
  python model.py predict --top 20         # показать топ-20 позиций
"""

import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit

# ─── Пути по умолчанию ──────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
DEFAULT_CSV = DATA_DIR / "sales_history.csv"
MODEL_PATH = MODEL_DIR / "demand_model.joblib"
META_PATH = MODEL_DIR / "model_meta.json"


# ─── Фичи (Feature Engineering) ─────────────────────────────────────────────

FEATURE_COLS = [
    "price",
    "day_of_week",
    "is_weekend",
    "month",
    "week_of_year",
    "stock_remaining",
    # скользящие средние
    "sales_ma_3",
    "sales_ma_7",
    "sales_ma_14",
    # статистика скользящих окон
    "sales_std_7",
    "sales_max_7",
    "sales_min_7",
    # тренд
    "sales_trend_7",
    # категориальный код
    "category_code",
]

TARGET_COL = "quantity_sold"


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Добавляет признаки для каждого товара на основе истории продаж.
    Принимает DataFrame с колонками как в generate_dataset.py.
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["product_id", "date"]).reset_index(drop=True)

    # Категориальный код
    if "category" in df.columns:
        df["category_code"] = df["category"].astype("category").cat.codes
    else:
        df["category_code"] = 0

    # Скользящие признаки по каждому товару
    grouped = df.groupby("product_id")["quantity_sold"]

    df["sales_ma_3"] = grouped.transform(lambda x: x.rolling(3, min_periods=1).mean())
    df["sales_ma_7"] = grouped.transform(lambda x: x.rolling(7, min_periods=1).mean())
    df["sales_ma_14"] = grouped.transform(lambda x: x.rolling(14, min_periods=1).mean())

    df["sales_std_7"] = grouped.transform(lambda x: x.rolling(7, min_periods=1).std().fillna(0))
    df["sales_max_7"] = grouped.transform(lambda x: x.rolling(7, min_periods=1).max())
    df["sales_min_7"] = grouped.transform(lambda x: x.rolling(7, min_periods=1).min())

    # Линейный тренд за 7 дней (slope)
    def rolling_slope(series):
        result = []
        for i in range(len(series)):
            window = series.iloc[max(0, i - 6):i + 1].values
            if len(window) < 2:
                result.append(0.0)
            else:
                x = np.arange(len(window))
                slope = np.polyfit(x, window, 1)[0]
                result.append(slope)
        return pd.Series(result, index=series.index)

    df["sales_trend_7"] = df.groupby("product_id")["quantity_sold"].transform(rolling_slope)

    return df


# ─── Обучение ───────────────────────────────────────────────────────────────

def train_model(csv_path: str = None, verbose: bool = True) -> dict:
    """
    Обучает GradientBoostingRegressor на историческом датасете.
    Возвращает метрики качества.
    """
    csv_path = Path(csv_path) if csv_path else DEFAULT_CSV
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Датасет не найден: {csv_path}\n"
            "Сначала сгенерируйте его: python generate_dataset.py"
        )

    if verbose:
        print(f"Загрузка данных из {csv_path} …")
    df = pd.read_csv(csv_path)
    df = build_features(df)

    # Убираем первые 14 дней (не хватает истории для скользящих)
    min_date = df["date"].min() + timedelta(days=14)
    df = df[df["date"] >= min_date].reset_index(drop=True)

    X = df[FEATURE_COLS].values
    y = df[TARGET_COL].values

    # Временная кросс-валидация
    tscv = TimeSeriesSplit(n_splits=3)
    mae_scores, rmse_scores, r2_scores = [], [], []

    for train_idx, val_idx in tscv.split(X):
        X_tr, X_val = X[train_idx], X[val_idx]
        y_tr, y_val = y[train_idx], y[val_idx]

        model = GradientBoostingRegressor(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            random_state=42,
        )
        model.fit(X_tr, y_tr)
        preds = model.predict(X_val)

        mae_scores.append(mean_absolute_error(y_val, preds))
        rmse_scores.append(np.sqrt(mean_squared_error(y_val, preds)))
        r2_scores.append(r2_score(y_val, preds))

    # Финальное обучение на всех данных
    final_model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        random_state=42,
    )
    final_model.fit(X, y)

    # Сохранение
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(final_model, MODEL_PATH)

    # Маппинг категорий для предсказания новых товаров
    category_map = dict(zip(
        df["category"].astype("category").cat.categories,
        range(df["category"].astype("category").cat.codes.max() + 1)
    ))

    metrics = {
        "mae": round(float(np.mean(mae_scores)), 3),
        "rmse": round(float(np.mean(rmse_scores)), 3),
        "r2": round(float(np.mean(r2_scores)), 3),
        "trained_on": len(df),
        "features": FEATURE_COLS,
        "category_map": category_map,
        "trained_at": datetime.now().isoformat(),
    }
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

    if verbose:
        print(f"\nМодель сохранена → {MODEL_PATH}")
        print(f"MAE:  {metrics['mae']}")
        print(f"RMSE: {metrics['rmse']}")
        print(f"R²:   {metrics['r2']}")
        print(f"Обучено на {metrics['trained_on']} записях")

        # Важность признаков
        importances = final_model.feature_importances_
        fi = sorted(zip(FEATURE_COLS, importances), key=lambda x: -x[1])
        print("\nВажность признаков:")
        for feat, imp in fi:
            print(f"  {feat:20s} {imp:.4f}")

    return metrics


# ─── Предсказание ────────────────────────────────────────────────────────────

def load_model():
    """Загружает обученную модель и метаданные."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Модель не найдена: {MODEL_PATH}\n"
            "Сначала обучите: python model.py train"
        )
    model = joblib.load(MODEL_PATH)
    with open(META_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)
    return model, meta


def predict_demand(
    csv_path: str = None,
    days_ahead: int = 7,
    top_n: int = None,
) -> pd.DataFrame:
    """
    Предсказывает спрос на days_ahead дней вперёд для каждого товара.

    Возвращает DataFrame:
      product_id, product_name, category, current_stock,
      predicted_demand_7d, days_until_stockout, urgency, recommendation
    """
    model, meta = load_model()
    csv_path = Path(csv_path) if csv_path else DEFAULT_CSV
    df = pd.read_csv(csv_path)
    df = build_features(df)

    # Берём последнее состояние каждого товара
    latest = df.sort_values("date").groupby("product_id").last().reset_index()

    results = []
    for _, row in latest.iterrows():
        total_demand = 0.0
        current_stock = row["stock_remaining"]
        simulated_stock = current_stock

        # Прогон по каждому из days_ahead дней
        # Стартовые значения скользящих — из последнего дня
        prev_sales = [row.get("sales_ma_3", 0)] * 3  # приближённая история

        last_date = row["date"]
        for d in range(1, days_ahead + 1):
            future_date = last_date + timedelta(days=d)
            dow = future_date.weekday()

            features = {
                "price": row["price"],
                "day_of_week": dow,
                "is_weekend": int(dow >= 5),
                "month": future_date.month,
                "week_of_year": future_date.isocalendar()[1],
                "stock_remaining": max(0, simulated_stock),
                "sales_ma_3": row.get("sales_ma_3", 0),
                "sales_ma_7": row.get("sales_ma_7", 0),
                "sales_ma_14": row.get("sales_ma_14", 0),
                "sales_std_7": row.get("sales_std_7", 0),
                "sales_max_7": row.get("sales_max_7", 0),
                "sales_min_7": row.get("sales_min_7", 0),
                "sales_trend_7": row.get("sales_trend_7", 0),
                "category_code": row.get("category_code", 0),
            }

            X_row = np.array([[features[c] for c in FEATURE_COLS]])
            pred = max(0, model.predict(X_row)[0])
            total_demand += pred
            simulated_stock -= pred

        # Расчёт через сколько дней закончится товар
        avg_daily = total_demand / days_ahead if days_ahead > 0 else 0
        if avg_daily > 0:
            days_until_stockout = current_stock / avg_daily
        else:
            days_until_stockout = 999  # спроса нет

        # Определение срочности
        if days_until_stockout <= 3:
            urgency = "critical"
            recommendation = "СРОЧНО дозаказать на производстве"
        elif days_until_stockout <= 7:
            urgency = "high"
            recommendation = "Рекомендуется дозаказать в ближайшие дни"
        elif days_until_stockout <= 14:
            urgency = "medium"
            recommendation = "Запланировать пополнение"
        else:
            urgency = "low"
            recommendation = "Запас достаточный"

        # Рекомендуемый объём дозаказа (на 2 недели вперёд)
        reorder_qty = max(0, int(np.ceil(avg_daily * 14 - current_stock)))

        results.append({
            "product_id": int(row["product_id"]),
            "product_name": row.get("product_name", f"Товар #{int(row['product_id'])}"),
            "category": row.get("category", "—"),
            "price": row["price"],
            "current_stock": int(current_stock),
            "predicted_demand_7d": round(total_demand, 1),
            "avg_daily_demand": round(avg_daily, 2),
            "days_until_stockout": round(days_until_stockout, 1),
            "urgency": urgency,
            "reorder_quantity": reorder_qty,
            "recommendation": recommendation,
        })

    result_df = pd.DataFrame(results)
    result_df = result_df.sort_values("days_until_stockout").reset_index(drop=True)

    if top_n:
        result_df = result_df.head(top_n)

    return result_df


def predict_single_product(
    product_name: str,
    category: str,
    price: float,
    current_stock: int,
    sales_history: list[int],
    days_ahead: int = 7,
) -> dict:
    """
    Предсказывает спрос для ОДНОГО произвольного товара.

    Args:
        product_name: Название товара
        category: Категория (Платья, Блузки, Юбки и т.д.)
        price: Цена товара
        current_stock: Текущий остаток на складе
        sales_history: Список дневных продаж за последние N дней (мин. 7 дней)
        days_ahead: На сколько дней прогнозировать

    Returns:
        Словарь с прогнозом и рекомендациями
    """
    model, meta = load_model()

    if len(sales_history) < 3:
        raise ValueError("Нужна история минимум за 3 дня")

    sales = np.array(sales_history, dtype=float)
    category_map = meta.get("category_map", {})
    cat_code = category_map.get(category, 0)

    today = datetime.now()
    total_demand = 0.0
    simulated_stock = current_stock

    for d in range(1, days_ahead + 1):
        future_date = today + timedelta(days=d)
        dow = future_date.weekday()

        features = {
            "price": price,
            "day_of_week": dow,
            "is_weekend": int(dow >= 5),
            "month": future_date.month,
            "week_of_year": future_date.isocalendar()[1],
            "stock_remaining": max(0, simulated_stock),
            "sales_ma_3": float(sales[-3:].mean()),
            "sales_ma_7": float(sales[-7:].mean()) if len(sales) >= 7 else float(sales.mean()),
            "sales_ma_14": float(sales[-14:].mean()) if len(sales) >= 14 else float(sales.mean()),
            "sales_std_7": float(sales[-7:].std()) if len(sales) >= 7 else float(sales.std()),
            "sales_max_7": float(sales[-7:].max()) if len(sales) >= 7 else float(sales.max()),
            "sales_min_7": float(sales[-7:].min()) if len(sales) >= 7 else float(sales.min()),
            "sales_trend_7": float(np.polyfit(np.arange(min(7, len(sales))), sales[-7:] if len(sales) >= 7 else sales, 1)[0]),
            "category_code": cat_code,
        }

        X_row = np.array([[features[c] for c in FEATURE_COLS]])
        pred = max(0, model.predict(X_row)[0])
        total_demand += pred
        simulated_stock -= pred

    avg_daily = total_demand / days_ahead
    days_until_stockout = current_stock / avg_daily if avg_daily > 0 else 999

    if days_until_stockout <= 3:
        urgency = "critical"
        recommendation = "СРОЧНО дозаказать на производстве"
    elif days_until_stockout <= 7:
        urgency = "high"
        recommendation = "Рекомендуется дозаказать в ближайшие дни"
    elif days_until_stockout <= 14:
        urgency = "medium"
        recommendation = "Запланировать пополнение"
    else:
        urgency = "low"
        recommendation = "Запас достаточный"

    reorder_qty = max(0, int(np.ceil(avg_daily * 14 - current_stock)))

    return {
        "product_name": product_name,
        "category": category,
        "price": price,
        "current_stock": current_stock,
        "predicted_demand_7d": round(total_demand, 1),
        "avg_daily_demand": round(avg_daily, 2),
        "days_until_stockout": round(days_until_stockout, 1),
        "urgency": urgency,
        "reorder_quantity": reorder_qty,
        "recommendation": recommendation,
    }


# ─── CLI ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ML-модель предсказания спроса Avishu")
    sub = parser.add_subparsers(dest="command")

    # train
    train_p = sub.add_parser("train", help="Обучить модель")
    train_p.add_argument("--data", type=str, default=None, help="Путь к CSV с историей продаж")

    # predict
    pred_p = sub.add_parser("predict", help="Предсказать спрос и показать дефициты")
    pred_p.add_argument("--data", type=str, default=None, help="Путь к CSV с историей продаж")
    pred_p.add_argument("--days", type=int, default=7, help="Горизонт прогноза (дни)")
    pred_p.add_argument("--top", type=int, default=None, help="Показать только топ-N позиций")

    args = parser.parse_args()

    if args.command == "train":
        train_model(csv_path=args.data)

    elif args.command == "predict":
        result = predict_demand(csv_path=args.data, days_ahead=args.days, top_n=args.top)

        # Отображение результатов
        critical = result[result["urgency"] == "critical"]
        high = result[result["urgency"] == "high"]
        medium = result[result["urgency"] == "medium"]

        print("=" * 90)
        print("  АНАЛИТИЧЕСКАЯ ПАНЕЛЬ AVISHU — Прогноз дефицита товаров")
        print("=" * 90)

        if len(critical) > 0:
            print(f"\n🔴 КРИТИЧНО ({len(critical)} позиций) — закончатся в течение 3 дней:")
            print("-" * 90)
            for _, r in critical.iterrows():
                print(f"  {r['product_name']:40s} | остаток: {r['current_stock']:4d} | "
                      f"спрос/день: {r['avg_daily_demand']:5.1f} | дозаказ: {r['reorder_quantity']:4d} шт.")

        if len(high) > 0:
            print(f"\n🟠 ВЫСОКИЙ РИСК ({len(high)} позиций) — закончатся в течение недели:")
            print("-" * 90)
            for _, r in high.iterrows():
                print(f"  {r['product_name']:40s} | остаток: {r['current_stock']:4d} | "
                      f"спрос/день: {r['avg_daily_demand']:5.1f} | дозаказ: {r['reorder_quantity']:4d} шт.")

        if len(medium) > 0:
            print(f"\n🟡 СРЕДНИЙ РИСК ({len(medium)} позиций) — запас на 1-2 недели:")
            print("-" * 90)
            for _, r in medium.iterrows():
                print(f"  {r['product_name']:40s} | остаток: {r['current_stock']:4d} | "
                      f"спрос/день: {r['avg_daily_demand']:5.1f} | дозаказ: {r['reorder_quantity']:4d} шт.")

        low_count = len(result[result["urgency"] == "low"])
        print(f"\n🟢 В норме: {low_count} позиций (запас > 2 недель)")

        print(f"\nВсего проанализировано: {len(result)} товаров")
        print(f"Горизонт прогноза: {args.days} дней")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()

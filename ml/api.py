"""
REST API для аналитической панели предсказания спроса.

Предоставляет эндпоинты:
  GET  /api/analytics/demand          — прогноз дефицита по всем товарам
  POST /api/analytics/demand/product  — прогноз для одного товара (произвольного)
  GET  /api/analytics/model/info      — информация об обученной модели
  POST /api/analytics/model/train     — переобучить модель

Запуск:
  python api.py                  # по умолчанию порт 5050
  python api.py --port 8080
"""

import argparse
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS

from model import (
    train_model,
    predict_demand,
    predict_single_product,
    load_model,
    META_PATH,
    MODEL_PATH,
)

import json

app = Flask(__name__)
CORS(app)


@app.route("/api/analytics/demand", methods=["GET"])
def get_demand_forecast():
    """
    Прогноз дефицита по всем товарам из датасета.

    Query params:
      days   — горизонт (по умолч. 7)
      top    — ограничить количество (опц.)
      urgency — фильтр: critical, high, medium, low (опц.)
    """
    days = request.args.get("days", 7, type=int)
    top_n = request.args.get("top", None, type=int)
    urgency_filter = request.args.get("urgency", None, type=str)
    csv_path = request.args.get("data", None, type=str)

    try:
        result = predict_demand(csv_path=csv_path, days_ahead=days, top_n=top_n)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404

    records = result.to_dict(orient="records")

    if urgency_filter:
        records = [r for r in records if r["urgency"] == urgency_filter]

    summary = {
        "total": len(result),
        "critical": len(result[result["urgency"] == "critical"]),
        "high": len(result[result["urgency"] == "high"]),
        "medium": len(result[result["urgency"] == "medium"]),
        "low": len(result[result["urgency"] == "low"]),
    }

    return jsonify({
        "forecast": records,
        "summary": summary,
        "days_ahead": days,
    })


@app.route("/api/analytics/demand/product", methods=["POST"])
def predict_single():
    """
    Прогноз для одного произвольного товара.

    JSON body:
    {
      "product_name": "Платье летнее",
      "category": "Платья",
      "price": 3000,
      "current_stock": 25,
      "sales_history": [5, 3, 7, 4, 6, 8, 3, 5, 4, 6, 7, 3, 5, 4],
      "days_ahead": 7          // опционально
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    required = ["product_name", "category", "price", "current_stock", "sales_history"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if not isinstance(data["sales_history"], list) or len(data["sales_history"]) < 3:
        return jsonify({"error": "sales_history must be a list of at least 3 daily sales values"}), 400

    try:
        result = predict_single_product(
            product_name=str(data["product_name"]),
            category=str(data["category"]),
            price=float(data["price"]),
            current_stock=int(data["current_stock"]),
            sales_history=[int(x) for x in data["sales_history"]],
            days_ahead=int(data.get("days_ahead", 7)),
        )
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"prediction": result})


@app.route("/api/analytics/model/info", methods=["GET"])
def model_info():
    """Информация об обученной модели."""
    if not META_PATH.exists():
        return jsonify({"error": "Модель ещё не обучена", "trained": False}), 404

    with open(META_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)

    meta["trained"] = True
    meta["model_file"] = str(MODEL_PATH)
    return jsonify(meta)


@app.route("/api/analytics/model/train", methods=["POST"])
def retrain():
    """Переобучить модель (опционально на новом CSV)."""
    data = request.get_json() or {}
    csv_path = data.get("data_path", None)

    try:
        metrics = train_model(csv_path=csv_path, verbose=False)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404

    return jsonify({"message": "Модель успешно переобучена", "metrics": metrics})


# ─── Запуск ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="API аналитической панели Avishu")
    parser.add_argument("--port", type=int, default=5050)
    parser.add_argument("--host", type=str, default="0.0.0.0")
    args = parser.parse_args()

    print(f"ML Analytics API → http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=True)

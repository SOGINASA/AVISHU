from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Feedback

feedback_bp = Blueprint('feedback', __name__)


@feedback_bp.route('/send', methods=['POST'])
@jwt_required()
def send_feedback():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()

        category = data.get('category', 'other')
        if category not in ('bug', 'feature', 'improvement', 'other'):
            category = 'other'

        message = (data.get('message') or '').strip()
        if not message or len(message) < 5:
            return jsonify({'error': 'Message too short'}), 400

        if len(message) > 2000:
            return jsonify({'error': 'Message too long (max 2000 chars)'}), 400

        rating = data.get('rating')
        if rating is not None:
            rating = max(1, min(5, int(rating)))

        feedback = Feedback(user_id=user_id, category=category, rating=rating, message=message)
        db.session.add(feedback)
        db.session.commit()

        print(f"[Feedback] New feedback from user {user_id}: category={category}, rating={rating}")
        return jsonify({'success': True, 'id': feedback.id}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Feedback error: {e}")
        return jsonify({'error': 'Failed to send feedback'}), 500

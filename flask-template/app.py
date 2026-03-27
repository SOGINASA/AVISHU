import os
import json
import time
import signal
import sys

def on_exit(sig, frame):
    sys.exit(0)

signal.signal(signal.SIGTERM, on_exit)

if __name__ != "__main__":
    import multiprocessing
    GRACEFUL_TIMEOUT = os.environ.get("GRACEFUL_TIMEOUT", "120")
    KEEPALIVE_TIMEOUT = os.environ.get("KEEPALIVE_TIMEOUT", "120")

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, decode_token
from flask_sock import Sock
from config import Config, DATABASE_DIR
from models import db, User, Notification
from flask_jwt_extended.exceptions import JWTExtendedException
from werkzeug.exceptions import HTTPException
from services import websocket_service
from services.scheduler_service import init_scheduler

migrate = Migrate()
jwt = JWTManager()
sock = Sock()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, supports_credentials=True, origins=Config.CORS_ORIGINS)

    os.makedirs(DATABASE_DIR, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    sock.init_app(app)

    with app.app_context():
        db.create_all()

    from routes import auth_bp
    from routes.oauth import oauth_bp
    from routes.webauthn import webauthn_bp
    from routes.notifications import notifications_bp
    from routes.feedback import feedback_bp
    from routes.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(oauth_bp, url_prefix='/api/auth/oauth')
    app.register_blueprint(webauthn_bp, url_prefix='/api/auth/webauthn')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(feedback_bp, url_prefix='/api/feedback')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # WebSocket для real-time уведомлений
    @sock.route('/ws/notifications')
    def ws_notifications(ws):
        token = request.args.get('token')
        if not token:
            ws.close(1008, 'Token required')
            return

        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
        except Exception:
            ws.close(1008, 'Invalid token')
            return

        websocket_service.register(user_id, ws)

        try:
            count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
            ws.send(json.dumps({'type': 'unread_count', 'payload': {'count': count}}))

            last_ping = time.time()
            while True:
                data = ws.receive(timeout=60)
                if data is None:
                    if time.time() - last_ping > 25:
                        try:
                            ws.send(json.dumps({'type': 'ping'}))
                            last_ping = time.time()
                        except Exception:
                            break
                    continue
                try:
                    msg = json.loads(data)
                    if msg.get('type') == 'ping':
                        ws.send(json.dumps({'type': 'pong'}))
                        last_ping = time.time()
                    elif msg.get('type') == 'pong':
                        last_ping = time.time()
                except (json.JSONDecodeError, TypeError):
                    pass
        except Exception:
            pass
        finally:
            websocket_service.unregister(user_id, ws)

    @app.route('/api')
    def api_info():
        return jsonify({
            'message': 'API is alive',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth - registration and login',
                'oauth': '/api/auth/oauth - OAuth (Google, GitHub)',
                'webauthn': '/api/auth/webauthn - biometric auth',
                'notifications': '/api/notifications - notifications',
                'feedback': '/api/feedback - user feedback',
                'admin': '/api/admin - admin panel',
            },
            'websocket': {
                'notifications': '/ws/notifications (token required)',
            }
        })

    import os as _os
    if _os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        init_scheduler(app)

    return app


app = create_app()


@app.errorhandler(422)
def handle_unprocessable_entity(err):
    return jsonify({'error': 'Validation error', 'message': str(err)}), 422


@app.errorhandler(JWTExtendedException)
def handle_jwt_error(e):
    return jsonify({'error': 'JWT Error', 'message': str(e)}), 401


@app.errorhandler(HTTPException)
def handle_http_exception(e):
    return jsonify({'error': e.code, 'message': e.description}), e.code


@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token expired'}), 401


@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'error': 'Invalid token'}), 401


@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({'error': 'Authorization required'}), 401


@app.cli.command()
def init_db():
    """Initialize database"""
    print("Initializing database...")
    db.create_all()
    print("Database initialized!")


@app.cli.command()
def create_admin():
    """Create admin user"""
    email = input("Admin email: ")
    password = input("Password: ")
    full_name = input("Full name: ")

    if User.query.filter_by(email=email).first():
        print("User with this email already exists")
        return

    admin = User(full_name=full_name, email=email, user_type='admin', is_verified=True)
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()

    print(f"Admin {email} created")


@app.cli.command()
def generate_vapid():
    """Generate VAPID keys for Web Push"""
    import base64
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.backends import default_backend

    private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())

    private_numbers = private_key.private_numbers()
    private_bytes = private_numbers.private_value.to_bytes(32, 'big')
    private_key_b64 = base64.urlsafe_b64encode(private_bytes).rstrip(b'=').decode()

    pub_numbers = private_key.public_key().public_numbers()
    x = pub_numbers.x.to_bytes(32, 'big')
    y = pub_numbers.y.to_bytes(32, 'big')
    public_bytes = b'\x04' + x + y
    public_key_b64 = base64.urlsafe_b64encode(public_bytes).rstrip(b'=').decode()

    print("Add to .env file:")
    print(f"VAPID_PRIVATE_KEY={private_key_b64}")
    print(f"VAPID_PUBLIC_KEY={public_key_b64}")


if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)

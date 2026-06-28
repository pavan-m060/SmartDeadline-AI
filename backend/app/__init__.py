from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.config import Config
from app.models import db
from app.routes import auth_bp, bcrypt
from app.ai_routes import ai_bp

def create_app(config_class=Config):
    """Application factory for Flask backend."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize CORS for all cross-origin requests
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize Database and Hashing extensions
    db.init_app(app)
    bcrypt.init_app(app)
    
    # Initialize JWT token validation manager
    jwt = JWTManager(app)

    # Customize JWT error handlers for production completeness
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({
            "error": "Missing Authorization Header",
            "details": "A valid Bearer token is required to access this resource."
        }), 401

    @jwt.expired_token_loader
    def expired_token_response(jwt_header, jwt_payload):
        return jsonify({
            "error": "Token has expired",
            "details": "The provided JWT access token has expired. Please log in again."
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({
            "error": "Invalid Token",
            "details": "The signature or structure of the provided token is invalid."
        }), 422

    # Register Blueprint routes
    app.register_blueprint(auth_bp)
    app.register_blueprint(ai_bp)

    # Setup database tables automatically for SQLite
    with app.app_context():
        try:
            db.create_all()
            # Perform column migration check for attachments_json
            connection = db.engine.connect()
            try:
                cursor = connection.connection.cursor()
                cursor.execute("PRAGMA table_info(assignments)")
                columns = [info[1] for info in cursor.fetchall()]
                if 'attachments_json' not in columns:
                    cursor.execute("ALTER TABLE assignments ADD COLUMN attachments_json TEXT;")
                    connection.connection.commit()
                    app.logger.info("Successfully added attachments_json column to assignments table.")
                
                # Check users table
                cursor.execute("PRAGMA table_info(users)")
                user_columns = [info[1] for info in cursor.fetchall()]
                if 'department' not in user_columns:
                    cursor.execute("ALTER TABLE users ADD COLUMN department TEXT;")
                    connection.connection.commit()
                if 'semester' not in user_columns:
                    cursor.execute("ALTER TABLE users ADD COLUMN semester TEXT;")
                    connection.connection.commit()
                if 'settings_json' not in user_columns:
                    cursor.execute("ALTER TABLE users ADD COLUMN settings_json TEXT;")
                    connection.connection.commit()
                app.logger.info("Successfully checked and updated columns on users table.")
            except Exception as migrate_err:
                app.logger.error(f"Failed to run sqlite migrations: {migrate_err}")
            finally:
                connection.close()
        except Exception as e:
            app.logger.error(f"Failed to auto-create database tables: {e}")

    # Root API health status route
    @app.route('/')
    def index():
        return jsonify({
            "name": "SmartDeadline AI Auth API",
            "status": "healthy",
            "version": "1.0.0",
            "apis": {
                "register": "POST /api/auth/register",
                "login": "POST /api/auth/login",
                "me": "GET /api/auth/me",
                "study-plan": "POST /api/ai/study-plan",
                "milestones": "POST /api/ai/milestones",
                "deadline-risk": "POST /api/ai/deadline-risk",
                "motivation": "POST /api/ai/motivation",
                "priorities": "POST /api/ai/priorities"
            }
        }), 200

    return app

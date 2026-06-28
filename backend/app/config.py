import os

class Config:
    """Base configuration class."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'super-secret-key-for-session-management')
    
    # Database Configuration
    # Fallback to local SQLite database in the backend directory
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        f"sqlite:///{os.path.join(os.path.dirname(BASE_DIR), 'app.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-super-secret-token-key-2026')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours in seconds

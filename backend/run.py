import os
from app import create_app

# Instantiate the configured Flask app through the application factory
app = create_app()

if __name__ == '__main__':
    # Listen on host 0.0.0.0 and port 5000 by default (or environment variable PORT)
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    
    print(f"Starting SmartDeadline AI Flask Auth API on http://{host}:{port}...")
    app.run(host=host, port=port, debug=True)

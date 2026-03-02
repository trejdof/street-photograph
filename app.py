from dotenv import load_dotenv
load_dotenv()

import logging
import os
from logging.handlers import RotatingFileHandler
from flask import Flask
from flask_cors import CORS
from db import init_db, _BASE_DIR
from backup import main as run_backup
from routes.streets import streets_bp
from routes.static import static_bp

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

app.register_blueprint(streets_bp)
app.register_blueprint(static_bp)

def setup_logging():
    log_path = os.path.join(_BASE_DIR, 'app.log')
    handler = RotatingFileHandler(log_path, maxBytes=1_000_000, backupCount=3)
    handler.setLevel(logging.INFO)
    handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s %(name)s: %(message)s'
    ))
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.addHandler(handler)
    root.addHandler(logging.StreamHandler())

setup_logging()

if __name__ == '__main__':
    init_db()
    run_backup()
    app.run(host='0.0.0.0', port=5000, debug=False)

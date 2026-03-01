from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from flask_cors import CORS
from db import init_db
from backup import main as run_backup
from routes.streets import streets_bp
from routes.static import static_bp

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

app.register_blueprint(streets_bp)
app.register_blueprint(static_bp)

if __name__ == '__main__':
    init_db()
    run_backup()
    app.run(host='0.0.0.0', port=5000, debug=False)

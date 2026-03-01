import os
import sqlite3

# Configuration — absolute paths so the app works regardless of working directory
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(_BASE_DIR, 'uploads')
DATABASE = os.path.join(_BASE_DIR, 'streets.db')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'heic'}

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database with schema and run migrations"""
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS streets (
            id TEXT PRIMARY KEY,
            street_name TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            image_filename TEXT NOT NULL,
            created_at TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            geometry_json TEXT DEFAULT NULL
        )
    ''')
    # Migrate: add missing columns for databases created before these features
    cursor = conn.execute('PRAGMA table_info(streets)')
    columns = [row[1] for row in cursor.fetchall()]
    if 'completed' not in columns:
        conn.execute('ALTER TABLE streets ADD COLUMN completed INTEGER DEFAULT 0')
    if 'geometry_json' not in columns:
        conn.execute('ALTER TABLE streets ADD COLUMN geometry_json TEXT DEFAULT NULL')
    conn.commit()
    conn.close()

from flask import Blueprint, send_from_directory
from db import UPLOAD_FOLDER

static_bp = Blueprint('static_routes', __name__)


@static_bp.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('static', 'index.html')


@static_bp.route('/uploads/<filename>')
def serve_upload(filename):
    """Serve uploaded image files"""
    return send_from_directory(UPLOAD_FOLDER, filename)

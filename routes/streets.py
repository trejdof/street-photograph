import json
import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from db import get_db, allowed_file, UPLOAD_FOLDER
from geometry import fetch_street_geometry
from telegram import notify_street_created, notify_street_deleted
from backup import main as run_backup

streets_bp = Blueprint('streets', __name__)


@streets_bp.route('/api/streets', methods=['GET'])
def get_streets():
    """Get all saved street entries"""
    conn = get_db()
    cursor = conn.execute('SELECT * FROM streets ORDER BY created_at DESC')
    streets = []
    for row in cursor.fetchall():
        geom = None
        if 'geometry_json' in row.keys() and row['geometry_json']:
            geom = json.loads(row['geometry_json'])
        streets.append({
            'id': row['id'],
            'street_name': row['street_name'],
            'lat': row['lat'],
            'lng': row['lng'],
            'image_url': f'/uploads/{row["image_filename"]}',
            'created_at': row['created_at'],
            'completed': bool(row['completed']) if 'completed' in row.keys() else False,
            'geometry': geom
        })
    conn.close()
    return jsonify(streets)


@streets_bp.route('/api/streets', methods=['POST'])
def create_street():
    """Save a new street entry"""
    try:
        # Validate required fields
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400

        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({'error': 'No image selected'}), 400

        if not allowed_file(image_file.filename):
            return jsonify({'error': 'Invalid file type'}), 400

        street_name = request.form.get('street_name')
        lat = request.form.get('lat')
        lng = request.form.get('lng')

        if not all([street_name, lat, lng]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Generate unique ID and date-based filename (YYYYMMDD_N.ext)
        entry_id = str(uuid.uuid4())
        file_extension = image_file.filename.rsplit('.', 1)[1].lower()
        today = datetime.utcnow().strftime('%Y%m%d')
        conn_count = get_db()
        cursor = conn_count.execute(
            "SELECT COUNT(*) FROM streets WHERE image_filename LIKE ?",
            (f'{today}_%',)
        )
        n = cursor.fetchone()[0] + 1
        conn_count.close()
        image_filename = f'{today}_{n}.{file_extension}'

        # Save image file
        image_path = os.path.join(UPLOAD_FOLDER, image_filename)
        image_file.save(image_path)

        # Fetch street geometry from Overpass API
        geometry_json = fetch_street_geometry(street_name, float(lat), float(lng))

        # Save to database
        created_at = datetime.utcnow().isoformat()
        conn = get_db()
        conn.execute(
            'INSERT INTO streets (id, street_name, lat, lng, image_filename, created_at, completed, geometry_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (entry_id, street_name, float(lat), float(lng), image_filename, created_at, 0, geometry_json)
        )
        conn.commit()
        conn.close()

        notify_street_created({
            'street_name': street_name,
            'lat': float(lat),
            'lng': float(lng),
            'image_path': image_path,
            'created_at': created_at,
        })

        # Return created entry
        return jsonify({
            'id': entry_id,
            'street_name': street_name,
            'lat': float(lat),
            'lng': float(lng),
            'image_url': f'/uploads/{image_filename}',
            'created_at': created_at,
            'completed': False,
            'geometry': json.loads(geometry_json) if geometry_json else None
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@streets_bp.route('/api/streets/<street_id>/toggle', methods=['PATCH'])
def toggle_street_completion(street_id):
    """Toggle the completed status of a street"""
    try:
        conn = get_db()

        # Get current status
        cursor = conn.execute('SELECT completed FROM streets WHERE id = ?', (street_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({'error': 'Street not found'}), 404

        # Toggle the status
        new_status = 0 if row['completed'] else 1
        conn.execute('UPDATE streets SET completed = ? WHERE id = ?', (new_status, street_id))
        conn.commit()
        conn.close()

        return jsonify({'completed': bool(new_status)}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@streets_bp.route('/api/streets/<street_id>/fetch-geometry', methods=['POST'])
def fetch_geometry(street_id):
    """Fetch and cache geometry for a street that is missing it."""
    try:
        conn = get_db()
        cursor = conn.execute('SELECT street_name, lat, lng, geometry_json FROM streets WHERE id = ?', (street_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({'error': 'Street not found'}), 404

        if row['geometry_json']:
            conn.close()
            return jsonify({'geometry': json.loads(row['geometry_json'])}), 200

        geometry_json = fetch_street_geometry(row['street_name'], row['lat'], row['lng'])
        if geometry_json:
            conn.execute('UPDATE streets SET geometry_json = ? WHERE id = ?', (geometry_json, street_id))
            conn.commit()

        conn.close()
        return jsonify({'geometry': json.loads(geometry_json) if geometry_json else None}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@streets_bp.route('/api/streets/<street_id>', methods=['DELETE'])
def delete_street(street_id):
    """Delete a street entry"""
    try:
        conn = get_db()

        # Get the entry to find the image filename
        cursor = conn.execute('SELECT street_name, lat, lng, image_filename FROM streets WHERE id = ?', (street_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({'error': 'Street not found'}), 404

        image_filename = row['image_filename']
        image_path = os.path.join(UPLOAD_FOLDER, image_filename)

        # Send audit notification BEFORE deleting (so the image is still on disk)
        notify_street_deleted(row['street_name'], row['lat'], row['lng'], image_path)

        # Delete from database
        conn.execute('DELETE FROM streets WHERE id = ?', (street_id,))
        conn.commit()
        conn.close()

        # Delete image file
        if os.path.exists(image_path):
            os.remove(image_path)

        return jsonify({'message': 'Street deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@streets_bp.route('/api/backup', methods=['POST'])
def trigger_backup():
    """Trigger a Telegram backup manually."""
    try:
        run_backup()
        return jsonify({'message': 'Backup sent'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

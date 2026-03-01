"""
Standalone backup script.
Creates a ZIP of streets.db + uploads/, sends it to Telegram,
deletes the previous backup message, and pins the new one.

Run:  venv/Scripts/python.exe backup.py
"""

import os
import sqlite3
import zipfile
from datetime import datetime

import telegram

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(_BASE_DIR, 'streets.db')
UPLOAD_FOLDER = os.path.join(_BASE_DIR, 'uploads')
ENV_FILE = os.path.join(_BASE_DIR, '.env')


def get_street_count():
    if not os.path.exists(DATABASE):
        return 0
    conn = sqlite3.connect(DATABASE)
    count = conn.execute('SELECT COUNT(*) FROM streets').fetchone()[0]
    conn.close()
    return count


def read_env_value(key):
    """Read a single value from .env without overwriting os.environ."""
    if not os.path.exists(ENV_FILE):
        return ''
    with open(ENV_FILE, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith(f'{key}='):
                return line[len(key) + 1:]
    return ''


def write_env_value(key, value):
    """Update a single key in .env, preserving all other lines."""
    if not os.path.exists(ENV_FILE):
        return
    lines = []
    found = False
    with open(ENV_FILE, 'r') as f:
        for line in f:
            if line.strip().startswith(f'{key}='):
                lines.append(f'{key}={value}\n')
                found = True
            else:
                lines.append(line)
    if not found:
        lines.append(f'{key}={value}\n')
    with open(ENV_FILE, 'w') as f:
        f.writelines(lines)


def create_backup_zip():
    """Create a ZIP file with the database and all uploaded images."""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    zip_name = f'backup_{timestamp}.zip'

    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zf:
        if os.path.exists(DATABASE):
            zf.write(DATABASE)
        if os.path.exists(UPLOAD_FOLDER):
            for root, _dirs, files in os.walk(UPLOAD_FOLDER):
                for fname in files:
                    filepath = os.path.join(root, fname)
                    zf.write(filepath)

    return zip_name


def main():
    if not telegram._enabled():
        print('[backup] Telegram not configured, skipping.')
        return

    # 1. Create ZIP
    print('[backup] Creating ZIP...')
    zip_path = create_backup_zip()
    zip_size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    street_count = get_street_count()
    date_str = datetime.now().strftime('%Y-%m-%d %H:%M')

    caption = (
        f"<b>Backup</b>\n"
        f"{street_count} streets, {zip_size_mb:.1f} MB\n"
        f"{date_str}"
    )

    # 2. Delete old backup message
    old_msg_id = read_env_value('TELEGRAM_BACKUP_MSG_ID')
    if old_msg_id:
        print(f'[backup] Deleting old message {old_msg_id}...')
        telegram.delete_message(int(old_msg_id))

    # 3. Send new backup
    print(f'[backup] Sending {zip_path} ({zip_size_mb:.1f} MB)...')
    new_msg_id = telegram.send_document(zip_path, caption=caption)

    if new_msg_id:
        # 4. Pin & save message ID
        telegram.pin_message(new_msg_id)
        write_env_value('TELEGRAM_BACKUP_MSG_ID', str(new_msg_id))
        print(f'[backup] Sent and pinned (message {new_msg_id}).')
    else:
        print('[backup] Failed to send backup.')

    # 5. Clean up local ZIP
    os.remove(zip_path)
    print('[backup] Done.')


if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv()
    main()

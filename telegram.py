import os
import requests


def _get_config():
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID', '')
    return token, chat_id


def _enabled():
    token, chat_id = _get_config()
    return bool(token and chat_id
                and token != 'your_bot_token_here'
                and chat_id != 'your_chat_id_here')


def _api(method):
    token, _ = _get_config()
    return f'https://api.telegram.org/bot{token}/{method}'


def send_message(text):
    """Send a text message. Returns the message ID or None."""
    if not _enabled():
        return None
    _, chat_id = _get_config()
    try:
        resp = requests.post(_api('sendMessage'), json={
            'chat_id': chat_id,
            'text': text,
            'parse_mode': 'HTML',
        }, timeout=10)
        data = resp.json()
        if data.get('ok'):
            return data['result']['message_id']
    except Exception as e:
        print(f'[telegram] send_message failed: {e}')
    return None


def send_photo(photo_path, caption=''):
    """Send a photo file. Returns the message ID or None."""
    if not _enabled():
        return None
    _, chat_id = _get_config()
    try:
        with open(photo_path, 'rb') as f:
            resp = requests.post(_api('sendPhoto'), data={
                'chat_id': chat_id,
                'caption': caption,
                'parse_mode': 'HTML',
            }, files={'photo': f}, timeout=30)
        data = resp.json()
        if data.get('ok'):
            return data['result']['message_id']
    except Exception as e:
        print(f'[telegram] send_photo failed: {e}')
    return None


def send_document(file_path, caption=''):
    """Send a document file. Returns the message ID or None."""
    if not _enabled():
        return None
    _, chat_id = _get_config()
    try:
        with open(file_path, 'rb') as f:
            resp = requests.post(_api('sendDocument'), data={
                'chat_id': chat_id,
                'caption': caption,
                'parse_mode': 'HTML',
            }, files={'document': f}, timeout=120)
        data = resp.json()
        if data.get('ok'):
            return data['result']['message_id']
    except Exception as e:
        print(f'[telegram] send_document failed: {e}')
    return None


def pin_message(message_id):
    """Pin a message in the chat."""
    if not _enabled():
        return
    _, chat_id = _get_config()
    try:
        requests.post(_api('pinChatMessage'), json={
            'chat_id': chat_id,
            'message_id': message_id,
            'disable_notification': True,
        }, timeout=10)
    except Exception as e:
        print(f'[telegram] pin_message failed: {e}')


def delete_message(message_id):
    """Delete a message from the chat."""
    if not _enabled():
        return
    _, chat_id = _get_config()
    try:
        requests.post(_api('deleteMessage'), json={
            'chat_id': chat_id,
            'message_id': message_id,
        }, timeout=10)
    except Exception as e:
        print(f'[telegram] delete_message failed: {e}')


def notify_street_created(street):
    """Send audit notification for a newly created street."""
    text = (
        f"<b>Street added</b>\n"
        f"{street['street_name']}\n"
        f"{street['lat']:.6f}, {street['lng']:.6f}\n"
        f"{street['created_at']}"
    )
    image_path = street.get('image_path', '')
    if image_path and os.path.exists(image_path):
        send_photo(image_path, caption=text)
    else:
        send_message(text)


def notify_street_deleted(street_name, lat, lng, image_path=None):
    """Send audit notification before a street is deleted."""
    text = (
        f"<b>Street deleted</b>\n"
        f"{street_name}\n"
        f"{lat:.6f}, {lng:.6f}"
    )
    if image_path and os.path.exists(image_path):
        send_photo(image_path, caption=text)
    else:
        send_message(text)

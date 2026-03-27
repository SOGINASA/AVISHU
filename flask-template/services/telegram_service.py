import hashlib
import hmac
import time
from config import Config


def verify_telegram_auth(data: dict) -> bool:
    """
    Verify data received from the Telegram Login Widget.
    https://core.telegram.org/widgets/login#checking-authorization
    """
    bot_token = Config.TELEGRAM_BOT_TOKEN
    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN is not set")

    received_hash = data.pop('hash', None)
    if not received_hash:
        return False

    # Check auth_date is not too old (1 day)
    auth_date = int(data.get('auth_date', 0))
    if time.time() - auth_date > 86400:
        return False

    data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(data.items()))
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    return hmac.compare_digest(expected_hash, received_hash)

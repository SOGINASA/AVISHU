import re
from flask import request


SUPPORTED_LANGS = {"ru", "kk"}


_BASE_TRANSLATIONS = {
    "No data provided": {"ru": "Данные не переданы", "kk": "Деректер берілмеді"},
    "Email or nickname required": {"ru": "Требуется email или никнейм", "kk": "Email немесе лақап ат қажет"},
    "Password required": {"ru": "Требуется пароль", "kk": "Құпиясөз қажет"},
    "Invalid email format": {"ru": "Неверный формат email", "kk": "Email форматы қате"},
    "Nickname must be 3-20 characters (letters, digits, dots, underscores, dashes)": {
        "ru": "Никнейм должен быть 3-20 символов (буквы, цифры, точки, подчёркивания, дефисы)",
        "kk": "Лақап ат 3-20 таңба болуы керек (әріптер, сандар, нүкте, астыңғы сызық, дефис)",
    },
    "Password must be at least 6 characters": {"ru": "Пароль должен быть не менее 6 символов", "kk": "Құпиясөз кемінде 6 таңба болуы керек"},
    "User with this email already exists": {"ru": "Пользователь с таким email уже существует", "kk": "Мұндай email-ы бар пайдаланушы бұрыннан бар"},
    "This nickname is already taken": {"ru": "Этот никнейм уже занят", "kk": "Бұл лақап ат бос емес"},
    "Account creation failed": {"ru": "Не удалось создать аккаунт", "kk": "Тіркелгі жасау сәтсіз аяқталды"},
    "Fill in all fields": {"ru": "Заполните все поля", "kk": "Барлық өрістерді толтырыңыз"},
    "Provide email, nickname, or identifier": {"ru": "Укажите email, никнейм или идентификатор", "kk": "Email, лақап ат немесе идентификатор көрсетіңіз"},
    "Invalid credentials": {"ru": "Неверные учетные данные", "kk": "Деректер қате"},
    "Login failed": {"ru": "Ошибка входа", "kk": "Кіру сәтсіз аяқталды"},
    "User not found": {"ru": "Пользователь не найден", "kk": "Пайдаланушы табылмады"},
    "Token refresh failed": {"ru": "Не удалось обновить токен", "kk": "Токенді жаңарту сәтсіз"},
    "Failed to get user": {"ru": "Не удалось получить пользователя", "kk": "Пайдаланушы дерегін алу сәтсіз"},
    "Invalid nickname format": {"ru": "Неверный формат никнейма", "kk": "Лақап ат форматы қате"},
    "Nickname already taken": {"ru": "Никнейм уже занят", "kk": "Лақап ат бос емес"},
    "Failed to update profile": {"ru": "Не удалось обновить профиль", "kk": "Профильді жаңарту сәтсіз"},
    "Current and new passwords required": {"ru": "Требуются текущий и новый пароль", "kk": "Ағымдағы және жаңа құпиясөз қажет"},
    "Wrong current password": {"ru": "Неверный текущий пароль", "kk": "Ағымдағы құпиясөз қате"},
    "Password changed": {"ru": "Пароль изменён", "kk": "Құпиясөз өзгертілді"},
    "Failed to change password": {"ru": "Не удалось изменить пароль", "kk": "Құпиясөзді өзгерту сәтсіз"},
    "Email required": {"ru": "Требуется email", "kk": "Email қажет"},
    "If this email exists, instructions have been sent": {
        "ru": "Если такой email существует, инструкции отправлены",
        "kk": "Егер мұндай email бар болса, нұсқаулық жіберілді",
    },
    "Failed to process request": {"ru": "Не удалось обработать запрос", "kk": "Сұранысты өңдеу сәтсіз"},
    "Token and new password required": {"ru": "Требуются токен и новый пароль", "kk": "Токен және жаңа құпиясөз қажет"},
    "Invalid or expired token": {"ru": "Недействительный или просроченный токен", "kk": "Токен жарамсыз немесе мерзімі өткен"},
    "Password changed successfully": {"ru": "Пароль успешно изменён", "kk": "Құпиясөз сәтті өзгертілді"},
    "Failed to reset password": {"ru": "Не удалось сбросить пароль", "kk": "Құпиясөзді қалпына келтіру сәтсіз"},
    "Verification token required": {"ru": "Требуется токен подтверждения", "kk": "Растау токені қажет"},
    "Invalid verification token": {"ru": "Недействительный токен подтверждения", "kk": "Растау токені жарамсыз"},
    "Email verified": {"ru": "Email подтверждён", "kk": "Email расталды"},
    "Failed to verify email": {"ru": "Не удалось подтвердить email", "kk": "Email растау сәтсіз"},
    "Password confirmation required": {"ru": "Требуется подтверждение паролем", "kk": "Құпиясөзбен растау қажет"},
    "Wrong password": {"ru": "Неверный пароль", "kk": "Құпиясөз қате"},
    "Account deactivated": {"ru": "Аккаунт деактивирован", "kk": "Тіркелгі өшірілді"},
    "Failed to deactivate account": {"ru": "Не удалось деактивировать аккаунт", "kk": "Тіркелгіні өшіру сәтсіз"},
    "Account deleted": {"ru": "Аккаунт удалён", "kk": "Тіркелгі жойылды"},
    "Failed to delete account": {"ru": "Не удалось удалить аккаунт", "kk": "Тіркелгіні жою сәтсіз"},
    "Unauthorized": {"ru": "Не авторизован", "kk": "Авторизациядан өтпеген"},
    "No data": {"ru": "Данные отсутствуют", "kk": "Деректер жоқ"},
    "productId required": {"ru": "Требуется productId", "kk": "productId қажет"},
    "Product not found": {"ru": "Товар не найден", "kk": "Өнім табылмады"},
    "Order not found": {"ru": "Заказ не найден", "kk": "Тапсырыс табылмады"},
    "Forbidden": {"ru": "Доступ запрещён", "kk": "Қолжетім жоқ"},
    "Claim this order first": {"ru": "Сначала возьмите этот заказ", "kk": "Алдымен бұл тапсырысты өзіңізге алыңыз"},
    "Production only": {"ru": "Только для производства", "kk": "Тек өндіріс үшін"},
    "Order not available": {"ru": "Заказ недоступен", "kk": "Тапсырыс қолжетімсіз"},
    "Already claimed": {"ru": "Уже назначен", "kk": "Бұрыннан тағайындалған"},
    "Not your order": {"ru": "Это не ваш заказ", "kk": "Бұл сіздің тапсырысыңыз емес"},
    "Clients only": {"ru": "Только для клиентов", "kk": "Тек клиенттер үшін"},
    "title required": {"ru": "Требуется название", "kk": "Атауы қажет"},
    "Not found": {"ru": "Не найдено", "kk": "Табылмады"},
    "No file": {"ru": "Файл не передан", "kk": "Файл берілмеді"},
    "Only jpg, png, webp allowed": {"ru": "Разрешены только jpg, png, webp", "kk": "Тек jpg, png, webp рұқсат"},
    "Order not in pending_review": {"ru": "Заказ не в статусе pending_review", "kk": "Тапсырыс pending_review күйінде емес"},
    "Valid price required": {"ru": "Требуется корректная цена", "kk": "Дұрыс баға қажет"},
    "Not ready for payment": {"ru": "Не готов к оплате", "kk": "Төлемге дайын емес"},
    "Invalid status": {"ru": "Неверный статус", "kk": "Күйі қате"},
    "Notification not found": {"ru": "Уведомление не найдено", "kk": "Хабарландыру табылмады"},
    "Marked as read": {"ru": "Помечено как прочитанное", "kk": "Оқылды деп белгіленді"},
    "All notifications marked as read": {"ru": "Все уведомления помечены как прочитанные", "kk": "Барлық хабарландыру оқылды деп белгіленді"},
    "Notification deleted": {"ru": "Уведомление удалено", "kk": "Хабарландыру жойылды"},
    "Preferences saved": {"ru": "Настройки сохранены", "kk": "Баптаулар сақталды"},
    "Incomplete subscription data": {"ru": "Неполные данные подписки", "kk": "Жазылу деректері толық емес"},
    "Subscription saved": {"ru": "Подписка сохранена", "kk": "Жазылым сақталды"},
    "Unsubscribed": {"ru": "Подписка отменена", "kk": "Жазылымнан бас тартылды"},
    "Test notification": {"ru": "Тестовое уведомление", "kk": "Сынақ хабарландыруы"},
    "Push notifications are working!": {"ru": "Push-уведомления работают!", "kk": "Push хабарландырулары жұмыс істеп тұр!"},
    "Test notification sent": {"ru": "Тестовое уведомление отправлено", "kk": "Сынақ хабарландыруы жіберілді"},
    "Admin access required": {"ru": "Требуется доступ администратора", "kk": "Әкімші рұқсаты қажет"},
    "Feedback not found": {"ru": "Обратная связь не найдена", "kk": "Кері байланыс табылмады"},
    "Invalid role": {"ru": "Неверная роль", "kk": "Рөл қате"},
    "email, full_name, password required": {"ru": "Требуются email, full_name, password", "kk": "email, full_name, password қажет"},
    "Password min 6 chars": {"ru": "Минимум 6 символов в пароле", "kk": "Құпиясөз кемі 6 таңба болуы керек"},
    "Email already exists": {"ru": "Email уже существует", "kk": "Email бұрыннан бар"},
    "userId, month, target required": {"ru": "Требуются userId, month, target", "kk": "userId, month, target қажет"},
    "Franchisee not found": {"ru": "Франчайзи не найден", "kk": "Франчайзи табылмады"},
    "Access denied": {"ru": "Доступ запрещён", "kk": "Қолжетім жоқ"},
    "name and price required": {"ru": "Требуются name и price", "kk": "name және price қажет"},
    "Admin only": {"ru": "Только для администратора", "kk": "Тек әкімші үшін"},
    "Missing code or state": {"ru": "Отсутствует code или state", "kk": "code немесе state жоқ"},
    "OAuth callback failed": {"ru": "Ошибка OAuth callback", "kk": "OAuth callback сәтсіз"},
    "Invalid Telegram auth data": {"ru": "Некорректные данные Telegram авторизации", "kk": "Telegram авторизация деректері қате"},
    "Telegram authentication failed": {"ru": "Ошибка авторизации Telegram", "kk": "Telegram авторизациясы сәтсіз"},
    "Invalid state": {"ru": "Недействительный state", "kk": "state жарамсыз"},
    "This OAuth account is already linked to another user": {
        "ru": "Этот OAuth-аккаунт уже привязан к другому пользователю",
        "kk": "Бұл OAuth тіркелгісі басқа пайдаланушыға байланыстырылған",
    },
    "Failed to link OAuth account": {"ru": "Не удалось привязать OAuth-аккаунт", "kk": "OAuth тіркелгісін байланыстыру сәтсіз"},
    "Provider not linked": {"ru": "Провайдер не привязан", "kk": "Провайдер байланыстырылмаған"},
    "Cannot unlink OAuth without a password set": {
        "ru": "Нельзя отвязать OAuth без установленного пароля",
        "kk": "Құпиясөз орнатылмайынша OAuth-ты ажырату мүмкін емес",
    },
    "Failed to unlink OAuth account": {"ru": "Не удалось отвязать OAuth-аккаунт", "kk": "OAuth тіркелгісін ажырату сәтсіз"},
    "Message too short": {"ru": "Сообщение слишком короткое", "kk": "Хабарлама тым қысқа"},
    "Message too long (max 2000 chars)": {"ru": "Сообщение слишком длинное (макс. 2000 символов)", "kk": "Хабарлама тым ұзын (ең көбі 2000 таңба)"},
    "Failed to send feedback": {"ru": "Не удалось отправить обратную связь", "kk": "Кері байланысты жіберу сәтсіз"},
    "Challenge expired or not found": {"ru": "Challenge просрочен или не найден", "kk": "Challenge мерзімі өткен немесе табылмады"},
    "Credential already registered": {"ru": "Ключ уже зарегистрирован", "kk": "Кілт бұрыннан тіркелген"},
    "Credential registered": {"ru": "Ключ зарегистрирован", "kk": "Кілт тіркелді"},
    "No biometric credentials registered": {"ru": "Биометрические ключи не зарегистрированы", "kk": "Биометриялық кілттер тіркелмеген"},
    "Credential data required": {"ru": "Требуются данные ключа", "kk": "Кілт деректері қажет"},
    "Credential not found": {"ru": "Ключ не найден", "kk": "Кілт табылмады"},
    "Credential deleted": {"ru": "Ключ удалён", "kk": "Кілт жойылды"},
    "Validation error": {"ru": "Ошибка валидации", "kk": "Валидация қатесі"},
    "JWT Error": {"ru": "JWT қатесі", "kk": "JWT қатесі"},
    "Token expired": {"ru": "Токен истёк", "kk": "Токен мерзімі өтті"},
    "Invalid token": {"ru": "Недействительный токен", "kk": "Токен жарамсыз"},
    "Authorization required": {"ru": "Требуется авторизация", "kk": "Авторизация қажет"},
    "API is alive": {"ru": "API работает", "kk": "API жұмыс істеп тұр"},
    "auth": {"ru": "регистрация и вход", "kk": "тіркелу және кіру"},
    "OAuth": {"ru": "OAuth", "kk": "OAuth"},
}


_DIRECT_BY_LANG = {"ru": {}, "kk": {}}
for source, translated in _BASE_TRANSLATIONS.items():
    _DIRECT_BY_LANG["ru"][source] = translated["ru"]
    _DIRECT_BY_LANG["kk"][source] = translated["kk"]
    _DIRECT_BY_LANG["kk"][translated["ru"]] = translated["kk"]


_DYNAMIC_RULES = [
    (
        re.compile(r"^User\s+(\d+)\s+deactivated$", re.IGNORECASE),
        lambda m, lang: f"Пользователь {m.group(1)} деактивирован" if lang == "ru" else f"Пайдаланушы {m.group(1)} өшірілді",
    ),
    (
        re.compile(r"^User\s+(\d+)\s+activated$", re.IGNORECASE),
        lambda m, lang: f"Пользователь {m.group(1)} активирован" if lang == "ru" else f"Пайдаланушы {m.group(1)} белсендірілді",
    ),
    (
        re.compile(r"^Deleted\s+(\d+)\s+notifications$", re.IGNORECASE),
        lambda m, lang: f"Удалено уведомлений: {m.group(1)}" if lang == "ru" else f"Жойылған хабарландыру саны: {m.group(1)}",
    ),
    (
        re.compile(r"^Unsupported provider:\s*(.+)$", re.IGNORECASE),
        lambda m, lang: f"Неподдерживаемый провайдер: {m.group(1)}" if lang == "ru" else f"Қолдау көрсетілмейтін провайдер: {m.group(1)}",
    ),
    (
        re.compile(r"^OAuth error:\s*(.+)$", re.IGNORECASE),
        lambda m, lang: f"Ошибка OAuth: {m.group(1)}" if lang == "ru" else f"OAuth қатесі: {m.group(1)}",
    ),
    (
        re.compile(r"^(.+?)\s+account\s+linked$", re.IGNORECASE),
        lambda m, lang: f"Аккаунт {m.group(1)} привязан" if lang == "ru" else f"{m.group(1)} тіркелгісі байланыстырылды",
    ),
    (
        re.compile(r"^(.+?)\s+account\s+unlinked$", re.IGNORECASE),
        lambda m, lang: f"Аккаунт {m.group(1)} отвязан" if lang == "ru" else f"{m.group(1)} тіркелгісі ажыратылды",
    ),
    (
        re.compile(r"^Cannot transition\s+(.+?)\s+→\s+(.+?)(?:\s+as\s+(.+))?$", re.IGNORECASE),
        lambda m, lang: (
            f"Нельзя изменить статус {m.group(1)} → {m.group(2)}" + (f" для роли {m.group(3)}" if m.group(3) else "")
            if lang == "ru"
            else f"{m.group(1)} күйінен {m.group(2)} күйіне ауыстыруға болмайды" + (f" ({m.group(3)} рөлі үшін)" if m.group(3) else "")
        ),
    ),
    (
        re.compile(r"^Invalid status\.\s*Valid:\s*(.+)$", re.IGNORECASE),
        lambda m, lang: f"Неверный статус. Допустимые: {m.group(1)}" if lang == "ru" else f"Күй қате. Рұқсат етілгендері: {m.group(1)}",
    ),
    (
        re.compile(r"^Verification failed:\s*(.+)$", re.IGNORECASE),
        lambda m, lang: f"Проверка не пройдена: {m.group(1)}" if lang == "ru" else f"Тексеру сәтсіз: {m.group(1)}",
    ),
    (
        re.compile(r"^Authentication failed:\s*(.+)$", re.IGNORECASE),
        lambda m, lang: f"Аутентификация не пройдена: {m.group(1)}" if lang == "ru" else f"Аутентификация сәтсіз: {m.group(1)}",
    ),
]


def detect_language(default="ru"):
    raw = (
        request.args.get("lang")
        or request.headers.get("X-Language")
        or request.headers.get("Accept-Language")
        or default
    )
    raw = (raw or "").lower()
    if "kk" in raw or "kz" in raw:
        return "kk"
    if "ru" in raw:
        return "ru"
    return default if default in SUPPORTED_LANGS else "ru"


def translate_text(value, lang):
    if not isinstance(value, str):
        return value
    if lang not in SUPPORTED_LANGS:
        return value

    direct = _DIRECT_BY_LANG[lang].get(value)
    if direct:
        return direct

    for pattern, formatter in _DYNAMIC_RULES:
        match = pattern.match(value)
        if match:
            return formatter(match, lang)

    return value


def translate_payload(payload, lang):
    if isinstance(payload, dict):
        out = {}
        for key, val in payload.items():
            if key in {"error", "message", "title", "body", "detail"} and isinstance(val, str):
                out[key] = translate_text(val, lang)
            else:
                out[key] = translate_payload(val, lang)
        return out
    if isinstance(payload, list):
        return [translate_payload(item, lang) for item in payload]
    return payload
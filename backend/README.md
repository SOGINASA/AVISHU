# Backend

Flask REST API — универсальный бэкенд-шаблон с авторизацией, уведомлениями и WebSocket.

## Стек

- **Flask 3.1** + Flask-SQLAlchemy + Flask-Migrate
- **JWT** (Flask-JWT-Extended) — access (24ч) + refresh (30д) токены
- **OAuth** — Google, GitHub, Telegram Login Widget
- **WebAuthn** — биометрическая аутентификация (Face ID, Touch ID, ключи безопасности)
- **WebSocket** — real-time уведомления через Flask-Sock
- **Web Push** — браузерные push-уведомления (VAPID / pywebpush)
- **APScheduler** — фоновые задачи по расписанию
- **SQLite** (dev) / **PostgreSQL** (prod)

---

## Структура

```
backend/
├── app.py                        # App factory, WebSocket endpoint, CLI команды
├── config.py                     # Конфигурация (dev / test / prod через .env)
├── models.py                     # SQLAlchemy модели
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
│
├── routes/
│   ├── __init__.py
│   ├── auth.py                   # Email/nickname регистрация и вход
│   ├── oauth.py                  # OAuth (Google, GitHub, Telegram)
│   ├── webauthn.py               # Биометрическая аутентификация
│   ├── notifications.py          # CRUD уведомлений, Web Push подписки
│   ├── feedback.py               # Обратная связь от пользователей
│   └── admin.py                  # Панель администратора
│
├── services/
│   ├── __init__.py
│   ├── oauth_service.py          # Провайдеры Google / GitHub
│   ├── websocket_service.py      # Thread-safe реестр WS-соединений
│   ├── push_service.py           # Web Push + create_and_push_notification()
│   ├── scheduler_service.py      # APScheduler с file-lock для воркеров
│   ├── auth_logger.py            # AuditLog для auth-событий
│   └── telegram_service.py       # Верификация Telegram Login Widget
│
└── utils/
    └── request_helpers.py        # IP-адрес, User-Agent парсинг
```

---

## Модели БД

| Модель                   | Назначение                                      |
|--------------------------|-------------------------------------------------|
| `User`                   | Пользователь (email/nickname, OAuth, профиль)   |
| `WebAuthnCredential`     | Биометрические учётные данные                   |
| `WebAuthnChallenge`      | Одноразовые challenge'ы (TTL 5 мин)             |
| `AuditLog`               | Лог auth-событий (IP, браузер, статус)          |
| `PushSubscription`       | Web Push подписки устройств                     |
| `Notification`           | Уведомления пользователя                        |
| `NotificationPreference` | Настройки уведомлений пользователя              |
| `Feedback`               | Обратная связь                                  |

---

## API эндпоинты

### Auth — `/api/auth`

| Метод  | Путь                  | Описание                        | Auth |
|--------|-----------------------|---------------------------------|------|
| POST   | `/register`           | Регистрация (email или nickname) | —    |
| POST   | `/login`              | Вход                            | —    |
| POST   | `/refresh`            | Обновить access-токен           | JWT refresh |
| GET    | `/me`                 | Текущий пользователь            | JWT  |
| PUT    | `/profile`            | Обновить профиль                | JWT  |
| POST   | `/change-password`    | Сменить пароль                  | JWT  |
| POST   | `/forgot-password`    | Запрос сброса пароля            | —    |
| POST   | `/reset-password`     | Сброс пароля по токену          | —    |
| POST   | `/verify-email`       | Подтверждение email             | —    |
| POST   | `/deactivate`         | Деактивировать аккаунт          | JWT  |
| DELETE | `/deactivate`         | Удалить аккаунт                 | JWT  |

### OAuth — `/api/auth/oauth`

| Метод  | Путь                    | Описание                            | Auth |
|--------|-------------------------|-------------------------------------|------|
| GET    | `/start/<provider>`     | Получить URL авторизации            | —    |
| GET    | `/callback/<provider>`  | OAuth callback → редирект на фронт  | —    |
| POST   | `/telegram`             | Вход через Telegram Login Widget    | —    |
| POST   | `/link/<provider>`      | Привязать OAuth к аккаунту          | JWT  |
| DELETE | `/unlink/<provider>`    | Отвязать OAuth                      | JWT  |
| GET    | `/accounts`             | Список привязанных OAuth            | JWT  |

Поддерживаемые `provider`: `google`, `github`, `telegram`

### WebAuthn — `/api/auth/webauthn`

| Метод  | Путь                        | Описание                          | Auth |
|--------|-----------------------------|-----------------------------------|------|
| POST   | `/register-options`         | Сгенерировать options для регистрации | JWT |
| POST   | `/register`                 | Сохранить учётные данные          | JWT  |
| POST   | `/authenticate-options`     | Сгенерировать options для входа   | —    |
| POST   | `/authenticate`             | Верифицировать и выдать токены    | —    |
| GET    | `/credentials`              | Список устройств пользователя     | JWT  |
| DELETE | `/credentials/<id>`         | Удалить устройство                | JWT  |

### Notifications — `/api/notifications`

| Метод  | Путь                        | Описание                             | Auth |
|--------|-----------------------------|--------------------------------------|------|
| GET    | `/get`                      | История уведомлений (с пагинацией)   | JWT  |
| GET    | `/unread-count`             | Количество непрочитанных             | JWT  |
| POST   | `/read/<id>`                | Отметить прочитанным                 | JWT  |
| POST   | `/read-all`                 | Отметить все прочитанными            | JWT  |
| DELETE | `/<id>`                     | Удалить уведомление                  | JWT  |
| DELETE | `/delete-all`               | Удалить все уведомления              | JWT  |
| GET    | `/preferences`              | Настройки уведомлений                | JWT  |
| PUT    | `/preferences`              | Сохранить настройки                  | JWT  |
| POST   | `/subscribe`                | Сохранить Web Push подписку          | JWT  |
| DELETE | `/unsubscribe`              | Удалить Web Push подписку            | JWT  |
| GET    | `/vapid-key`                | Публичный VAPID ключ                 | —    |
| POST   | `/test`                     | Отправить тестовое уведомление       | JWT  |

### Feedback — `/api/feedback`

| Метод | Путь    | Описание             | Auth |
|-------|---------|----------------------|------|
| POST  | `/send` | Отправить фидбэк     | JWT  |

### Admin — `/api/admin`

| Метод | Путь                          | Описание                    | Auth  |
|-------|-------------------------------|-----------------------------|-------|
| GET   | `/users`                      | Список пользователей        | Admin |
| GET   | `/users/<id>`                 | Данные пользователя         | Admin |
| POST  | `/users/<id>/deactivate`      | Деактивировать пользователя | Admin |
| POST  | `/users/<id>/activate`        | Активировать пользователя   | Admin |
| GET   | `/feedback`                   | Список фидбэков             | Admin |
| POST  | `/feedback/<id>/read`         | Отметить фидбэк прочитанным | Admin |
| GET   | `/audit-logs`                 | Audit log                   | Admin |
| GET   | `/stats`                      | Статистика (юзеры, фидбэк)  | Admin |

### WebSocket — `/ws/notifications`

Подключение: `ws://host/ws/notifications?token=<access_token>`

```json
// Сервер → клиент
{ "type": "notification", "payload": { ...notification } }
{ "type": "unread_count", "payload": { "count": 3 } }
{ "type": "ping" }

// Клиент → сервер
{ "type": "ping" }
{ "type": "pong" }
```

---

## Установка и запуск

### Локально

```bash
cd backend

python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Заполните .env своими значениями

flask db init
flask db migrate -m "init"
flask db upgrade

python app.py
# API: http://localhost:5000/api
```

### Docker

```bash
cd backend
cp .env.example .env
# Заполните .env

docker-compose up --build
# API: http://localhost:5000/api
```

---

## Конфигурация (.env)

| Переменная           | Описание                                      | Обязательно |
|----------------------|-----------------------------------------------|-------------|
| `SECRET_KEY`         | Flask secret key                              | Prod        |
| `JWT_SECRET_KEY`     | JWT подпись                                   | Prod        |
| `DATABASE_URL`       | URL базы данных (SQLite или PostgreSQL)       | —           |
| `CORS_ORIGINS`       | Допустимые origins через запятую              | —           |
| `FRONTEND_URL`       | URL фронтенда (для OAuth редиректов)          | OAuth       |
| `GOOGLE_CLIENT_ID`   | Google OAuth Client ID                        | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret                  | OAuth Google |
| `GITHUB_CLIENT_ID`   | GitHub OAuth Client ID                        | OAuth GitHub |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret                  | OAuth GitHub |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота                           | Telegram    |
| `WEBAUTHN_RP_ID`     | WebAuthn Relying Party ID (домен)             | WebAuthn    |
| `WEBAUTHN_ORIGIN`    | WebAuthn origin (URL фронтенда)               | WebAuthn    |
| `VAPID_PRIVATE_KEY`  | VAPID приватный ключ                          | Web Push    |
| `VAPID_PUBLIC_KEY`   | VAPID публичный ключ                          | Web Push    |
| `VAPID_CLAIMS_EMAIL` | Email для VAPID claims                        | Web Push    |

Сгенерировать VAPID ключи:
```bash
flask generate-vapid
```

---

## Добавление новых scheduled задач

Откройте [services/scheduler_service.py](services/scheduler_service.py) и добавьте job в `init_scheduler()`:

```python
scheduler.add_job(
    func=my_task,
    trigger='cron',
    hour=9, minute=0,   # каждый день в 09:00
    args=[app],
    id='my_task',
    max_instances=1,
)
```

---

## Отправка уведомлений из кода

```python
from services.push_service import create_and_push_notification

# Создаёт запись в БД + отправляет через WebSocket + Web Push (если подписан)
create_and_push_notification(
    user_id=user.id,
    title='Заголовок',
    body='Текст уведомления',
    category='system',      # system | alert | reminder | update | security
)
```

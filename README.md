# AVISHU — Premium Fashion Platform

Мобильное и веб-приложение для управления ателье: каталог товаров, заказы, индивидуальный пошив, аналитика и ML-прогнозирование спроса.

## Структура проекта

```
AVISHU/
├── backend/          # Flask API (Python 3.11+)
├── frontend/         # React + Capacitor (Android/iOS)
├── ml/               # ML-модель прогнозирования спроса
└── docker-compose.yml
```

## Требования

| Компонент | Версия |
|-----------|--------|
| Node.js   | 18+    |
| npm       | 9+     |
| Python    | 3.11+  |
| Android Studio | Hedgehog+ (для Android-сборки) |
| Xcode     | 15+ (для iOS-сборки, только macOS) |
| CocoaPods | 1.14+ (для iOS) |

---

## 1. Клонирование репозитория

```bash
git clone https://github.com/<your-username>/AVISHU.git
cd AVISHU
```

---

## 2. Запуск бэкенда

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Создайте файл `backend/.env` (опционально):

```env
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin
ADMIN_FULL_NAME=Administrator
```

Запуск:

```bash
python app.py
```

Сервер стартует на `http://localhost:8000`. При первом запуске автоматически создаётся база данных и загружаются тестовые данные (seed).

**Тестовые аккаунты:**

| Роль | Email | Пароль |
|------|-------|--------|
| Клиент | client@avishu.kz | demo1234 |
| Франчайзи | partner@avishu.kz | demo1234 |
| Производство | workshop@avishu.kz | demo1234 |
| Админ | admin@gmail.com | admin |

---

## 3. Запуск веб-версии (npm start)

```bash
cd frontend
npm install
npm start
```

Откроется `http://localhost:3000`. Убедитесь, что бэкенд запущен на порту 8000.

Для продакшн-сборки:

```bash
npm run build
```

Собранные файлы окажутся в `frontend/build/`.

---

## 4. Сборка Android-приложения

### Подготовка

1. Установите [Android Studio](https://developer.android.com/studio)
2. В Android Studio установите SDK 36 (через SDK Manager)
3. Убедитесь, что `ANDROID_HOME` / `ANDROID_SDK_ROOT` настроен

### Сборка

```bash
cd frontend

# Установка зависимостей и сборка веб-версии
npm install
npm run build

# Синхронизация с нативным проектом
npx cap sync android

# Открыть в Android Studio
npx cap open android
```

В Android Studio:

1. Дождитесь окончания Gradle Sync
2. Подключите устройство или запустите эмулятор
3. Нажмите **Run ▶** (или `Shift + F10`)

### Запуск напрямую из терминала

```bash
npx cap run android
```

### Параметры сборки

- **Package:** `kz.avishu.app`
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 36

---

## 5. Сборка iOS-приложения (только macOS)

### Подготовка

1. Установите [Xcode](https://apps.apple.com/app/xcode/id497799835) 15+
2. Установите CocoaPods:
   ```bash
   sudo gem install cocoapods
   ```
3. Настройте Apple Developer аккаунт в Xcode → Settings → Accounts

### Сборка

```bash
cd frontend

# Установка зависимостей и сборка веб-версии
npm install
npm run build

# Синхронизация с нативным проектом
npx cap sync ios

# Установка CocoaPods зависимостей
cd ios/App
pod install
cd ../..

# Открыть в Xcode
npx cap open ios
```

В Xcode:

1. Выберите **App** в навигаторе проекта
2. Во вкладке **Signing & Capabilities** выберите свой Team и Bundle Identifier
3. Выберите целевое устройство (симулятор или физическое)
4. Нажмите **Run ▶** (`Cmd + R`)

### Запуск напрямую из терминала

```bash
npx cap run ios
```

### Параметры сборки

- **Bundle ID:** `kz.avishu.app`
- **Display Name:** AVISHU
- **Deployment Target:** iOS 16+

---

## 6. ML-модуль (опционально)

Прогнозирование спроса на товары.

```bash
cd ml
pip install -r requirements.txt

# Генерация датасета
python generate_dataset.py

# Обучение модели
python model.py train

# Прогноз дефицита
python model.py predict --top 15
```

ML-модель автоматически используется в аналитике франчайзи (раздел «Прогноз спроса»).

---

## 7. Docker (продакшн)

```bash
docker-compose up -d --build
```

Бэкенд будет доступен на `http://localhost:5000`.

---

## Подключение мобильного приложения к серверу

По умолчанию фронтенд обращается к `http://localhost:8000`. Для подключения мобильного устройства к серверу на вашем компьютере:

1. Узнайте IP компьютера в локальной сети (например `192.168.1.100`)
2. Создайте файл `frontend/.env`:
   ```env
   REACT_APP_API_URL=http://192.168.1.100:8000
   ```
3. Пересоберите и синхронизируйте:
   ```bash
   npm run build
   npx cap sync android   # или ios
   ```

---

## Полезные команды

| Команда | Описание |
|---------|----------|
| `npm start` | Запуск фронтенда в dev-режиме |
| `npm run build` | Продакшн-сборка фронтенда |
| `npx cap sync` | Синхронизация веб-сборки с нативными проектами |
| `npx cap open android` | Открыть проект в Android Studio |
| `npx cap open ios` | Открыть проект в Xcode |
| `npx cap run android` | Запустить на Android-устройстве |
| `npx cap run ios` | Запустить на iOS-устройстве |
| `python app.py` | Запуск бэкенда |

---

## Технологии

**Frontend:** React 19, Zustand, TailwindCSS, Framer Motion, i18next, Capacitor 8

**Backend:** Flask, SQLAlchemy, Flask-JWT-Extended, Flask-Sock (WebSocket), APScheduler

**ML:** scikit-learn (GradientBoosting), pandas, numpy

**Mobile:** Capacitor (Android SDK 36, iOS 16+), Biometric Auth

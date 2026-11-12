# DriveGo

Учебный каршеринг: React/Vite + FastAPI + SQLAlchemy/PostgreSQL.
Существующие маршруты: /, /cars, /cars/:id, /profile; добавлены /login и /register.
Все автомобили пока используют исходную фотографию camry.jpg.

## Локальный запуск (PowerShell)

Нужны Node.js 22.12+ (или 24+) и полноценный Python 3.11+, PostgreSQL.
Старый backend/venv может ссылаться на отсутствующий Python: создайте новое окружение.

1. Создайте в PostgreSQL отдельного пользователя и базу drivego с паролем.
2. Выполните из корня:
   
   cd backend
   py -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   Copy-Item .env.example .env

3. Укажите реальный DATABASE_URL в backend/.env. Спецсимволы пароля в URL должны быть URL-encoded.
4. Запустите из backend:

   .\.venv\Scripts\python.exe -m uvicorn main:app --reload

5. В другом терминале из корня:

   cd frontend
   Copy-Item .env.example .env
   npm.cmd ci
   npm.cmd run dev

Frontend: http://localhost:5173. API/Swagger: http://127.0.0.1:8000/docs.
Таблицы и четыре исходных автомобиля создаются при первом старте. Данные сохраняются после перезапуска.
create_all создаёт отсутствующие таблицы; для будущих изменений схемы потребуются миграции.

## Поведение

Зарегистрируйтесь (пароль 8–128 символов), выберите автомобиль и даты, оформите бронь.
Личный кабинет показывает только ваши бронирования; отменённые остаются в истории.
Сутки считаются как разница дат: 15–18 ноября = 3 дня. Дата возврата не включается.
Смежные брони разрешены, пересекающиеся активные запрещены; цена рассчитывается сервером.
Дата начала проверяется в часовом поясе Asia/Oral.
PostgreSQL блокирует строку автомобиля перед проверкой пересечений, чтобы параллельные запросы не создали две брони.
Пароли хранятся как scrypt-хеш с индивидуальной солью.
В БД хранится только SHA-256 случайного токена сессии; срок — 7 дней, выход отзывает сессию.
Токен браузера находится в sessionStorage: вход сохраняется при обновлении вкладки.
Восстановление пароля, подтверждение email, оплата и админ-панель не реализованы.
Перед коммерческим использованием нужны ограничение частоты входа, мониторинг и резервное копирование.

## API

- GET / — проверка приложения и подключения к БД
- GET /cars, GET /cars/{id}
- POST /auth/register, POST /auth/login — JSON email, password
- GET /auth/me, POST /auth/logout
- GET /bookings — только текущий пользователь
- POST /bookings — JSON car_id, start_date, finish_date (YYYY-MM-DD)
- POST /bookings/{id}/cancel — только владелец
Защищённые запросы: Authorization: Bearer <token>.
Ошибки: 401 — вход, 404 — отсутствующий ресурс, 409 — пересечение/email, 422 — неверные данные.

## Render

1. Загрузите репозиторий на GitHub без .env, окружений и зависимостей.
2. Создайте Render PostgreSQL и Web Service из репозитория.
3. Root Directory: backend; Runtime: Python; Build Command: pip install -r requirements.txt
4. Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
5. DATABASE_URL: Internal Database URL вашей базы (в том же регионе).
6. CORS_ORIGINS: точный HTTPS-адрес Vercel без завершающего /; несколько адресов через запятую.
7. Health Check Path: /.
8. Откройте публичные / и /cars после успешного запуска.
Бесплатные сервисы могут засыпать; первый запрос после простоя может потребовать повторения.

## Vercel

1. Импортируйте тот же репозиторий. Root Directory: frontend; Framework: Vite.
2. Install: npm ci; Build: npm run build; Output: dist.
3. VITE_API_URL: публичный HTTPS-адрес Render без завершающего /.
4. Выполните Deploy. После смены переменной нужен новый Deploy.
5. Запишите окончательный адрес Vercel в CORS_ORIGINS Render.
frontend/vercel.json перенаправляет прямые переходы React Router на index.html.
Не указывайте localhost в production и не помещайте секреты в VITE_*: они публичны.

Официальные инструкции:
https://render.com/docs/deploy-fastapi
https://vercel.com/docs/frameworks/frontend/vite

## Проверки

Frontend: npm.cmd run build и npm.cmd run lint из frontend.
Backend: установите pip install -r requirements-dev.txt, затем из backend:
python -m pytest -q
Тесты используют временную SQLite для последовательных сценариев.
Для проверки блокировок и постоянного хранения на PostgreSQL:
задайте TEST_DATABASE_URL для ОТДЕЛЬНОЙ пустой тестовой базы, затем запустите pytest.
Тесты пересоздают таблицы только в указанной тестовой БД! Не используйте рабочую базу.

Перед сдачей проверьте на публичных адресах:
регистрация → каталог → автомобиль → бронь → кабинет → обновление страницы → отмена.
Во втором аккаунте чужие брони не должны отображаться; занятые даты должны возвращать 409.
Публикация требует ваших аккаунтов и создания сервисов; наличие конфигурации не означает публикацию.

## Результат проверки 11 ноября 2026

- npm.cmd run build — успешно.
- npm.cmd run lint — без замечаний.
- 3 API-теста на отдельной PostgreSQL 18 — успешно: основной сценарий, конкурентная бронь, повторный запуск и CORS.
- В тестовом стеке есть предупреждение Starlette об устаревании httpx; на результат проверок не влияет.
- Интерактивная проверка интерфейса в браузере и публичных адресов ещё не выполнена.
- Тестовый сервер PostgreSQL остановлен; локальная рабочая база и .env пользователем ещё не настроены.

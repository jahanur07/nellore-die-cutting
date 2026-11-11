# Nellore Die Cutting deployment

## Required production setup

Deploy the React frontend and Django backend as separate services, with a
persistent database and persistent media storage. SQLite is suitable for local
development only; production should use PostgreSQL (or another persistent
database) and object storage for uploaded files in `backend/media/`.

### Backend

1. Set the environment variables in `backend/.env.example`.
2. Install dependencies with `pip install -r backend/requirements.txt`.
3. Run migrations and collect static files:

   ```sh
   python backend/manage.py migrate
   python backend/manage.py collectstatic --noinput
   ```

4. Start the service with:

   ```sh
   gunicorn --chdir backend backend.wsgi:application
   ```

5. Create the first production administrator on the server:

   ```sh
   python backend/manage.py createsuperuser
   ```

The backend must be served over HTTPS. Configure the host platform or reverse
proxy to route `/api/*`, `/admin/*`, `/static/*`, and `/media/*` to Django.

### Frontend

1. Copy `frontend/.env.example` to the host's environment settings.
2. Set `VITE_API_URL` to the public backend API URL ending in `/api`.
3. Build and serve the app:

   ```sh
   cd frontend
   npm ci
   npm run build
   ```

The hosting platform should serve `frontend/dist` and redirect unknown client
routes to `index.html`.

## Before go-live

- Configure a persistent production database; do not deploy the local
  `backend/db.sqlite3`.
- Configure persistent media storage and verify logo/file uploads.
- Set production secrets in the hosting provider, never in Git.
- Add the final frontend and API domains to `DJANGO_ALLOWED_HOSTS`,
  `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS`.
- Run `python backend/manage.py check --deploy` and test login, billing,
  reports, password reset, and file uploads against the production services.

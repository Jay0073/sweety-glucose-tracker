# Sweety

Sweety is a small blood glucose journal for diabetes patients. A patient can record up to four readings per day, add context to each check-in, manage previous readings, and review daily, month-to-date, and previous-month reports.

The mobile-friendly interface is designed for a short repeated task: the next empty time slot is selected automatically, the value field is prominent, and a completed slot can be opened directly for editing.

## Features

- Register and log in with a bcrypt-hashed password and JWT authentication.
- Keep every reading scoped to its authenticated user.
- Add, view, edit, and delete readings in four fixed daily slots.
- Attach an optional note to a reading for useful context such as meals, medicine, exercise, illness, or stress.
- Enforce value, date, duplicate-slot, and four-per-day rules in the API and database.
- View daily, month-to-date, and complete previous-month statistics.
- See a compact highest, lowest, one-decimal average, and count summary without decorative status judgments.
- Compare the daily profile, day-by-day averages, time-slot averages, and logging consistency without mixing unlike readings into one trend.
- Review a lightweight month-so-far summary directly below the daily check-in workflow.
- Export the current report as CSV, print or save it as PDF, and export the user's complete history.
- Use an in-app date picker, edit/delete controls, confirmation dialog, and generated profile avatar on desktop or mobile.
- Paginate the complete reading history through the API.
- Start PostgreSQL, the API, and the client with Docker Compose.
- Run meaningful backend integration tests plus React form and report-transition tests.

## Screenshots

| Fast daily check-in | Month-to-date report | Mobile month-to-date |
|---|---|---|
| ![Daily readings dashboard](docs/screenshots/dashboard.png) | ![Month-to-date glucose report](docs/screenshots/reports.png) | ![Mobile month-to-date glucose report](docs/screenshots/mobile-reports.png) |

The login and registration experience is shown in [the authentication screenshot](docs/screenshots/login.png).

## Technology

- React 19 and Vite
- Recharts and React DayPicker
- Node.js and Express 5
- PostgreSQL with `pg` and parameterized SQL
- bcrypt and JSON Web Tokens
- Node test runner, Supertest, Vitest, and React Testing Library

The assignment title mentions MERN and PostgreSQL. This implementation follows the email body and uses PostgreSQL while retaining React and Node.js from the MERN stack.

## Run with Docker

Requirements: Docker Desktop with Docker Compose.

1. Copy `.env.example` to `.env` and replace `JWT_SECRET` with a long random value.
2. Start the application:

   ```bash
   docker compose up --build
   ```

3. In another terminal, create the demo account and readings:

   ```bash
   docker compose exec server node src/db/seed.js
   ```

4. Open `http://localhost:5173`.

The API is available at `http://localhost:4000/api`; its health endpoint is `GET /api/health`. PostgreSQL is exposed on host port `5433` to avoid conflicts with an existing local PostgreSQL installation.

Demo credentials:

```text
Email: demo@sweety.local
Password: Sweety123!
```

The seed is repeatable. Running it again replaces only the demo user and recreates deterministic sample history across the current and previous month, including complete days, missed check-ins, varied glucose values, and contextual notes. This gives every report and chart meaningful data immediately.

## Run locally

Requirements: Node.js 20 or later, npm, and PostgreSQL. The Docker database can be used with the local Node processes.

```bash
npm install
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

The server runs at `http://localhost:4000` and the Vite client at `http://localhost:5173`.

## Environment variables

Copy `.env.example` to `.env`. No real secret is committed.

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | Express server port | `4000` |
| `NODE_ENV` | Runtime environment | `development` |
| `DATABASE_URL` | Main PostgreSQL connection | `postgresql://sweety:sweety@127.0.0.1:5433/sweety` |
| `TEST_DATABASE_URL` | Isolated test database | `postgresql://sweety:sweety@127.0.0.1:5433/sweety_test` |
| `JWT_SECRET` | Signs authentication tokens | A long random string |
| `CLIENT_URL` | Allowed browser origin | `http://localhost:5173` |
| `APP_TIME_ZONE` | Server date used for future-date validation | `Asia/Kolkata` |
| `VITE_API_URL` | API base URL exposed to the client | `http://localhost:4000/api` |

## Database setup

The schema is in `server/src/db/schema.sql`. Run:

```bash
npm run db:migrate
```

It creates `users` and `readings`, including:

- a foreign key from readings to users with cascade deletion;
- a check constraint for the four allowed slots;
- a check constraint for values from 40 through 600;
- an optional note limited to 500 characters;
- `UNIQUE (user_id, reading_date, slot)` as the final duplicate-slot safeguard.

Docker creates both `sweety` and `sweety_test` databases the first time its PostgreSQL volume is initialized.

## Tests

Start the Docker database, then run:

```bash
npm test
```

The backend tests truncate only `sweety_test`. They cover password hashing, duplicate accounts, all specified reading rules, notes, a full-day edit, cross-user isolation, pagination and export isolation, report calculations, empty reports, and the January-to-December boundary. The frontend tests cover required and range errors, create and edit requests with notes, rapid report-tab transitions, direct month-report navigation, daily aggregation, and time-slot averages.

Useful individual commands:

```bash
npm run test --workspace server
npm run test --workspace client
npm run build
```

## API

Except for health, registration, and login, routes require `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Service health |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Log in |
| `GET` | `/api/auth/me` | Verify a session |
| `GET` | `/api/readings?date=YYYY-MM-DD` | Read one day |
| `GET` | `/api/readings?page=1&limit=20` | Paginated history |
| `GET` | `/api/readings/export` | Complete authenticated-user history |
| `POST` | `/api/readings` | Add a reading |
| `PATCH` | `/api/readings/:id` | Edit a reading |
| `DELETE` | `/api/readings/:id` | Delete a reading |
| `GET` | `/api/reports/daily?date=YYYY-MM-DD` | Selected-day report |
| `GET` | `/api/reports/month-to-date?date=YYYY-MM-DD` | First of month through selected date |
| `GET` | `/api/reports/monthly?date=YYYY-MM-DD` | Complete month before selected date |

Report responses include `from`, `to`, `highest`, `lowest`, `average`, `count`, and the ordered readings for that range. The client uses the same response to render statistics, a trend chart, a consistency calendar, and exports without duplicating report calculations.

## Project structure

```text
client/src/
  components/        React screens and focused UI components
  api.js              Fetch wrapper and API errors
  readingConfig.js    Shared slot labels and date formatting
server/src/
  routes/             API route definitions
  controllers/        HTTP request and response handling
  services/           Validation, business rules, and SQL
  middleware/         JWT authentication
  db/                 Pool, schema, migration, and seed
server/test/           API integration tests
```

The server follows `routes → controllers → services → PostgreSQL`. Reading creation and editing use the same field and daily-rule validation.

## Notes and assumptions

- Passwords must contain at least six characters because the assignment does not state a password rule.
- Invalid or missing dates use `Please pick a valid date.` and invalid slots use `Please pick a time slot.` These supplement the five messages supplied in the assignment.
- Future-date validation uses `APP_TIME_ZONE`, defaulting to `Asia/Kolkata`. The browser prevents a future selection, while the API remains authoritative.
- A report date also cannot be in the future.
- Notes are optional plain text and are limited to 500 characters. They provide context for later review but are not interpreted as medical advice.
- JWT bearer authentication was chosen because it is easy to inspect and exercise through the UI, curl, or an API client. For a production health application, I would prefer short-lived access tokens delivered through secure, httpOnly cookies with the corresponding CSRF protection.
- The average is calculated by PostgreSQL and returned as a number; the UI always renders one decimal place.
- The four-slot database check and unique constraint make more than four valid readings structurally impossible. The service still returns the explicit four-per-day message when the day is full.
- The consistency calendar measures logging completeness only; it deliberately does not label a glucose value as good or bad.

With more time, I would add email verification and password recovery, login rate limiting, per-user time zones, versioned migrations, audit history for edited health data, configurable clinical target ranges reviewed by a qualified professional, automated accessibility checks, deployment CI, and production monitoring.

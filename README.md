# Forex CRM — Wallet-to-Trading-Account Transfers

## Overview

A Laravel application with a React/Inertia frontend demonstrating client wallets, trading accounts, and a transfer lifecycle backed by a provider simulator.

The transfer service reserves funds before calling the provider. A confirmed success finalizes the transfer, a definitive failure releases the reservation, and an uncertain provider response leaves the transfer pending for reconciliation.

**This is a prototype, not a production brokerage system.** It does not connect to a live MT4/MT5 trading platform.

## Tech Stack

- **Backend:** PHP 8.3+, Laravel 13
- **Frontend:** React 19, Inertia.js, Vite, Tailwind CSS
- **Database:** PostgreSQL
- **Dependency managers:** Composer and npm
- **External integration:** HTTP-based trading-provider simulator
- **Testing:** PHPUnit / Laravel testing framework

Use `composer.lock` and `package-lock.json` to install the dependency versions resolved for this project.

## Prerequisites

Install the following before starting:

- PHP 8.3 or later
- Composer
- Node.js and npm
- PostgreSQL
- Git
- A running provider simulator accessible from the Laravel application

Verify the installations:

```bash
php -v
composer --version
node -v
npm -v
psql --version
```

## 1. Clone the repository

```bash
git clone https://github.com/Mallik-10/forex_crm.git
cd forex_crm
```

## 2. Install dependencies

```bash
composer install
npm ci
```

## 3. Configure PostgreSQL

Start your PostgreSQL server, then create a database and a dedicated application user.

Open a PostgreSQL shell as an administrator:

```bash
psql -U postgres
```

Run:

```sql
CREATE USER forex_crm_user WITH PASSWORD 'replace-with-a-local-password';

CREATE DATABASE forex_crm
    OWNER forex_crm_user;
```

Exit PostgreSQL:

```sql
\q
```

Use a strong local password in your actual environment. Do not commit it to Git.

## 4. Configure environment variables

Create your environment file:

```bash
cp .env.example .env
```

Update the relevant settings in `.env`:

```dotenv
APP_NAME="Forex CRM"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=forex_crm
DB_USERNAME=forex_crm_user
DB_PASSWORD=replace-with-a-local-password

SIMULATOR_BASE_URL=http://127.0.0.1:9001
SIMULATOR_API_KEY=local-demo-key
```

Keep the other Laravel environment variables from `.env.example`, including any variables required by the existing application.

**Important:** `SIMULATOR_BASE_URL` and `SIMULATOR_API_KEY` must match the simulator's actual configuration. The simulator is a separate service and is not started by the commands in this README.

Generate the application key:

```bash
php artisan key:generate
```

Clear cached configuration after changing environment variables:

```bash
php artisan config:clear
```

## 5. Run database migrations and seed demo data

Create the database schema:

```bash
php artisan migrate
```

Populate it with the project's seeded demo records:

```bash
php artisan db:seed
```

For a fresh local development database, you can run both operations together:

```bash
php artisan migrate:fresh --seed
```

**Warning:** `migrate:fresh` drops all tables managed by the application before recreating them. Never run it against a database containing data you need to keep.

## 6. Build frontend assets

For a production-style frontend build:

```bash
npm run build
```

For frontend development with Vite's hot-reload server, open a separate terminal and run:

```bash
npm run dev
```

Keep that process running while developing.

## 7. Start the application

Start Laravel:

```bash
php artisan serve
```

Open the application at:

http://127.0.0.1:8000

For local development, use `npm run dev` in a separate terminal if you want hot reloading. Otherwise, build the frontend assets with `npm run build`.

## 8. Demo accounts

The current database seeder defines the following demo identities:

| Client | Email | Password | Initial wallet |
|---|---|---|---:|
| Client A | `clientA@example.com` | `ClientA01` | USD 1,000.00 |
| Client B | `clientb@example.com` | `ClientB02` | USD 500.00 |

These credentials are intended only for local demonstration. Verify that the seeder creates these exact users and balances before relying on them.

The current authentication implementation compares plaintext password values. Replace it with Laravel's password hashing and authentication facilities before deploying or sharing the application in a real environment.

## 9. Provider simulator

The application expects a separate HTTP service configured through `SIMULATOR_BASE_URL`.

The Laravel service calls these endpoints:

- `GET /accounts/{id}` — retrieve a trading account's provider-side balance.
- `POST /transfers` — submit a transfer request.
- `GET /transfers/{reference}` — retrieve a transfer's status for reconciliation.

Requests use bearer authentication configured through `SIMULATOR_API_KEY`.

The transfer request includes the transfer reference, trading-account ID, amount in minor units, and currency. The demo mode is passed through the `x-demo-mode` header.

The application supports these demo modes:

- `success`
- `declined`
- `timeout_after_success`

The simulator must implement the expected behavior for each mode. Its repository and startup instructions should be documented separately once confirmed.

## 10. Transfer lifecycle

A transfer follows this sequence:

1. The authenticated client submits a transfer request.
2. Laravel validates the request and verifies ownership of the selected trading account.
3. The transfer service opens a PostgreSQL transaction and locks the relevant wallet and trading-account rows.
4. It checks currency compatibility and available funds.
5. It reserves the requested funds and creates a transfer record with a unique reference and `pending` status.
6. The transaction commits before the external provider request is made.
7. A confirmed success completes the transfer and updates the trading-account balance.
8. A definitive decline or failure releases the reservation back to the wallet.
9. An uncertain provider response leaves the transfer pending until reconciliation determines the outcome.

The external HTTP request is deliberately made outside the database transaction to avoid holding database locks while waiting for the provider.

PostgreSQL row locking helps protect concurrent balance updates, but this alone does not guarantee end-to-end exactly-once transfer processing. Provider-side idempotency and application-level duplicate-request protection are still needed.

## 11. Testing

Run the project's automated tests:

```bash
php artisan test
```

The current test configuration must be checked before assuming the test suite uses PostgreSQL. For database-specific integration tests, configure a dedicated PostgreSQL test database and run the suite against it.

Do not point tests at a database containing data you need to preserve.

The following cases should be covered by automated tests:

- Successful transfer
- Definitive decline and release of reserved funds
- Insufficient available balance
- Invalid amount and currency mismatch
- Unauthorized access to another client's account or transfer
- Provider timeout after the provider has processed a transfer
- Reconciliation of pending transfers
- Repeated finalization of the same transfer
- Duplicate client requests
- Concurrent transfers competing for the same wallet balance
- Database rollback when reservation or transfer creation fails

## 12. Reset local demo data

To recreate the schema and repopulate the demo records:

```bash
php artisan migrate:fresh --seed
```

This is destructive and should be used only with a disposable local development database.

## 13. Background workers

The current workflow calls the provider synchronously and supports manual reconciliation through the web interface. No queue worker is required for the basic demo as currently designed.

A production implementation should use a durable queue or scheduled reconciliation process to identify stale pending transfers, query provider statuses, retry safe operations, and alert operators when transfers remain unresolved.

## 14. Security and production limitations

This project is a learning and demonstration prototype.

Before production use:

- Replace plaintext password handling with secure password hashing and Laravel authentication.
- Add client-scoped idempotency keys and database uniqueness constraints.
- Implement provider-side idempotency where supported.
- Add durable reconciliation, monitoring, and alerting.
- Add an immutable financial audit ledger and stronger database integrity constraints.
- Enforce least-privilege database and simulator credentials.
- Keep secrets outside source control.
- Add rate limiting and production-grade logging.
- Verify concurrency behavior and transaction isolation under the intended PostgreSQL configuration.
- Validate currency precision instead of assuming every currency uses two decimal places.
- Remove or restrict user-selectable demo modes in production.
- Add automated tests for failure handling and concurrent requests.
- Reconcile internal balances with provider-side balances.

Never commit `.env`, production credentials, API keys, or real client financial data.

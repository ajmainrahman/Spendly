# BudgetBD — Monthly Budget Manager

A full-stack personal finance tracker built with React, Express, Drizzle ORM, and PostgreSQL. All amounts are in Bangladeshi Taka (BDT ৳).

## Features

- **Dashboard** — Income, expenses, net savings, savings rate, 6-month trend chart, expense breakdown, and budget vs actual
- **Income Tracker** — Log income entries by source and category
- **Expense Tracker** — Record and categorize all expenses
- **Monthly Budgets** — Set per-category budgets with visual progress bars
- **Savings Goals** — Track savings targets with deadlines and contributions
- **Category Manager** — Create and manage custom income/expense categories
- **Reports & Analytics** — Monthly trends, category breakdowns, and comparative charts

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, TailwindCSS v4, Recharts |
| Backend | Express 5, Pino logger |
| Database | PostgreSQL via [Neon](https://neon.tech), Drizzle ORM |
| API Contract | OpenAPI 3.1, React Query, Zod |
| Deployment | Vercel (frontend + API functions) |

## Getting Started (Local)

### Prerequisites

- Node.js 20+
- pnpm 10+
- A [Neon](https://neon.tech) (or any PostgreSQL) database

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/budget-bd.git
cd budget-bd

# Install dependencies
pnpm install

# Copy env vars and fill them in
cp .env.example .env
# Edit .env with your DATABASE_URL and SESSION_SECRET

# Push the database schema
pnpm --filter @workspace/db run push

# Start the API server (runs on port 8080)
pnpm --filter @workspace/api-server run dev

# Start the frontend (in another terminal)
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/budget-tracker run dev
```

The app will be available at `http://localhost:5173`.

## Deploying to Vercel + Neon

### 1. Create a Neon database

1. Go to [console.neon.tech](https://console.neon.tech) and create a new project
2. Copy the **connection string** (it looks like `postgresql://user:pass@host/db?sslmode=require`)

### 2. Push the schema to Neon

```bash
DATABASE_URL=<your-neon-connection-string> pnpm --filter @workspace/db run push
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

During the Vercel setup, add these environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `SESSION_SECRET` | A strong random string (`openssl rand -hex 32`) |

The `vercel.json` at the project root handles:
- Building the React frontend (`artifacts/budget-tracker`)
- Serving the Express API as a Vercel serverless function (`api/[...path].mjs`)
- Routing all non-API requests to the SPA entry (`index.html`)

## Project Structure

```
├── api/
│   └── [...path].mjs         # Vercel serverless function entry (handles /api/*)
├── artifacts/
│   ├── api-server/           # Express API server
│   │   └── src/
│   │       ├── app.ts
│   │       └── routes/       # categories, income, expenses, budgets, savings, dashboard
│   └── budget-tracker/       # React + Vite frontend
│       └── src/
│           ├── pages/        # Dashboard, Income, Expenses, Budgets, Savings, Categories, Reports
│           └── components/
├── lib/
│   ├── api-spec/             # OpenAPI 3.1 spec + generated client
│   ├── api-client-react/     # React Query hooks (auto-generated)
│   ├── api-zod/              # Zod schemas (auto-generated)
│   └── db/                   # Drizzle ORM schema + connection
├── .env.example
└── vercel.json
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon or any Postgres) |
| `SESSION_SECRET` | Yes | Secret for session signing |

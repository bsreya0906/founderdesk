# FounderDesk

AI-powered feedback triage dashboard for startup founders. Form submissions are summarized, categorized and prioritized by an LLM, then shown in a Next.js dashboard.

**Live demo:** https://founderdesk-triage.netlify.app (demo mode with sample data and keyword-based triage)

**Stack:** Next.js, TypeScript, Node.js/Express, MongoDB, n8n, Claude or OpenAI API

## How it works

```
Form -> n8n -> POST /api/submissions (Express) -> LLM triage -> MongoDB
                          |-> n8n notifies the founder (urgent/high vs normal)
Next.js dashboard -> /api/proxy/* (adds API key server-side) -> Express API
```

Each submission gets a summary, category, priority, sentiment, suggested next step and tags. The dashboard lets you search, filter, change status and re-run triage.

## Project structure

```
frontend/   Next.js dashboard
backend/    Express API, MongoDB models, LLM triage service
n8n/        Importable workflow (form trigger -> API -> notification)
```

## Run locally

Requires Node 20+. No API key or database is needed: the default setup uses a mock AI and an in-memory MongoDB with demo data.

```bash
# terminal 1: API on port 4000
cd backend
cp .env.example .env
npm install
npm run dev

# terminal 2: dashboard on port 3000
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Use the same `API_KEY` in `backend/.env` and `frontend/.env.local`. The first backend start downloads a MongoDB binary (about 800 MB, once).

## Configuration

Backend (`backend/.env`):

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | `memory` for a local throwaway DB, or a MongoDB Atlas connection string |
| `API_KEY` | Shared secret sent as the `x-api-key` header |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `LLM_PROVIDER` | `mock`, `anthropic` or `openai` |
| `ANTHROPIC_API_KEY` | Needed when the provider is `anthropic` |
| `OPENAI_API_KEY` | Needed when the provider is `openai` |

Frontend (`frontend/.env.local`): `BACKEND_URL` and `API_KEY`. Both stay server-side.

## API

All routes except `/health` need the `x-api-key` header.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/submissions` | Create and triage a submission |
| GET | `/api/submissions` | List (`category`, `priority`, `status`, `q`, `page`, `limit`) |
| GET | `/api/submissions/stats` | Counts by category, priority and status |
| GET | `/api/submissions/:id` | Get one |
| PATCH | `/api/submissions/:id` | Update status |
| POST | `/api/submissions/:id/retriage` | Re-run AI triage |
| GET | `/health` | Health check |

## n8n

Import `n8n/feedback-triage.workflow.json`, set `FOUNDERDESK_API_URL`, `FOUNDERDESK_API_KEY` and `FOUNDER_EMAIL`, and attach a Gmail credential (or swap in Slack).

## Deploy

If `BACKEND_URL` is not set, the dashboard runs in demo mode with built-in sample data, which is how the live demo works. Set `BACKEND_URL` and `API_KEY` to use the real API.

1. Create a MongoDB Atlas database and copy its connection string.
2. Deploy `backend/` to a Node host (Render, Railway or Fly). Build with `npm run build`, start with `npm start`. Set `MONGODB_URI`, `API_KEY`, `CORS_ORIGIN`, `LLM_PROVIDER` and the LLM key.
3. Deploy `frontend/` to Vercel or Netlify with the root directory set to `frontend`. Set `BACKEND_URL` to the backend URL and the same `API_KEY`.
4. Set the backend's `CORS_ORIGIN` to the Vercel URL and point the n8n variables at the backend.

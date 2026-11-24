# FounderDesk

**AI-powered feedback triage for startup founders.** Every form submission, bug report, investor email and job application is summarized, categorized, prioritized and routed by an LLM, so you open one dashboard instead of an overflowing inbox.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![Node](https://img.shields.io/badge/Node-Express-339933) ![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47a248) ![n8n](https://img.shields.io/badge/n8n-workflow-ea4b71) ![LLM](https://img.shields.io/badge/LLM-Claude%20%7C%20OpenAI-8c8cff)

<!-- Add a screenshot: docs/screenshot.png -->
<!-- ![FounderDesk dashboard](docs/screenshot.png) -->

## Features

- **Automatic triage:** each submission gets a summary, category, priority, sentiment, suggested next step and tags.
- **Priority at a glance:** urgent, high, medium and low are color-coded, with live counts.
- **Fast filtering:** search, filter by category, priority or status, or click a category bar.
- **Status workflow:** move items through new, in review, resolved and archived, and re-run triage on demand.
- **Notifications:** n8n alerts you right away for urgent or high items and batches the rest.
- **Runs with zero setup:** a built-in mock AI and an in-memory database mean no API keys or accounts are needed to try it.
- **Responsive and themed:** works on phones, with light and dark modes.

## How it works

```
Form -> n8n -> POST /api/submissions (Express) -> LLM triage -> MongoDB
                          |-> n8n notifies founder (urgent/high vs normal)
Next.js dashboard -> /api/proxy/* (adds API key server-side) -> Express API
```

| Part | Tech | Folder |
| --- | --- | --- |
| Dashboard | Next.js 15, React 19, TypeScript | `frontend/` |
| API | Node.js, Express 5, Mongoose, Zod | `backend/` |
| Automation | n8n workflow (form trigger, API call, notification) | `n8n/` |
| AI | Claude or OpenAI over HTTPS, with a keyword-based mock | `backend/src/services/llm.ts` |

**Design notes**
- The browser never sees the API key. The dashboard calls a Next.js proxy route, which adds the key server-side.
- LLM output is validated with Zod, and submission text is treated as untrusted (the prompt never follows instructions inside it).
- The API is protected by a shared key, `helmet`, CORS allow-listing and rate limiting.

## Quick start

Requires Node 20+.

```bash
# 1. Backend (http://localhost:4000)
cd backend
cp .env.example .env
npm install
npm run dev
```

The first run downloads a MongoDB binary (about 800 MB, once) for the in-memory database, which is seeded with demo data.

```bash
# 2. Frontend (http://localhost:3000), in a second terminal
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Keep `API_KEY` the same in `backend/.env` and `frontend/.env.local`. Open http://localhost:3000.

Try the ingest endpoint:

```bash
curl -X POST localhost:4000/api/submissions \
  -H "x-api-key: change-me" -H "content-type: application/json" \
  -d '{"name":"Asha","email":"a@b.com","message":"Checkout crashes on iOS, we are losing customers!"}'
```

## Configuration

**Backend (`backend/.env`)**

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | `memory` for a throwaway local DB, or a MongoDB Atlas URI |
| `API_KEY` | Shared secret sent as `x-api-key` by the dashboard proxy and n8n |
| `CORS_ORIGIN` | Comma-separated allowed browser origins (your frontend URL) |
| `LLM_PROVIDER` | `mock`, `anthropic` or `openai` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Used when the provider is `anthropic` |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Used when the provider is `openai` |

**Frontend (`frontend/.env.local`)**: `BACKEND_URL` and `API_KEY` (server-side only).

## API

All routes require the `x-api-key` header.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/submissions` | Create a submission and triage it |
| `GET` | `/api/submissions` | List with `category`, `priority`, `status`, `q`, `page`, `limit` |
| `GET` | `/api/submissions/stats` | Totals by category, priority and status |
| `GET` | `/api/submissions/:id` | Fetch one |
| `PATCH` | `/api/submissions/:id` | Update `status` |
| `POST` | `/api/submissions/:id/retriage` | Re-run AI triage |
| `GET` | `/health` | Health check (no key needed) |

## n8n workflow

1. Import `n8n/feedback-triage.workflow.json`.
2. Set the env vars `FOUNDERDESK_API_URL`, `FOUNDERDESK_API_KEY` and `FOUNDER_EMAIL`.
3. Attach a Gmail credential, or swap the notification node for Slack.

## Deployment

Deploy in this order:

1. **Database:** create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster and copy the connection string.
2. **Backend:** deploy `backend/` to Render using `backend/render.yaml` (or Railway or Fly). Set `MONGODB_URI`, a long random `API_KEY` and `LLM_PROVIDER`, plus an LLM key if you are not using `mock`.
3. **Frontend:** deploy `frontend/` to Vercel (set the project root to `frontend`). Set `BACKEND_URL` to the backend URL and the same `API_KEY`.
4. **Wire up:** set the backend's `CORS_ORIGIN` to your Vercel URL, then point the n8n env vars at the backend.

## Roadmap

- Dashboard authentication (NextAuth)
- Webhook signature verification
- Async triage queue
- Weekly digest email

## License

MIT

# SpendLens — Complete Project Guide

## Table of Contents
1. [What is SpendLens?](#what-is-spendlens)
2. [Quick Start](#quick-start)
3. [How a Receipt Becomes an Expense](#how-a-receipt-becomes-an-expense)
4. [Architecture](#architecture)
5. [Database Schema](#database-schema)
6. [Backend Deep Dive](#backend-deep-dive)
7. [Frontend Deep Dive](#frontend-deep-dive)
8. [API Reference](#api-reference)
9. [Configuration](#configuration)
10. [Known Issues](#known-issues)
11. [Troubleshooting](#troubleshooting)

---

## What is SpendLens?

An expense tracker that reads receipts. Photograph or upload a receipt, and SpendLens:
1. reads the text with Tesseract OCR,
2. asks a Groq-hosted Llama model to turn that text into structured data: merchant, date, items,
   subtotal, tax, total and category,
3. saves the expense,
4. shows dashboards, per-category budgets, top merchants, and an AI-written spending summary.

You can also add, edit and delete expenses by hand, and export everything as CSV.

---

## Quick Start

### Prerequisites
- Python 3.10 or newer. The system `python3` here is 3.6, so use `python3.12`.
- Node.js 18 or newer.
- Tesseract installed on the system: `sudo apt install tesseract-ocr`.
- A Groq API key from https://console.groq.com/.

### Backend
```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env            # add GROQ_API_KEY
.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev -- -p 3001          # http://localhost:3001
```

The frontend expects the API at `http://localhost:8002` unless `NEXT_PUBLIC_API_URL` says otherwise.

---

## How a Receipt Becomes an Expense

```
 receipt photo
      │  POST /api/receipts/scan
      ▼
 saved to backend/uploads/
      │  core/ocr.py  preprocess_image() then extract_text() with Tesseract
      ▼
 raw text
      │  core/llm_extract.py  extract_receipt_data()  Groq, model from GROQ_MODEL
      ▼
 JSON: merchant, date, items, subtotal, tax, total, category
      │
      ▼
 Expense row in SQLite, raw OCR text kept alongside
```

Preprocessing with Pillow cleans the image before OCR, which matters a lot for thermal-paper receipts.

The model must pick one of nine categories: Groceries, Dining, Shopping, Transportation, Healthcare,
Entertainment, Utilities, Education, Other.

---

## Architecture

```
  Browser (Next.js 14, :3001)
   one page with five tabs: Dashboard, Scan, Expenses, Insights, Budgets
         │ fetch  (src/lib/api.ts)
         ▼
  FastAPI (:8002)  main.py, all routers under /api
   receipts.py   scan a receipt          ── core/ocr.py, core/llm_extract.py
   expenses.py   create, list, update, delete
   dashboard.py  summaries, trends, budgets
   insights.py   top merchants, daily spending, stats, AI summary ── Groq
   export.py     CSV download
   /uploads      receipt images served as static files
         │ SQLAlchemy
         ▼
  SQLite  expenses.db   (or PostgreSQL through DATABASE_URL)
```

---

## Database Schema

Defined in `backend/core/database.py`.

### `expenses`
| column | purpose |
|---|---|
| `id` | primary key |
| `merchant` | shop name, indexed |
| `date` | purchase date |
| `total`, `subtotal`, `tax` | amounts |
| `category` | one of the nine, default `Other` |
| `items` | JSON list of line items |
| `receipt_image` | path under `/uploads` |
| `raw_ocr_text` | what Tesseract read, kept for checking |
| `created_at` | timestamp |

### `budgets`
`id`, `category` (unique), `monthly_limit`.

---

## Backend Deep Dive

| file | purpose |
|---|---|
| `main.py` | app, CORS, routers, the `/uploads` static mount, `/health` |
| `core/ocr.py` | `preprocess_image()` and `extract_text()` |
| `core/llm_extract.py` | `extract_receipt_data(ocr_text)` and `categorize_expense(merchant, items)` |
| `core/database.py` | the engine, session, and the `Expense` and `Budget` models |
| `api/routes/receipts.py` | saves the upload, runs OCR and extraction, stores the expense |
| `api/routes/expenses.py` | CRUD with filters by category and month |
| `api/routes/dashboard.py` | summary, monthly trend, category trend, budgets |
| `api/routes/insights.py` | top merchants, daily spending, advanced stats, and an AI summary from Groq |
| `api/routes/export.py` | every expense as a CSV file |

---

## Frontend Deep Dive

Next.js 14, React 18, TypeScript, Tailwind CSS, Chart.js through react-chartjs-2, and Lucide icons.

`src/app/page.tsx` is a single page that switches between five tabs. On a phone the tabs become a
bottom navigation bar.

| tab | components |
|---|---|
| Dashboard | `Dashboard` with doughnut, bar and trend charts, and budget alerts |
| Scan | `ReceiptUpload`, drag and drop or camera |
| Expenses | `ExpenseList` with filters. `AddExpenseModal` handles manual entry |
| Insights | `StatsCards`, `AiInsights` and `TopMerchants` |
| Budgets | `BudgetManager`, monthly limits per category with progress bars |

`src/lib/api.ts` holds every API call. `src/lib/types.ts` holds the shared types.

---

## API Reference

All routes are under `/api` except `/health`.

| method | path | purpose |
|---|---|---|
| `POST` | `/receipts/scan` | upload a receipt image for OCR and extraction |
| `GET` | `/expenses` | list, with `category` and `month` filters |
| `POST` | `/expenses` | add an expense manually |
| `PUT` | `/expenses/{id}` | update |
| `DELETE` | `/expenses/{id}` | delete |
| `GET` | `/dashboard/summary` | totals and category breakdown |
| `GET` | `/dashboard/monthly-trend` | spending per month |
| `GET` | `/dashboard/category-trend` | spending per category over time |
| `GET` | `/budgets` | list budget limits |
| `POST` | `/budgets` | set a category's monthly limit |
| `DELETE` | `/budgets/{category}` | remove a limit |
| `GET` | `/insights/top-merchants?limit=5` | where the money goes |
| `GET` | `/insights/daily-spending?days=30` | per-day totals |
| `GET` | `/insights/stats` | averages and other statistics |
| `GET` | `/insights/ai-summary` | a written summary from Groq |
| `GET` | `/export/csv` | download every expense |
| `GET` | `/health` | health check |

Interactive docs are at http://localhost:8002/docs.

---

## Configuration

| variable | file | default | notes |
|---|---|---|---|
| `GROQ_API_KEY` | `backend/.env` | none | needed for scanning and the AI summary |
| `GROQ_MODEL` | `backend/.env` | `openai/gpt-oss-120b` | change it when Groq retires the model |
| `DATABASE_URL` | `backend/.env` | `sqlite:///./expenses.db` | a PostgreSQL URL works too |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://localhost:8002` | |

---

## Known Issues

- **Groq retires models.** The model is read from `GROQ_MODEL`, defaulting to
  `openai/gpt-oss-120b`. The original `llama-3.3-70b-versatile` was retired, which broke scanning
  until 2026-09-18. When the current model is retired, scanning returns a 503 naming it. Change
  `GROQ_MODEL` in `backend/.env`, no code change needed.
- **Live extraction verified on 2026-09-18** against Groq with `openai/gpt-oss-120b`: a sample
  receipt's merchant, items, subtotal, tax, total and category all came back correct. The OCR step
  was not part of that run, because Tesseract was not installed on the test machine.
- **Tests:** `backend/tests/` has 13 tests covering expenses, the summary, budget alerts, receipt
  scanning with OCR and the model stubbed, and the model wrapper's errors. They need no key and no
  network:
  ```bash
  cd backend
  .venv/bin/pip install -r requirements-dev.txt
  .venv/bin/python -m pytest
  ```
- **CORS is wide open** with `allow_origins=["*"]`. Fine locally, but restrict it before deploying.
- **Not deployed.**

---

## Troubleshooting

### `TesseractNotFoundError`
Tesseract is a system program, not a Python package. Install it with
`sudo apt install tesseract-ocr`.

### Scanning returns 503
The message says why. "No GROQ_API_KEY set" means add your key to `backend/.env`. "Groq has no model
named ..." means the model was retired, so set `GROQ_MODEL` to a current one from
https://console.groq.com/docs/models. Restart the backend after either change.

### Scanning works but the amounts are wrong
OCR struggled with the photo. Retake it flat and well lit, then correct the expense in the Expenses
tab. The raw OCR text is stored with each expense, so you can see what was read.

### The frontend cannot reach the backend
The backend must be on port 8002, or set `NEXT_PUBLIC_API_URL` to where it runs.

### A budget alert did not appear
Alerts appear at 80% of a category's monthly limit and compare against one month only: the current
month, or the month passed as `month=YYYY-MM` to `/dashboard/summary`. Expenses dated in other months
do not count. Before 2026-09-18 they compared against all-time spending, so alerts grew forever.

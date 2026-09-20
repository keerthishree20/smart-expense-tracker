# SpendLens — Complete Project Guide

A complete guide from zero to a working receipt-scanning expense tracker. Covers every feature, every
design decision and the reason behind it, with the real code. It is self-contained: you can paste it
into any AI chat and ask questions about the project without sharing the repository.

**Repository:** https://github.com/keerthishree20/smart-expense-tracker
**All projects:** https://github.com/keerthishree20

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Why](#2-tech-stack--why)
3. [Project Setup from Scratch](#3-project-setup-from-scratch)
4. [How a Receipt Becomes an Expense](#4-how-a-receipt-becomes-an-expense)
5. [Project Structure](#5-project-structure)
6. [Database Design](#6-database-design)
7. [Image Preprocessing & OCR](#7-image-preprocessing--ocr)
8. [Structured Extraction with Groq](#8-structured-extraction-with-groq)
9. [The Model Setting & Error Handling](#9-the-model-setting--error-handling)
10. [Categories](#10-categories)
11. [Manual Expenses (CRUD)](#11-manual-expenses-crud)
12. [Dashboard Summary & Trends](#12-dashboard-summary--trends)
13. [Budgets & Alerts](#13-budgets--alerts)
14. [Insights](#14-insights)
15. [AI Spending Summary](#15-ai-spending-summary)
16. [CSV Export](#16-csv-export)
17. [Frontend: One Page, Five Tabs](#17-frontend-one-page-five-tabs)
18. [API Reference](#18-api-reference)
19. [Configuration](#19-configuration)
20. [Testing](#20-testing)
21. [Known Issues](#21-known-issues)
22. [Troubleshooting](#22-troubleshooting)
23. [Complete Feature Summary](#23-complete-feature-summary)

---

## 1. Project Overview

SpendLens is an **expense tracker that reads receipts**. Photograph or upload a receipt, and SpendLens:
1. reads the text with **Tesseract OCR**,
2. asks a **Groq-hosted AI model** to turn that text into structured data: merchant, date, items,
   subtotal, tax, total and category,
3. saves the expense,
4. shows dashboards, budgets, top merchants and an AI-written spending summary.

You can also add, edit and delete expenses by hand, and export everything as CSV.

**Status:** working; 13 backend tests; live Groq extraction verified on 2026-09-18. Not deployed.

---

## 2. Tech Stack & Why

| Technology | Role | Why We Chose It |
|---|---|---|
| **FastAPI** | Backend | typed routes, file uploads, automatic docs |
| **Tesseract OCR + pytesseract** | Reading receipts | free, offline OCR |
| **Pillow** | Preprocessing | cleans the image before OCR |
| **Groq** (`openai/gpt-oss-120b` by default) | Structuring text | free tier, fast; turns messy OCR text into JSON |
| **SQLAlchemy + SQLite** | Database | no server; PostgreSQL works via `DATABASE_URL` |
| **Next.js 14, React 18, TypeScript** | Frontend | single-page app with tabs |
| **Tailwind CSS** | Styling | responsive, mobile bottom navigation |
| **Chart.js + react-chartjs-2** | Charts | doughnut, bar and trend charts |
| **Lucide React** | Icons | |

### Why OCR plus an AI model, not the AI model alone?
Tesseract turns the image into text locally for free. The model only has to understand text, which is
cheaper and faster than sending images, and the raw OCR text is kept so you can always see what was read.

---

## 3. Project Setup from Scratch

### Prerequisites
- Python 3.10+ (the system `python3` here is 3.6, so use `python3.12`)
- Node.js 18+
- Tesseract: `sudo apt install tesseract-ocr`
- A free Groq API key: https://console.groq.com/

### Backend
```bash
git clone https://github.com/keerthishree20/smart-expense-tracker.git
cd smart-expense-tracker/backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env            # add GROQ_API_KEY
.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### Frontend
```bash
cd ../frontend
npm install
npm run dev -- -p 3001          # http://localhost:3001
```

---

## 4. How a Receipt Becomes an Expense

```
receipt photo
     │  POST /api/receipts/scan (must be an image)
     ▼
saved to backend/uploads/<uuid>.<ext>
     │  core/ocr.py: preprocess_image() → pytesseract (--psm 6)
     ▼
raw text  (empty → 422 "Could not extract text")
     │  core/llm_extract.py: extract_receipt_data() → Groq
     ▼
JSON: merchant, date, items, subtotal, tax, total, category
     │  (model unavailable → 503 with the reason)
     ▼
Expense row in SQLite, with the raw OCR text kept
```

---

## 5. Project Structure

```
backend/
  main.py                    app, CORS, routers under /api, /uploads static, /health
  core/
    ocr.py                   preprocess_image, extract_text
    llm_extract.py           MODEL, LLMUnavailable, complete(), extract_receipt_data, categorize_expense
    database.py              engine, session, Expense and Budget models
  api/routes/
    receipts.py              POST /receipts/scan
    expenses.py              expense CRUD with filters
    dashboard.py             summary, trends, budgets
    insights.py              top merchants, daily spending, stats, AI summary
    export.py                CSV export
  tests/
    conftest.py              temporary database, uploads folder
    test_api.py              13 tests
  requirements.txt  requirements-dev.txt  .env.example
frontend/src/
  app/page.tsx               one page, five tabs
  components/Dashboard.tsx  ReceiptUpload.tsx  ExpenseList.tsx  AddExpenseModal.tsx
             BudgetManager.tsx  StatsCards.tsx  AiInsights.tsx  TopMerchants.tsx
  lib/api.ts  lib/types.ts
```

---

## 6. Database Design

`backend/core/database.py`.

### `expenses`
| Column | Purpose |
|---|---|
| `id` | primary key |
| `merchant` | shop name, indexed |
| `date` | purchase date |
| `total`, `subtotal`, `tax` | amounts |
| `category` | one of nine, default `Other`, indexed |
| `items` | JSON list of line items |
| `receipt_image` | file name under `/uploads` |
| `raw_ocr_text` | what Tesseract read |
| `created_at` | timestamp |

### `budgets`
`id`, `category` (unique), `monthly_limit`.

---

## 7. Image Preprocessing & OCR

```python
def preprocess_image(image):
    image = image.convert("L")                         # greyscale
    image = image.filter(ImageFilter.MedianFilter(size=3))   # remove speckle noise
    image = ImageEnhance.Contrast(image).enhance(2.0)  # darker text, lighter paper
    image = ImageEnhance.Sharpness(image).enhance(2.0)
    return image

def extract_text(image_path):
    import pytesseract
    processed = preprocess_image(Image.open(image_path))
    return pytesseract.image_to_string(processed, config="--psm 6").strip()
```

`--psm 6` tells Tesseract to treat the image as one block of text, which suits receipts.
Preprocessing matters a lot for faded thermal-paper receipts.

---

## 8. Structured Extraction with Groq

The prompt asks for exactly this JSON:

```json
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "items": [{"name": "item name", "quantity": 1, "price": 9.99}],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "category": "one of: Groceries, Dining, Shopping, Transportation, Healthcare, Entertainment, Utilities, Education, Other"
}
```

Rules in the prompt: best guess from context, date in `YYYY-MM-DD`, **if the year is missing assume the
current year**, prices as numbers, category from the list, empty items allowed.

```python
async def extract_receipt_data(ocr_text):
    prompt = EXTRACTION_PROMPT.replace("{year}", str(date.today().year))   # replace, not format: JSON braces
    content = await complete([{"role": "system", "content": prompt},
                              {"role": "user", "content": f"OCR Text:\n{ocr_text}"}],
                             temperature=0.1, max_tokens=4096)
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0]       # strip code fences
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise LLMUnavailable("The model's reply was not valid JSON. Try the scan again.") from exc
```

A missing date falls back to today; missing numbers become 0.

---

## 9. The Model Setting & Error Handling

```python
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

async def complete(messages, *, temperature, max_tokens):
    try:
        response = await _get_client().chat.completions.create(
            model=MODEL, messages=messages, temperature=temperature, max_tokens=max_tokens)
    except NotFoundError as exc:
        raise LLMUnavailable(f"Groq has no model named {MODEL!r}; it was most likely retired. "
                             f"Set GROQ_MODEL in backend/.env ...")
    except APIStatusError as exc:
        raise LLMUnavailable(f"Groq returned {exc.status_code}: {exc.message}")
    return (response.choices[0].message.content or "").strip()
```

### Why this exists
The original model, `llama-3.3-70b-versatile`, was **retired by Groq**, and every scan failed with a
404 until 2026-09-18. Now:
- the model is a setting, so the next retirement is an `.env` edit,
- errors become **503** with a clear reason (no key, retired model, Groq error),
- `max_tokens` is generous because reasoning models spend part of it thinking before they answer.

---

## 10. Categories

Nine categories: **Groceries, Dining, Shopping, Transportation, Healthcare, Entertainment, Utilities,
Education, Other.** The extraction prompt picks one; `categorize_expense(merchant, items)` can
categorise separately.

---

## 11. Manual Expenses (CRUD)

| Method | Path | Does |
|---|---|---|
| GET | `/api/expenses?category=&month=YYYY-MM` | list with filters |
| POST | `/api/expenses` | add: merchant, total, category, date, items |
| PUT | `/api/expenses/{id}` | update any field |
| DELETE | `/api/expenses/{id}` | delete |

`AddExpenseModal` handles manual entry. An invalid date falls back to today.

---

## 12. Dashboard Summary & Trends

`GET /api/dashboard/summary[?month=YYYY-MM]` returns total spent, transaction count, average, category
breakdown and budget alerts.

`GET /api/dashboard/monthly-trend?months=6` returns spending per month per category (up to 12 months).

`GET /api/dashboard/category-trend` returns category spending over time.

---

## 13. Budgets & Alerts

Set a monthly limit per category (`BudgetManager`, or `POST /api/budgets?category=Dining&monthly_limit=100`).

### Alerts compare one month only
```python
budget_month = datetime.now()               # or the requested month
month_totals = spending per category in budget_month
for cat, spent in month_totals.items():
    if cat in budgets:
        pct = spent / limit * 100
        if pct >= 80:
            status = "exceeded" if pct >= 100 else "warning"
```

Until 2026-09-18, alerts compared the monthly limit with **all-time** spending, so they grew forever. A
test now checks that last year's spending does not trigger this month's alert.

---

## 14. Insights

| Endpoint | Returns |
|---|---|
| `/api/insights/top-merchants?limit=5` | merchants by total spent, with visit counts |
| `/api/insights/daily-spending?days=30` | spending per day |
| `/api/insights/stats` | highest and lowest expense, merchants, categories used, days tracked, average per day |

---

## 15. AI Spending Summary

`GET /api/insights/ai-summary` sends the last 50 expenses (date, merchant, total, category) and a
category breakdown to Groq, asking for 4–5 short bullet points: biggest category, a saving tip, unusual
transactions, a positive note.

If the model is unavailable, it **falls back** to simple computed tips (biggest category, total spent,
lowest category, "set budget limits"), so the tab never breaks.

---

## 16. CSV Export

`GET /api/export/csv` downloads `expenses.csv` with columns
`Date, Merchant, Category, Total, Subtotal, Tax, Items` (items as `name xQty ($price)`).

---

## 17. Frontend: One Page, Five Tabs

`src/app/page.tsx`. On a phone, the tabs become a bottom navigation bar.

| Tab | Components |
|---|---|
| Dashboard | `Dashboard` with doughnut, bar and trend charts, and budget alerts |
| Scan | `ReceiptUpload`: drag and drop or camera |
| Expenses | `ExpenseList` with filters; `AddExpenseModal` for manual entry |
| Insights | `StatsCards`, `AiInsights`, `TopMerchants` |
| Budgets | `BudgetManager` |

`lib/api.ts` calls the backend at `NEXT_PUBLIC_API_URL`, default `http://localhost:8002`.

---

## 18. API Reference

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/receipts/scan` | upload a receipt image |
| GET, POST | `/api/expenses` | list (filters) or add |
| PUT, DELETE | `/api/expenses/{id}` | update or delete |
| GET | `/api/dashboard/summary` | totals, breakdown, budget alerts |
| GET | `/api/dashboard/monthly-trend` | per month |
| GET | `/api/dashboard/category-trend` | per category over time |
| GET, POST | `/api/budgets` | list or set a limit |
| DELETE | `/api/budgets/{category}` | remove a limit |
| GET | `/api/insights/top-merchants`, `/daily-spending`, `/stats`, `/ai-summary` | insights |
| GET | `/api/export/csv` | download |
| GET | `/health` | health check |

Docs: http://localhost:8002/docs

---

## 19. Configuration

| Variable | File | Default | Notes |
|---|---|---|---|
| `GROQ_API_KEY` | `backend/.env` | none | needed for scanning and the AI summary |
| `GROQ_MODEL` | `backend/.env` | `openai/gpt-oss-120b` | change when Groq retires it |
| `DATABASE_URL` | `backend/.env` | `sqlite:///./expenses.db` | PostgreSQL works too |
| `CORS_ORIGINS` | `backend/.env` | empty | extra allowed origins, comma separated; localhost always works |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://localhost:8002` | |

---

## 20. Testing

```bash
cd backend
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest          # 13 tests, no key, no network
```

`tests/test_api.py` covers: expense CRUD; summary totals and breakdown; **budget alerts judged on one
month** (last year's spending ignored, warning at 80%, exceeded at 100%, a requested month); receipt
scanning with OCR and the model stubbed; a 503 with the reason when the model is unavailable; non-image
and unreadable uploads refused; no key; the current year in the prompt and code fences stripped; a
non-JSON reply; and the AI summary fallback.

**Live check (2026-09-18):** a sample receipt through Groq returned the merchant, three items, subtotal,
tax, total and "Groceries" correctly, and inferred the year from the current date. Tesseract was not
installed on that machine, so OCR itself was not part of the live run.

---

## 21. Known Issues

- **CORS is closed by default now.** Any localhost port is allowed; any other origin must be listed in
  `CORS_ORIGINS` (comma separated) in `backend/.env`. The API has no authentication, so a wildcard would
  let any site a user visits read their expenses.
- **Not deployed.**

---

## 22. Troubleshooting

| Problem | Fix |
|---|---|
| `TesseractNotFoundError` | install it: `sudo apt install tesseract-ocr` |
| scanning returns 503 | read the message: add `GROQ_API_KEY`, or set `GROQ_MODEL` if retired; restart |
| amounts are wrong | retake the photo flat and bright; fix it in Expenses; the raw OCR text is stored |
| frontend cannot reach backend | backend on 8002, or set `NEXT_PUBLIC_API_URL` |
| a budget alert did not appear | alerts use this month only (or `?month=`); expenses in other months do not count |

---

## 23. Complete Feature Summary

### All Features Built

| # | Feature | Type | Key Files |
|---|---|---|---|
| 1 | Receipt upload | Full stack | `receipts.py`, `ReceiptUpload.tsx` |
| 2 | Image preprocessing + Tesseract OCR | Backend | `ocr.py` |
| 3 | Groq structured extraction | AI | `llm_extract.py` |
| 4 | Model setting and clear 503 errors | AI | `llm_extract.py`, `receipts.py` |
| 5 | Nine-category classification | AI | `llm_extract.py` |
| 6 | Manual expense CRUD with filters | Full stack | `expenses.py`, `AddExpenseModal.tsx` |
| 7 | Dashboard summary and trends | Full stack | `dashboard.py`, `Dashboard.tsx` |
| 8 | Monthly budgets with alerts | Full stack | `dashboard.py`, `BudgetManager.tsx` |
| 9 | Top merchants, daily spending, stats | Full stack | `insights.py`, `TopMerchants.tsx`, `StatsCards.tsx` |
| 10 | AI summary with fallback | AI | `insights.py`, `AiInsights.tsx` |
| 11 | CSV export | Backend | `export.py` |
| 12 | Mobile bottom navigation | Frontend | `page.tsx` |
| 13 | Backend test suite | Testing | `tests/` |

### Data Flow Architecture

```
Browser (Next.js :3001, five tabs)
  ├── Scan ──► POST /api/receipts/scan
  │     └── save to uploads/ ──► preprocess ──► Tesseract ──► Groq (GROQ_MODEL) ──► JSON
  │           └── Expense (SQLite) with raw OCR text
  ├── Expenses ──► /api/expenses CRUD
  ├── Dashboard ──► /api/dashboard/summary (+ budget alerts for one month) + monthly-trend
  ├── Insights ──► top-merchants · daily-spending · stats · ai-summary (Groq or fallback)
  └── Budgets ──► /api/budgets
Export ──► /api/export/csv
```

### Tech Stack at a Glance

```
Frontend:  Next.js 14 + React 18 + TypeScript + Tailwind + Chart.js + Lucide
Backend:   FastAPI + SQLAlchemy + SQLite (or PostgreSQL)
OCR:       Tesseract + Pillow preprocessing
AI:        Groq (openai/gpt-oss-120b, set by GROQ_MODEL)
Testing:   pytest with stubbed OCR and model
```

# SpendLens - Smart Expense Tracker

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_Llama_3.3-F55036?style=for-the-badge&logo=groq&logoColor=white)
![Tesseract](https://img.shields.io/badge/Tesseract_OCR-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

> AI-powered expense tracker that scans receipts using OCR + LLM, auto-categorizes spending, and provides visual dashboards with budget alerts.

## How It Works

```
📸 Snap Receipt Photo → 🔍 Tesseract OCR → 🤖 Groq Llama 3.3 → 📊 Structured Data → 💰 Dashboard
```

1. **Upload/snap** a receipt image
2. **Tesseract OCR** extracts raw text from the image
3. **Groq Llama 3.3** parses the OCR text into structured JSON (merchant, items, total, date, category)
4. **Auto-categorized** expense is saved to the database
5. **Visual dashboard** shows spending trends, category breakdown, and budget alerts

## Features

| Feature | Description |
|---------|-------------|
| 📸 Receipt Scanner | Upload or snap receipt photos with AI-powered OCR extraction |
| 🤖 Smart Categorization | LLM auto-categorizes expenses into 9 categories |
| 📊 Visual Dashboard | Doughnut charts, bar graphs, and trend lines for spending analysis |
| 💰 Budget Alerts | Set monthly limits per category with visual progress bars |
| ✏️ Manual Entry | Add expenses manually with merchant, amount, date, and category |
| 📱 Mobile-First | Responsive design with bottom nav for mobile devices |
| 🔍 Filters | Filter expenses by category and month |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Charts | Chart.js + react-chartjs-2 |
| Icons | Lucide React |
| Backend | FastAPI, Python 3.10+ |
| OCR Engine | Tesseract OCR + Pillow (image preprocessing) |
| AI/LLM | Groq Cloud (Llama 3.3 70B) |
| Database | SQLite (local) / PostgreSQL (production) |
| ORM | SQLAlchemy |

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Tesseract OCR (`sudo apt install tesseract-ocr`)
- [Groq API Key](https://console.groq.com/) (free tier available)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Add your GROQ_API_KEY to .env

python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | Groq Cloud API key for Llama 3.3 | Yes (for receipt scanning) |
| `DATABASE_URL` | Database connection string | No (defaults to SQLite) |
| `NEXT_PUBLIC_API_URL` | Backend API URL | No (defaults to `http://localhost:8002`) |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/receipts/scan` | Upload receipt image for OCR + AI extraction |
| `GET` | `/api/expenses` | List expenses (filterable by category, month) |
| `POST` | `/api/expenses` | Add expense manually |
| `PUT` | `/api/expenses/:id` | Update an expense |
| `DELETE` | `/api/expenses/:id` | Delete an expense |
| `GET` | `/api/dashboard/summary` | Spending summary with category breakdown |
| `GET` | `/api/dashboard/monthly-trend` | Monthly spending trend data |
| `GET` | `/api/budgets` | List budget limits |
| `POST` | `/api/budgets` | Set budget limit for a category |
| `GET` | `/health` | Health check |

## Project Structure

```
smart-expense-tracker/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   ├── core/
│   │   ├── ocr.py               # Tesseract OCR + image preprocessing
│   │   ├── llm_extract.py       # Groq Llama 3.3 receipt parsing
│   │   └── database.py          # SQLAlchemy models + DB setup
│   └── api/routes/
│       ├── receipts.py          # Receipt upload + scan endpoint
│       ├── expenses.py          # CRUD operations
│       └── dashboard.py         # Analytics + budget endpoints
├── frontend/
│   ├── src/
│   │   ├── app/page.tsx         # Main app with tab navigation
│   │   ├── components/
│   │   │   ├── ReceiptUpload.tsx # Drag-drop receipt scanner
│   │   │   ├── Dashboard.tsx    # Charts + stats cards
│   │   │   ├── ExpenseList.tsx  # Expense history with details
│   │   │   ├── AddExpenseModal.tsx
│   │   │   └── BudgetManager.tsx
│   │   └── lib/
│   │       ├── api.ts           # API client functions
│   │       └── types.ts         # TypeScript types
│   └── package.json
└── README.md
```

## License

MIT

import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from core.database import get_db, Expense
from core.llm_extract import LLMUnavailable, complete

router = APIRouter()


@router.get("/insights/top-merchants")
def top_merchants(limit: int = 5, db: Session = Depends(get_db)):
    results = (
        db.query(
            Expense.merchant,
            func.sum(Expense.total).label("total"),
            func.count(Expense.id).label("visits"),
        )
        .group_by(Expense.merchant)
        .order_by(func.sum(Expense.total).desc())
        .limit(limit)
        .all()
    )
    return [
        {"merchant": r.merchant, "total": round(r.total, 2), "visits": r.visits}
        for r in results
    ]


@router.get("/insights/daily-spending")
def daily_spending(days: int = 30, db: Session = Depends(get_db)):
    results = (
        db.query(
            func.strftime("%Y-%m-%d", Expense.date).label("day"),
            func.sum(Expense.total).label("total"),
        )
        .group_by(func.strftime("%Y-%m-%d", Expense.date))
        .order_by(func.strftime("%Y-%m-%d", Expense.date).desc())
        .limit(days)
        .all()
    )
    return [{"day": r.day, "total": round(r.total, 2)} for r in reversed(results)]


@router.get("/insights/ai-summary")
async def ai_summary(db: Session = Depends(get_db)):
    expenses = db.query(Expense).order_by(Expense.date.desc()).limit(50).all()
    if not expenses:
        return {"summary": "No expenses to analyze yet. Start adding expenses to get AI insights!"}

    expense_data = []
    for e in expenses:
        expense_data.append(f"- {e.date}: {e.merchant} | ${e.total:.2f} | {e.category}")

    expense_text = "\n".join(expense_data)
    total = sum(e.total for e in expenses)

    categories = {}
    for e in expenses:
        categories[e.category] = categories.get(e.category, 0) + e.total

    prompt = f"""Analyze this person's spending data and give brief, actionable financial insights.

Total spent: ${total:.2f}
Category breakdown: {json.dumps({k: f"${v:.2f}" for k, v in sorted(categories.items(), key=lambda x: -x[1])})}

Recent transactions:
{expense_text}

Give exactly 4-5 bullet points. Be specific with numbers. Include:
1. Biggest spending category and if it seems high
2. A specific saving tip based on their patterns
3. Any unusual or notable transactions
4. A positive observation about their spending
Keep each point under 20 words. No markdown formatting."""

    try:
        summary = await complete([{"role": "user", "content": prompt}], temperature=0.3, max_tokens=2048)
        if not summary:
            raise LLMUnavailable("empty reply")
        return {"summary": summary}
    except Exception:
        tips = []
        top_cat = max(categories, key=categories.get) if categories else "Unknown"
        tips.append(f"Your biggest category is {top_cat} at ${categories.get(top_cat, 0):.2f}")
        tips.append(f"You've made {len(expenses)} transactions totaling ${total:.2f}")
        if len(categories) > 1:
            smallest = min(categories, key=categories.get)
            tips.append(f"Lowest spending: {smallest} at ${categories[smallest]:.2f}")
        tips.append("Set budget limits to track spending against your goals")
        return {"summary": "\n".join(f"• {t}" for t in tips)}


@router.get("/insights/stats")
def advanced_stats(db: Session = Depends(get_db)):
    expenses = db.query(Expense).all()
    if not expenses:
        return {"highest": None, "lowest": None, "streak": 0, "categories_used": 0}

    totals = [e.total for e in expenses]
    categories = set(e.category for e in expenses)
    dates = sorted(set(str(e.date) for e in expenses))

    highest = max(expenses, key=lambda e: e.total)
    lowest = min(expenses, key=lambda e: e.total)

    return {
        "highest": {"merchant": highest.merchant, "total": highest.total, "date": str(highest.date)},
        "lowest": {"merchant": lowest.merchant, "total": lowest.total, "date": str(lowest.date)},
        "total_merchants": len(set(e.merchant for e in expenses)),
        "categories_used": len(categories),
        "days_tracked": len(dates),
        "avg_daily": round(sum(totals) / max(len(dates), 1), 2),
    }

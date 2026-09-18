from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from core.database import get_db, Expense, Budget

router = APIRouter()

CATEGORIES = [
    "Groceries", "Dining", "Shopping", "Transportation",
    "Healthcare", "Entertainment", "Utilities", "Education", "Other",
]


@router.get("/dashboard/summary")
def get_summary(
    month: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Expense)
    # Budgets are monthly limits, so they are always compared against one
    # month's spending: the requested month, or the current one. Comparing them
    # with all-time totals raised alerts that grew forever.
    budget_month = datetime.now()
    if month:
        try:
            dt = datetime.strptime(month, "%Y-%m")
            query = query.filter(
                extract("year", Expense.date) == dt.year,
                extract("month", Expense.date) == dt.month,
            )
            budget_month = dt
        except ValueError:
            pass

    expenses = query.all()
    total_spent = sum(e.total for e in expenses)
    count = len(expenses)

    category_totals = {}
    for e in expenses:
        cat = e.category or "Other"
        category_totals[cat] = category_totals.get(cat, 0) + e.total

    category_breakdown = [
        {"category": cat, "total": round(amount, 2), "count": sum(1 for e in expenses if e.category == cat)}
        for cat, amount in sorted(category_totals.items(), key=lambda x: -x[1])
    ]

    month_rows = (
        db.query(Expense.category, func.sum(Expense.total))
        .filter(
            extract("year", Expense.date) == budget_month.year,
            extract("month", Expense.date) == budget_month.month,
        )
        .group_by(Expense.category)
        .all()
    )
    month_totals: dict[str, float] = {}
    for cat, spent in month_rows:
        key = cat or "Other"
        month_totals[key] = month_totals.get(key, 0) + (spent or 0)

    budgets = {b.category: b.monthly_limit for b in db.query(Budget).all()}
    budget_alerts = []
    for cat, spent in month_totals.items():
        if cat in budgets:
            limit = budgets[cat]
            pct = (spent / limit) * 100 if limit > 0 else 0
            if pct >= 80:
                budget_alerts.append({
                    "category": cat,
                    "spent": round(spent, 2),
                    "limit": limit,
                    "percentage": round(pct, 1),
                    "status": "exceeded" if pct >= 100 else "warning",
                })

    return {
        "total_spent": round(total_spent, 2),
        "transaction_count": count,
        "average_transaction": round(total_spent / count, 2) if count > 0 else 0,
        "category_breakdown": category_breakdown,
        "budget_alerts": budget_alerts,
    }


@router.get("/dashboard/monthly-trend")
def monthly_trend(months: int = Query(default=6, le=12), db: Session = Depends(get_db)):
    results = (
        db.query(
            func.strftime("%Y-%m", Expense.date).label("month"),
            func.sum(Expense.total).label("total"),
            func.count(Expense.id).label("count"),
        )
        .group_by(func.strftime("%Y-%m", Expense.date))
        .order_by(func.strftime("%Y-%m", Expense.date).desc())
        .limit(months)
        .all()
    )

    return [
        {"month": r.month, "total": round(r.total, 2), "count": r.count}
        for r in reversed(results)
    ]


@router.get("/dashboard/category-trend")
def category_trend(months: int = Query(default=6, le=12), db: Session = Depends(get_db)):
    results = (
        db.query(
            func.strftime("%Y-%m", Expense.date).label("month"),
            Expense.category,
            func.sum(Expense.total).label("total"),
        )
        .group_by(func.strftime("%Y-%m", Expense.date), Expense.category)
        .order_by(func.strftime("%Y-%m", Expense.date))
        .all()
    )

    months_set = sorted(set(r.month for r in results))[-months:]
    trend = {}
    for r in results:
        if r.month in months_set:
            if r.month not in trend:
                trend[r.month] = {}
            trend[r.month][r.category] = round(r.total, 2)

    return [{"month": m, **trend[m]} for m in months_set]


@router.get("/budgets")
def list_budgets(db: Session = Depends(get_db)):
    budgets = db.query(Budget).all()
    return [{"id": b.id, "category": b.category, "monthly_limit": b.monthly_limit} for b in budgets]


@router.post("/budgets")
def set_budget(category: str, monthly_limit: float, db: Session = Depends(get_db)):
    budget = db.query(Budget).filter(Budget.category == category).first()
    if budget:
        budget.monthly_limit = monthly_limit
    else:
        budget = Budget(category=category, monthly_limit=monthly_limit)
        db.add(budget)
    db.commit()
    db.refresh(budget)
    return {"id": budget.id, "category": budget.category, "monthly_limit": budget.monthly_limit}


@router.delete("/budgets/{category}")
def delete_budget(category: str, db: Session = Depends(get_db)):
    budget = db.query(Budget).filter(Budget.category == category).first()
    if not budget:
        return {"message": "Not found"}
    db.delete(budget)
    db.commit()
    return {"message": "Deleted"}

import json
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from core.database import get_db, Expense

router = APIRouter()


class ExpenseCreate(BaseModel):
    merchant: str
    date: str
    total: float
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    category: str = "Other"
    items: list[dict] = []


class ExpenseUpdate(BaseModel):
    merchant: Optional[str] = None
    date: Optional[str] = None
    total: Optional[float] = None
    category: Optional[str] = None
    items: Optional[list[dict]] = None


def serialize_expense(e: Expense) -> dict:
    return {
        "id": e.id,
        "merchant": e.merchant,
        "date": str(e.date),
        "total": e.total,
        "subtotal": e.subtotal,
        "tax": e.tax,
        "category": e.category,
        "items": json.loads(e.items) if e.items else [],
        "receipt_image": e.receipt_image,
        "created_at": str(e.created_at),
    }


@router.get("/expenses")
def list_expenses(
    category: Optional[str] = None,
    month: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(Expense)
    if category:
        query = query.filter(Expense.category == category)
    if month:
        try:
            dt = datetime.strptime(month, "%Y-%m")
            query = query.filter(
                extract("year", Expense.date) == dt.year,
                extract("month", Expense.date) == dt.month,
            )
        except ValueError:
            pass
    expenses = query.order_by(Expense.date.desc()).offset(offset).limit(limit).all()
    return [serialize_expense(e) for e in expenses]


@router.post("/expenses")
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db)):
    try:
        expense_date = datetime.strptime(data.date, "%Y-%m-%d").date()
    except ValueError:
        expense_date = date.today()

    expense = Expense(
        merchant=data.merchant,
        date=expense_date,
        total=data.total,
        subtotal=data.subtotal,
        tax=data.tax,
        category=data.category,
        items=json.dumps(data.items),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return serialize_expense(expense)


@router.put("/expenses/{expense_id}")
def update_expense(expense_id: int, data: ExpenseUpdate, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(404, "Expense not found")

    if data.merchant is not None:
        expense.merchant = data.merchant
    if data.date is not None:
        try:
            expense.date = datetime.strptime(data.date, "%Y-%m-%d").date()
        except ValueError:
            pass
    if data.total is not None:
        expense.total = data.total
    if data.category is not None:
        expense.category = data.category
    if data.items is not None:
        expense.items = json.dumps(data.items)

    db.commit()
    db.refresh(expense)
    return serialize_expense(expense)


@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(404, "Expense not found")
    db.delete(expense)
    db.commit()
    return {"message": "Deleted"}

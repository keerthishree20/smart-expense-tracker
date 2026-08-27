import csv
import io
import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.database import get_db, Expense

router = APIRouter()


@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db)):
    expenses = db.query(Expense).order_by(Expense.date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Merchant", "Category", "Total", "Subtotal", "Tax", "Items"])

    for e in expenses:
        items = json.loads(e.items) if e.items else []
        items_str = "; ".join(f"{i.get('name', '')} x{i.get('quantity', 1)} (${i.get('price', 0):.2f})" for i in items)
        writer.writerow([
            str(e.date),
            e.merchant,
            e.category,
            f"{e.total:.2f}",
            f"{e.subtotal:.2f}" if e.subtotal else "",
            f"{e.tax:.2f}" if e.tax else "",
            items_str,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenses.csv"},
    )

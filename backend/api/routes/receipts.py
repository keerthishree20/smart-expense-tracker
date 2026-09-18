import json
import uuid
import os
from datetime import date, datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from core.ocr import extract_text
from core.llm_extract import LLMUnavailable, extract_receipt_data
from core.database import get_db, Expense

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/receipts/scan")
async def scan_receipt(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    ocr_text = extract_text(filepath)
    if not ocr_text:
        raise HTTPException(422, "Could not extract text from receipt")

    try:
        extracted = await extract_receipt_data(ocr_text)
    except LLMUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc

    expense_date = date.today()
    if extracted.get("date"):
        try:
            expense_date = datetime.strptime(extracted["date"], "%Y-%m-%d").date()
        except ValueError:
            pass

    expense = Expense(
        merchant=extracted.get("merchant", "Unknown"),
        date=expense_date,
        total=float(extracted.get("total", 0)),
        subtotal=float(extracted.get("subtotal") or 0),
        tax=float(extracted.get("tax") or 0),
        category=extracted.get("category", "Other"),
        items=json.dumps(extracted.get("items", [])),
        receipt_image=filename,
        raw_ocr_text=ocr_text,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    return {
        "id": expense.id,
        "merchant": expense.merchant,
        "date": str(expense.date),
        "total": expense.total,
        "subtotal": expense.subtotal,
        "tax": expense.tax,
        "category": expense.category,
        "items": json.loads(expense.items),
        "raw_ocr_text": ocr_text,
    }

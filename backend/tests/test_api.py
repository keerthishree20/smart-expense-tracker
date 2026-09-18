"""The API end to end, with OCR and the model replaced by stand-ins. No network."""

import asyncio
import datetime as dt

import pytest

from api.routes import receipts
from core import llm_extract

TODAY = dt.date.today()
LAST_YEAR = TODAY.replace(year=TODAY.year - 1, day=1)


def add(client, total, category="Dining", day=TODAY, merchant="Cafe"):
    r = client.post("/api/expenses", json={"merchant": merchant, "total": total, "category": category, "date": day.isoformat()})
    assert r.status_code == 200
    return r.json()


def set_budget(client, category, limit):
    assert client.post("/api/budgets", params={"category": category, "monthly_limit": limit}).status_code == 200


# ---- expenses --------------------------------------------------------------


def test_create_list_update_delete(client):
    e = add(client, 12.5, merchant="Tea Stall")
    assert [x["merchant"] for x in client.get("/api/expenses").json()] == ["Tea Stall"]
    assert client.put(f"/api/expenses/{e['id']}", json={"total": 20}).status_code == 200
    assert client.get("/api/expenses").json()[0]["total"] == 20
    assert client.delete(f"/api/expenses/{e['id']}").status_code == 200
    assert client.get("/api/expenses").json() == []


def test_summary_totals_and_breakdown(client):
    add(client, 30, "Dining")
    add(client, 70, "Groceries")
    s = client.get("/api/dashboard/summary").json()
    assert s["total_spent"] == 100
    assert s["transaction_count"] == 2
    assert {c["category"]: c["total"] for c in s["category_breakdown"]} == {"Dining": 30, "Groceries": 70}


# ---- budget alerts ---------------------------------------------------------


def test_old_months_do_not_count_against_this_months_budget(client):
    """The bug that was fixed: a monthly limit compared with all-time spending."""
    set_budget(client, "Dining", 100)
    add(client, 500, day=LAST_YEAR)
    add(client, 50)
    assert client.get("/api/dashboard/summary").json()["budget_alerts"] == []


def test_a_warning_at_80_percent_and_exceeded_at_100(client):
    set_budget(client, "Dining", 100)
    add(client, 85)
    (alert,) = client.get("/api/dashboard/summary").json()["budget_alerts"]
    assert alert["status"] == "warning" and alert["percentage"] == 85
    add(client, 20)
    (alert,) = client.get("/api/dashboard/summary").json()["budget_alerts"]
    assert alert["status"] == "exceeded"


def test_a_requested_month_is_judged_on_that_month(client):
    set_budget(client, "Dining", 100)
    add(client, 500, day=LAST_YEAR)
    (alert,) = client.get(f"/api/dashboard/summary?month={LAST_YEAR:%Y-%m}").json()["budget_alerts"]
    assert alert["spent"] == 500 and alert["status"] == "exceeded"


# ---- receipt scanning ------------------------------------------------------


def test_a_scanned_receipt_becomes_an_expense(client, monkeypatch):
    monkeypatch.setattr(receipts, "extract_text", lambda path: "FRESH MART TOTAL 202.65")

    async def fake_extract(text):
        return {"merchant": "Fresh Mart", "date": "2026-09-14", "items": [{"name": "Milk", "quantity": 2, "price": 32}],
                "subtotal": 193, "tax": 9.65, "total": 202.65, "category": "Groceries"}

    monkeypatch.setattr(receipts, "extract_receipt_data", fake_extract)
    r = client.post("/api/receipts/scan", files={"file": ("r.png", b"\x89PNG fake", "image/png")})
    assert r.status_code == 200
    (e,) = client.get("/api/expenses").json()
    assert e["merchant"] == "Fresh Mart" and e["total"] == 202.65 and e["category"] == "Groceries"


def test_a_model_problem_is_a_503_with_the_reason(client, monkeypatch):
    monkeypatch.setattr(receipts, "extract_text", lambda path: "TOTAL 5.00")

    async def unavailable(text):
        raise llm_extract.LLMUnavailable("Groq has no model named 'old'; it was most likely retired.")

    monkeypatch.setattr(receipts, "extract_receipt_data", unavailable)
    r = client.post("/api/receipts/scan", files={"file": ("r.png", b"x", "image/png")})
    assert r.status_code == 503 and "retired" in r.json()["detail"]


def test_non_images_are_refused(client):
    r = client.post("/api/receipts/scan", files={"file": ("r.txt", b"hello", "text/plain")})
    assert r.status_code == 400


def test_unreadable_receipts_are_refused(client, monkeypatch):
    monkeypatch.setattr(receipts, "extract_text", lambda path: "")
    r = client.post("/api/receipts/scan", files={"file": ("r.png", b"x", "image/png")})
    assert r.status_code == 422


# ---- the model wrapper -----------------------------------------------------


def test_no_key_is_a_clear_error():
    with pytest.raises(llm_extract.LLMUnavailable, match="GROQ_API_KEY"):
        asyncio.run(llm_extract.extract_receipt_data("TOTAL 5.00"))


def test_the_prompt_uses_the_current_year_and_code_fences_are_stripped(monkeypatch):
    seen = {}

    async def fake_complete(messages, **kwargs):
        seen["prompt"] = messages[0]["content"]
        return '```json\n{"merchant": "X", "total": 1}\n```'

    monkeypatch.setattr(llm_extract, "complete", fake_complete)
    assert asyncio.run(llm_extract.extract_receipt_data("x")) == {"merchant": "X", "total": 1}
    assert f"assume {TODAY.year}" in seen["prompt"] and "{year}" not in seen["prompt"]


def test_a_non_json_reply_is_a_clear_error(monkeypatch):
    async def fake_complete(messages, **kwargs):
        return "sorry, I cannot read that"

    monkeypatch.setattr(llm_extract, "complete", fake_complete)
    with pytest.raises(llm_extract.LLMUnavailable, match="not valid JSON"):
        asyncio.run(llm_extract.extract_receipt_data("x"))


def test_the_ai_summary_falls_back_without_a_key(client):
    add(client, 40, "Dining")
    summary = client.get("/api/insights/ai-summary").json()["summary"]
    assert "Dining" in summary

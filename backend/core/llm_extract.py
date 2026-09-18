import json
import os
from datetime import date

# Groq retires models on a rolling schedule. The original llama-3.3-70b-versatile
# was decommissioned, which broke every scan, so the model is a setting: the next
# retirement is an .env edit, not a code change.
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


class LLMUnavailable(RuntimeError):
    """The model could not be reached: no key, a retired model, or a Groq error."""


EXTRACTION_PROMPT = """You are a receipt parser. Given raw OCR text from a receipt, extract structured data as JSON.

Return ONLY valid JSON with this exact schema:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "item name", "quantity": 1, "price": 9.99}
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "category": "one of: Groceries, Dining, Shopping, Transportation, Healthcare, Entertainment, Utilities, Education, Other"
}

Rules:
- If a field is unclear, make your best guess from context
- Date must be YYYY-MM-DD format. If year is missing, assume {year}
- All prices must be numbers, not strings
- Category must be one of the listed options
- If no items can be identified, return an empty items array but still extract merchant/total/date if visible"""


def _get_client():
    from groq import AsyncGroq
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise LLMUnavailable("No GROQ_API_KEY set. Add one to backend/.env from https://console.groq.com/keys")
    return AsyncGroq(api_key=key)


async def complete(messages: list[dict], *, temperature: float, max_tokens: int) -> str:
    """One chat completion, with Groq's failures turned into LLMUnavailable.

    max_tokens is generous on purpose: reasoning models spend part of it
    thinking before they answer, and a tight cap returns an empty reply.
    """
    from groq import APIStatusError, NotFoundError

    try:
        response = await _get_client().chat.completions.create(
            model=MODEL, messages=messages, temperature=temperature, max_tokens=max_tokens,
        )
    except NotFoundError as exc:
        raise LLMUnavailable(
            f"Groq has no model named {MODEL!r}; it was most likely retired. Set GROQ_MODEL "
            f"in backend/.env to a current one from https://console.groq.com/docs/models"
        ) from exc
    except APIStatusError as exc:
        raise LLMUnavailable(f"Groq returned {exc.status_code}: {exc.message}") from exc
    return (response.choices[0].message.content or "").strip()


async def extract_receipt_data(ocr_text: str) -> dict:
    # replace(), not format(): the prompt's JSON example is full of braces.
    prompt = EXTRACTION_PROMPT.replace("{year}", str(date.today().year))
    content = await complete(
        [
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"OCR Text:\n{ocr_text}"},
        ],
        temperature=0.1,
        max_tokens=4096,
    )
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise LLMUnavailable("The model's reply was not valid JSON. Try the scan again.") from exc


async def categorize_expense(merchant: str, items: list[dict]) -> str:
    item_names = ", ".join(item.get("name", "") for item in items[:10])
    return await complete(
        [
            {
                "role": "user",
                "content": f"Categorize this expense into exactly one category.\n\nMerchant: {merchant}\nItems: {item_names}\n\nCategories: Groceries, Dining, Shopping, Transportation, Healthcare, Entertainment, Utilities, Education, Other\n\nReturn ONLY the category name, nothing else.",
            }
        ],
        temperature=0,
        max_tokens=1024,
    )

import json
import os

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
- Date must be YYYY-MM-DD format. If year is missing, assume 2025
- All prices must be numbers, not strings
- Category must be one of the listed options
- If no items can be identified, return an empty items array but still extract merchant/total/date if visible"""


def _get_client():
    from groq import AsyncGroq
    return AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))


async def extract_receipt_data(ocr_text: str) -> dict:
    client = _get_client()
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": f"OCR Text:\n{ocr_text}"},
        ],
        temperature=0.1,
        max_tokens=1024,
    )

    content = response.choices[0].message.content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0]

    return json.loads(content)


async def categorize_expense(merchant: str, items: list[dict]) -> str:
    client = _get_client()
    item_names = ", ".join(item.get("name", "") for item in items[:10])
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": f"Categorize this expense into exactly one category.\n\nMerchant: {merchant}\nItems: {item_names}\n\nCategories: Groceries, Dining, Shopping, Transportation, Healthcare, Entertainment, Utilities, Education, Other\n\nReturn ONLY the category name, nothing else.",
            }
        ],
        temperature=0,
        max_tokens=20,
    )
    return response.choices[0].message.content.strip()

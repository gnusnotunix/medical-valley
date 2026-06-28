import os
import json

import pytesseract
from PIL import Image

from google import genai
from google.genai import types

SYSTEM_PROMPT = """Ты — модуль извлечения данных MedPartners. Извлеки из сырого OCR-текста медицинские услуги и цены. Строго раздели price_resident_kzt и price_nonresident_kzt. Верни СТРОГО валидный JSON по схеме:
{
  "clinic_name": "String или null",
  "document_date": "String (YYYY-MM-DD) или null",
  "services": [
    {
      "service_code_source": "String или null",
      "category": "String или null",
      "service_name_raw": "String",
      "price_resident_kzt": "Integer",
      "price_nonresident_kzt": "Integer или null"
    }
  ],
  "parse_log": "String или null"
}"""

GEMINI_MODEL = "gemini-2.5-flash"
TESSERACT_LANGS = "rus+eng"


def _empty_payload(log_message):
    return {
        "clinic_name": None,
        "document_date": None,
        "services": [],
        "parse_log": log_message,
    }


def extract_raw_text(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Файл не найден: {file_path}")
    image = Image.open(file_path)
    raw_text = pytesseract.image_to_string(image, lang=TESSERACT_LANGS)
    return raw_text.strip()


def structure_text_with_gemini(raw_text):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return _empty_payload("Ошибка: переменная окружения GEMINI_API_KEY не задана.")

    client = genai.Client(api_key=api_key)

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        temperature=0.1,
    )

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=raw_text,
        config=config,
    )

    parsed = json.loads(response.text)
    parsed.setdefault("clinic_name", None)
    parsed.setdefault("document_date", None)
    parsed.setdefault("services", [])
    parsed.setdefault("parse_log", None)
    return parsed


def process_price_file(file_path):
    try:
        raw_text = extract_raw_text(file_path)
    except Exception as exc:
        return _empty_payload(f"Ошибка OCR-движка: {exc}")

    if not raw_text:
        return _empty_payload("Ошибка: OCR не распознал текст в документе (пустой результат).")

    try:
        result = structure_text_with_gemini(raw_text)
    except json.JSONDecodeError as exc:
        return _empty_payload(f"Ошибка парсинга JSON от модели: {exc}")
    except Exception as exc:
        return _empty_payload(f"Ошибка вызова Gemini API: {exc}")

    return result

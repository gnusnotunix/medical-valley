import os
import json
from datetime import datetime, date

import cv2
import numpy as np
import easyocr
from google import genai
from google.genai import types

from app.services.extractors import extract_any

_reader = None

SYSTEM_PROMPT = """Ты парсер медицинских прайс-листов. На входе текст из документа (русский/английский, возможны артефакты OCR, таблицы разделены символом | или сохранены с оригинальными отступами/пробелами как в исходной таблице).
Верни СТРОГО валидный JSON по схеме, без markdown и пояснений:
{
  "clinic_name": "string|null",
  "city": "string|null",
  "document_date": "YYYY-MM-DD|null",
  "currency_original": "KZT|USD|RUB",
  "items": [
    {
      "service_name_raw": "string",
      "service_code_source": "string|null",
      "category": "string|null",
      "price_resident": number|null,
      "price_resident_raw": "string|null",
      "price_nonresident": number|null
    }
  ]
}
Правила:
- Извлекай ВСЕ позиции услуга+цена. Чини очевидные артефакты в названиях.
- В исходнике название услуги для строки с номером и ценами часто стоит на СОСЕДНЕЙ строке (объединённая ячейка в исходной таблице на 2+ строк-вариантов: "первичная"/"повторная" и т.п.). Свяжи каждую ценовую строку (номер + цены) с ближайшим подходящим названием услуги выше или ниже по тексту, даже если они физически разделены переносом строки.
- Если общее название услуги относится сразу к нескольким пронумерованным вариантам (например "первичная"/"повторная", "средней степени тяжести"/"тяжелой степени тяжести"), формируй service_name_raw как "Общее название, вариант" (например "Консультация врача (дмн, профессора), первичная").
- price_resident — только число без пробелов и символов валюты, если цена однозначное число.
- Если цена резидента НЕ является чистым числом (например "по Cito", "договорная", "+20%", диапазон "1000-2000", "13-800") — поставь price_resident: null и продублируй исходный текст цены как есть в price_resident_raw. Если цена обычное число — price_resident_raw оставь null.
- price_nonresident заполняй только если в документе явно две цены (резидент/нерезидент), иначе null.
- Если валюта не указана явно — KZT (тенге).
- service_code_source — код услуги из источника (U1.1, DR3.1, C-1, A01.003.000 и т.п.), если есть, иначе null.
- category — название раздела прайса (после "Раздел"/"Подраздел"), если строки сгруппированы по разделам, иначе null.
- Игнорируй повторяющиеся заголовки таблицы ("Цена для граждан...", "Единица измерения" и т.п.), встречающиеся на каждой странице — это не позиции прайса.
- Если документ не содержит услуг/цен — верни items: []."""


def get_reader():
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(["ru", "en"], gpu=False)
    return _reader


def preprocess_image(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    h, w = gray.shape[:2]
    if w < 1600:
        scale = 1600 / w
        gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
    gray = cv2.fastNlMeansDenoising(gray, h=10)
    gray = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11)
    return gray


def ocr_image(img):
    processed = preprocess_image(img)
    lines = get_reader().readtext(processed, detail=0, paragraph=True)
    return "\n".join(lines).strip()


def _try_parse_json(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`").lstrip("json")
    import re
    cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    items_start = cleaned.find('"items"')
    if items_start == -1:
        return {"clinic_name": None, "city": None, "document_date": None, "currency_original": None, "items": []}
    array_start = cleaned.find("[", items_start)
    if array_start == -1:
        return {"clinic_name": None, "city": None, "document_date": None, "currency_original": None, "items": []}
    depth, last_end = 0, array_start
    in_string, escape = False, False
    for i in range(array_start, len(cleaned)):
        ch = cleaned[i]
        if escape:
            escape = False
        elif ch == "\\":
            escape = True
        elif ch == '"':
            in_string = not in_string
        elif not in_string:
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    last_end = i + 1
    items_json = cleaned[array_start:last_end] + "]"
    try:
        items = json.loads(items_json)
    except:
        items = []
    def _extract_field(field):
        m = re.search(rf'"{field}"\s*:\s*"([^"]*)"', cleaned[:array_start])
        return m.group(1) if m else None
    return {
        "clinic_name": _extract_field("clinic_name"),
        "city": _extract_field("city"),
        "document_date": _extract_field("document_date"),
        "currency_original": _extract_field("currency_original") or "KZT",
        "items": items,
    }


_client = None

# Модель можно переключить без правки кода: GEMINI_MODEL=gemini-2.5-flash-lite — дешевле и быстрее для отладки,
# gemini-2.5-flash (по умолчанию) — для финального прогона, когда качество важнее цены.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

# DRY_RUN=1 — полностью отключает реальные вызовы Gemini. Возвращает фейковые позиции по каждому чанку,
# чтобы можно было прогнать весь пайплайн (extract -> chunk -> normalize -> API-ответ) и проверить,
# что код не падает и FastAPI отвечает корректно, не потратив ни цента.
DRY_RUN = os.environ.get("DRY_RUN", "0") == "1"


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def _dry_run_response(raw_text, file_name):
    """Фейковый, но структурно валидный ответ — для бесплатного тестирования пайплайна."""
    lines = [l for l in raw_text.split("\n") if l.strip()]
    items = []
    for i, line in enumerate(lines[:5]):
        items.append({
            "service_name_raw": f"[DRY_RUN] {line[:60]}",
            "service_code_source": None,
            "category": None,
            "price_resident": 1000 + i * 100,
            "price_resident_raw": None,
            "price_nonresident": None,
        })
    return {
        "clinic_name": f"[DRY_RUN] {file_name}",
        "city": None,
        "document_date": None,
        "currency_original": "KZT",
        "items": items,
    }


def _call_gemini(raw_text, file_name, attempt=1, deadline=None):
    import time
    if DRY_RUN:
        time.sleep(0.05)  # имитация задержки, чтобы видеть реалистичный тайминг в логах
        return _dry_run_response(raw_text, file_name)
    client = _get_client()
    try:
        resp = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[f"Файл: {file_name}\n\nТекст документа:\n{raw_text}"],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0,
                max_output_tokens=32768,
                thinking_config=types.ThinkingConfig(thinking_budget=0),  # <-- ОТКЛЮЧАЕТ thinking
            ),
        )
        finish_reason = None
        try:
            finish_reason = resp.candidates[0].finish_reason
        except Exception:
            pass
        if finish_reason is not None and "MAX_TOKENS" in str(finish_reason):
            lines = raw_text.split("\n")
            if len(lines) > 20:
                mid = len(lines) // 2
                part1 = _call_gemini("\n".join(lines[:mid]), file_name, deadline=deadline)
                part2 = _call_gemini("\n".join(lines[mid:]), file_name, deadline=deadline)
                return {
                    "clinic_name": part1.get("clinic_name") or part2.get("clinic_name"),
                    "city": part1.get("city") or part2.get("city"),
                    "document_date": part1.get("document_date") or part2.get("document_date"),
                    "currency_original": part1.get("currency_original") or part2.get("currency_original"),
                    "items": part1.get("items", []) + part2.get("items", []),
                }
        return _try_parse_json(resp.text)
    except Exception as exc:
        exc_str = str(exc)
        # "Credits depleted" — баланс кончился. Ретраить бессмысленно: следующая попытка вернёт то же самое
        # и просто потратит время впустую (5 попыток × 6с = 30с зря на каждый чанк). Сдаёмся сразу.
        is_credits_depleted = "prepayment credits are depleted" in exc_str or "credits are depleted" in exc_str
        if is_credits_depleted:
            raise RuntimeError("Баланс Gemini API исчерпан (prepayment credits depleted) — нужно пополнить на aistudio.google.com") from exc
        is_network = "SSL" in exc_str or "ConnectionError" in exc_str or "Max retries exceeded" in exc_str
        is_rate_limit = "429" in exc_str or "RESOURCE_EXHAUSTED" in exc_str
        is_overloaded = "503" in exc_str or "UNAVAILABLE" in exc_str
        time_left = (deadline - time.time()) if deadline else None
        max_attempts = 5 if deadline is None else 3
        if attempt < max_attempts and (is_network or is_rate_limit or is_overloaded) and (time_left is None or time_left > 5):
            sleep_for = min(1.5 * attempt, 6)
            if time_left is not None:
                sleep_for = min(sleep_for, max(0, time_left - 2))
            time.sleep(sleep_for)
            return _call_gemini(raw_text, file_name, attempt + 1, deadline=deadline)
        raise


def _call_gemini_logged(chunk, file_name, idx, total, deadline=None):
    import time
    t0 = time.time()
    try:
        result = _call_gemini(chunk, file_name, deadline=deadline)
        n = len(result.get("items", []))
        print(f"  [{file_name}] чанк {idx}/{total}: {time.time()-t0:.1f}с, позиций={n}")
        return result
    except Exception as exc:
        print(f"  [{file_name}] чанк {idx}/{total}: ОШИБКА после {time.time()-t0:.1f}с: {exc}")
        return {"items": []}


CHUNK_TARGET_LINES = 130   # целевой размер чанка в строках
CHUNK_HARD_MAX_LINES = 160  # жёсткий потолок: режем здесь, даже если номер не найден рядом
CHUNK_BOUNDARY_LOOKAHEAD = 20  # сколько строк вперёд можно подождать удобную границу (номер пункта)
MAX_PARALLEL_GEMINI_CALLS = 15  # на Tier 1 RPM не узкое место — поднимаем параллелизм


def structure_text_with_gemini(raw_text, file_name, deadline=None):
    from concurrent.futures import ThreadPoolExecutor
    import re
    lines = [l for l in raw_text.split("\n") if l.strip()]
    if len(lines) <= 100:
        return _call_gemini(raw_text, file_name, deadline=deadline)

    item_start_re = re.compile(r"^\s{0,6}\d{1,3}\s")
    chunks, current = [], []
    i = 0
    n = len(lines)
    while i < n:
        current.append(lines[i])
        i += 1
        if len(current) < CHUNK_TARGET_LINES:
            continue
        # Достигли целевого размера — ищем удобную границу (начало новой позиции) в пределах lookahead
        cut_at = None
        for j in range(i, min(i + CHUNK_BOUNDARY_LOOKAHEAD, n)):
            if item_start_re.match(lines[j]):
                cut_at = j
                break
        if cut_at is not None:
            current.extend(lines[i:cut_at])
            i = cut_at
            chunks.append("\n".join(current))
            current = []
        elif len(current) >= CHUNK_HARD_MAX_LINES:
            # удобной границы не нашлось — режем жёстко, не даём чанку расти бесконечно
            chunks.append("\n".join(current))
            current = []
    if current:
        chunks.append("\n".join(current))

    total = len(chunks)
    print(f"[{file_name}] чанкинг: {total} чанков (~{CHUNK_TARGET_LINES} строк каждый)")

    with ThreadPoolExecutor(max_workers=min(total, MAX_PARALLEL_GEMINI_CALLS)) as pool:
        results = list(pool.map(
            lambda args: _call_gemini_logged(args[1], file_name, args[0] + 1, total, deadline=deadline),
            enumerate(chunks)
        ))
    merged = {"clinic_name": None, "city": None, "document_date": None, "currency_original": None, "items": []}
    for r in results:
        if not merged["clinic_name"]:
            merged["clinic_name"] = r.get("clinic_name")
        if not merged["city"]:
            merged["city"] = r.get("city")
        if not merged["document_date"]:
            merged["document_date"] = r.get("document_date")
        if not merged["currency_original"]:
            merged["currency_original"] = r.get("currency_original")
        merged["items"].extend(r.get("items", []))
    return merged


def _to_number(value):
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_items(parsed, currency):
    items = []
    counters = {"skipped_no_name": 0, "nonnumeric_price": 0, "zero_price": 0, "nonres_below_res": 0}
    for raw in parsed.get("items", []):
        name = (raw.get("service_name_raw") or "").strip()
        if not name:
            counters["skipped_no_name"] += 1
            continue
        price_res = _to_number(raw.get("price_resident"))
        price_non = _to_number(raw.get("price_nonresident"))
        price_raw = (raw.get("price_resident_raw") or "").strip()
        verification_note = None
        if price_res is None or price_res <= 0:
            if price_raw:
                counters["nonnumeric_price"] += 1
                verification_note = f"Цена в источнике: \"{price_raw}\" (требует ручного ввода)"
            else:
                counters["zero_price"] += 1
                verification_note = "Цена не распознана как число (требует ручной проверки)"
        if price_non is not None and price_res is not None and price_non < price_res:
            counters["nonres_below_res"] += 1
            note = "Цена нерезидента ниже резидента"
            verification_note = f"{verification_note}; {note}" if verification_note else note
        items.append({
            "service_name_raw": name,
            "service_code_source": raw.get("service_code_source"),
            "category": raw.get("category"),
            "service_id": None,
            "price_resident_kzt": price_res if currency == "KZT" else None,
            "price_nonresident_kzt": price_non if currency == "KZT" else None,
            "price_original": price_res,
            "price_nonresident_original": price_non,
            "currency_original": currency,
            "is_verified": False,
            "verification_note": verification_note,
        })

    log = []
    if counters["nonnumeric_price"]:
        log.append(f"Нечисловых цен (договорная/по запросу и т.п.): {counters['nonnumeric_price']}")
    if counters["zero_price"]:
        log.append(f"Цен не распознано: {counters['zero_price']}")
    if counters["nonres_below_res"]:
        log.append(f"Цена нерезидента ниже резидента: {counters['nonres_below_res']}")
    if counters["skipped_no_name"]:
        log.append(f"Пропущено строк без названия: {counters['skipped_no_name']}")
    return items, log


def _validate_date(value, log):
    if not value:
        return None
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        log.append(f"Дата прайса нераспознана: {value}")
        return None
    if parsed > date.today():
        log.append("Дата прайса в будущем")
    return value


def _empty_payload(file_name, file_format, raw_content, message):
    return {
        "file_name": file_name,
        "file_format": file_format,
        "clinic_name": None,
        "city": None,
        "effective_date": None,
        "parsed_at": datetime.utcnow().isoformat(),
        "parse_status": "error",
        "parse_log": message,
        "raw_content": raw_content,
        "items": [],
    }


def process_price_file(file_bytes, file_name):
    import time
    t0 = time.time()
    file_format = "unknown"
    raw_content = ""
    try:
        raw_content, file_format = extract_any(file_bytes, file_name, ocr_image)
    except Exception as exc:
        return _empty_payload(file_name, file_format, "", f"Ошибка извлечения: {exc}")

    nlines = len([l for l in raw_content.split("\n") if l.strip()])
    t1 = time.time()
    print(f"[{file_name}] извлечение: {t1-t0:.1f}с, формат={file_format}, строк={nlines}, чанков={max(1, -(-nlines//130))}")

    if not raw_content:
        return _empty_payload(file_name, file_format, raw_content, "Не удалось извлечь текст из документа")

    try:
        # Дедлайна на чанк-уровне нет: обработка асинхронная (см. ocr_routes.py),
        # поэтому даём Gemini ровно столько времени, сколько нужно по факту, без искусственного обрыва.
        parsed = structure_text_with_gemini(raw_content, file_name, deadline=None)
    except Exception as exc:
        return _empty_payload(file_name, file_format, raw_content, f"Ошибка структурирования Gemini: {exc}")

    t2 = time.time()
    print(f"[{file_name}] Gemini: {t2-t1:.1f}с, всего: {t2-t0:.1f}с, позиций={len(parsed.get('items', []))}")

    log = []
    currency = parsed.get("currency_original") or "KZT"
    if currency not in ("KZT", "USD", "RUB"):
        currency = "KZT"
    effective_date = _validate_date(parsed.get("document_date"), log)
    items, item_log = _normalize_items(parsed, currency)
    log.extend(item_log)

    if not items:
        status = "error"
        log.append("Не извлечено ни одной позиции прайса")
    elif log:
        status = "needs_review"
    else:
        status = "done"

    return {
        "file_name": file_name,
        "file_format": file_format,
        "clinic_name": parsed.get("clinic_name"),
        "city": parsed.get("city"),
        "effective_date": effective_date,
        "parsed_at": datetime.utcnow().isoformat(),
        "parse_status": status,
        "parse_log": "; ".join(log) if log else "OK",
        "raw_content": raw_content,
        "items": items,
    }
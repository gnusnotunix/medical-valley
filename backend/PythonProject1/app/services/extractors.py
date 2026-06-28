import io
import os
import zipfile

import cv2
import numpy as np
import fitz
import pdfplumber
import openpyxl
import xlrd
from lxml import etree

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _render_pdf_images(file_bytes):
    images = []
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    for page in doc:
        pix = page.get_pixmap(dpi=300)
        arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        if pix.n == 4:
            arr = cv2.cvtColor(arr, cv2.COLOR_RGBA2BGR)
        elif pix.n == 3:
            arr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
        images.append(arr)
    doc.close()
    return images


def extract_pdf(file_bytes, ocr_fn):
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            has_lines = bool(page.lines) or bool(page.rects)
            if has_lines:
                tables = page.find_tables()
                bboxes = [t.bbox for t in tables]

                def _outside(obj):
                    cx = (obj["x0"] + obj["x1"]) / 2
                    cy = (obj["top"] + obj["bottom"]) / 2
                    return not any(
                        x0 <= cx <= x1 and top <= cy <= bottom
                        for (x0, top, x1, bottom) in bboxes
                    )

                non_table_text = (page.filter(_outside).extract_text() or "").strip() if bboxes else (page.extract_text() or "").strip()
                page_lines = []
                if non_table_text:
                    page_lines.append(non_table_text)
                for table in tables:
                    for row in table.extract():
                        cells = [str(c).strip() for c in row if c and str(c).strip()]
                        if cells:
                            page_lines.append(" | ".join(cells))
                text_parts.append("\n".join(page_lines))
            else:
                # нет векторных линий - таблица собрана из текста без рамок (типичный экспорт из DOCX)
                text_parts.append(page.extract_text(layout=True) or "")

    combined = "\n".join(text_parts).strip()
    if len(combined) >= 40:
        return combined, "pdf"
    images = _render_pdf_images(file_bytes)
    ocr_text = "\n\n".join(ocr_fn(img) for img in images).strip()
    return ocr_text, "scan_pdf"


def extract_image(file_bytes, ocr_fn):
    from PIL import Image
    pil = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    arr = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    return ocr_fn(arr).strip(), "image"


def extract_docx(file_bytes):
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
        xml = zf.read("word/document.xml")
    tree = etree.fromstring(xml)
    for el in tree.iter(f"{W_NS}del"):
        el.getparent().remove(el)

    # Собираем множество параграфов, находящихся внутри таблиц, чтобы не дублировать их текст
    table_paragraphs = set()
    for tbl in tree.iter(f"{W_NS}tbl"):
        for para in tbl.iter(f"{W_NS}p"):
            table_paragraphs.add(id(para))

    lines = []
    body = tree.find(f"{W_NS}body")
    if body is None:
        body = tree

    def render_table(tbl):
        for row in tbl.iter(f"{W_NS}tr"):
            cells_text = []
            for cell in row.iter(f"{W_NS}tc"):
                texts = [t.text for t in cell.iter(f"{W_NS}t") if t.text]
                cells_text.append("".join(texts).strip())
            if any(cells_text):
                lines.append(" | ".join(cells_text))

    for child in body:
        tag = etree.QName(child).localname
        if tag == "p":
            texts = [t.text for t in child.iter(f"{W_NS}t") if t.text]
            if texts:
                line = "".join(texts).strip()
                if line:
                    lines.append(line)
        elif tag == "tbl":
            render_table(child)

    return "\n".join(lines).strip(), "docx"


def extract_xlsx(file_bytes):
    lines = []
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True, read_only=True)
    for ws in wb.worksheets:
        lines.append(f"[Лист: {ws.title}]")
        for row in ws.iter_rows(values_only=True):
            cells = [str(c).strip() for c in row if c is not None and str(c).strip()]
            if cells:
                lines.append(" | ".join(cells))
    wb.close()
    return "\n".join(lines).strip(), "xlsx"


def extract_xls(file_bytes):
    lines = []
    book = xlrd.open_workbook(file_contents=file_bytes)
    for sheet in book.sheets():
        lines.append(f"[Лист: {sheet.name}]")
        for r in range(sheet.nrows):
            cells = [str(sheet.cell_value(r, c)).strip() for c in range(sheet.ncols)]
            cells = [c for c in cells if c]
            if cells:
                lines.append(" | ".join(cells))
    return "\n".join(lines).strip(), "xlsx"


def extract_any(file_bytes, file_name, ocr_fn):
    ext = os.path.splitext(file_name)[1].lower()
    if ext == ".pdf":
        return extract_pdf(file_bytes, ocr_fn)
    if ext == ".docx":
        return extract_docx(file_bytes)
    if ext == ".xlsx":
        return extract_xlsx(file_bytes)
    if ext == ".xls":
        return extract_xls(file_bytes)
    if ext in (".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp"):
        return extract_image(file_bytes, ocr_fn)
    raise ValueError(f"Неподдерживаемый формат: {ext}")
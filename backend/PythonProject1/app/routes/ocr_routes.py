import os
import uuid
import time
import threading
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.ocr_service import process_price_file

router = APIRouter(prefix="/api/v1/ocr", tags=["ocr"])

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp", ".pdf", ".docx", ".xlsx", ".xls"}

# Простое in-memory хранилище статусов задач (для хакатона достаточно; на проде заменить на Redis/БД).
# Соответствует схеме PriceDocument.parse_status из ТЗ: pending / processing / done / error / needs_review
_jobs = {}
_jobs_lock = threading.Lock()

# Пул для фоновой обработки файлов — не блокирует event loop FastAPI на время вызовов Gemini
_executor = ThreadPoolExecutor(max_workers=8)


def _check_extension(file_name):
    ext = os.path.splitext(file_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Неподдерживаемый формат: {ext}")
    return ext


def _set_job(job_id, **fields):
    with _jobs_lock:
        _jobs[job_id].update(fields)


def _run_job(job_id, content, file_name):
    _set_job(job_id, status="processing", started_at=time.time())
    try:
        result = process_price_file(content, file_name)
        _set_job(job_id, status="ready", result=result, finished_at=time.time())
    except Exception as exc:
        _set_job(
            job_id,
            status="ready",
            result={
                "file_name": file_name,
                "file_format": "unknown",
                "clinic_name": None,
                "city": None,
                "effective_date": None,
                "parse_status": "error",
                "parse_log": f"Внутренняя ошибка обработки: {exc}",
                "raw_content": "",
                "items": [],
            },
            finished_at=time.time(),
        )


def _submit_job(content, file_name):
    job_id = str(uuid.uuid4())
    with _jobs_lock:
        _jobs[job_id] = {
            "job_id": job_id,
            "file_name": file_name,
            "status": "pending",
            "created_at": time.time(),
        }
    _executor.submit(_run_job, job_id, content, file_name)
    return job_id


def _job_view(job):
    """Краткое представление статуса задачи для polling-ответа."""
    view = {"job_id": job["job_id"], "file_name": job["file_name"], "status": job["status"]}
    if job["status"] == "ready":
        view["result"] = job["result"]
    elif job["status"] == "processing":
        view["elapsed_seconds"] = round(time.time() - job.get("started_at", time.time()), 1)
    return view


@router.post("/upload")
async def upload_single(file: UploadFile = File(...)):
    """
    Асинхронная загрузка одного файла. Сразу возвращает job_id, не дожидаясь завершения
    обработки (которая может занимать от долей секунды до нескольких минут на больших
    прайсах/сканах — см. ТЗ п.5, статусы pending/processing/done/error/needs_review).
    Прогресс — через GET /api/v1/ocr/status/{job_id}.
    """
    _check_extension(file.filename)
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Пустой файл")
    job_id = _submit_job(content, file.filename)
    return {"job_id": job_id, "file_name": file.filename, "status": "pending"}


@router.post("/batch")
async def upload_batch(files: list[UploadFile] = File(...)):
    """
    Асинхронная пакетная загрузка. Возвращает список job_id сразу же —
    каждый файл обрабатывается параллельно и независимо в фоне.
    Прогресс по всем сразу — через GET /api/v1/ocr/status/batch?job_ids=...
    """
    jobs = []
    for file in files:
        try:
            _check_extension(file.filename)
            content = await file.read()
            if not content:
                jobs.append({"file_name": file.filename, "status": "error", "error": "Пустой файл"})
                continue
            job_id = _submit_job(content, file.filename)
            jobs.append({"job_id": job_id, "file_name": file.filename, "status": "pending"})
        except HTTPException as exc:
            jobs.append({"file_name": file.filename, "status": "error", "error": exc.detail})
    return {"count": len(jobs), "jobs": jobs}


@router.get("/status/batch")
async def get_status_batch(job_ids: str):
    """job_ids — список через запятую, например ?job_ids=uuid1,uuid2,uuid3"""
    ids = [j.strip() for j in job_ids.split(",") if j.strip()]
    views = []
    with _jobs_lock:
        for jid in ids:
            job = _jobs.get(jid)
            views.append(_job_view(job) if job else {"job_id": jid, "status": "not_found"})
    done = sum(1 for v in views if v["status"] in ("ready", "error"))
    return {"count": len(views), "done": done, "jobs": views}


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Задача не найдена")
        return _job_view(job)
    done = sum(1 for v in views if v["status"] in ("ready", "error"))
    return {"count": len(views), "done": done, "jobs": views}
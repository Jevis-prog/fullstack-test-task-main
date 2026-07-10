import asyncio
import os
from pathlib import Path

from celery import Celery

from src.database import async_session_maker
from src.models import Alert, StoredFile
from src.service import STORAGE_DIR


REDIS_URL = os.environ.get("CELERY_BROKER_URL", "redis://backend-redis:6379/0")
celery_app = Celery("file_tasks", broker=REDIS_URL)
_worker_loop: asyncio.AbstractEventLoop | None = None


def run_in_worker_loop(coroutine):
    global _worker_loop
    if _worker_loop is None or _worker_loop.is_closed():
        _worker_loop = asyncio.new_event_loop()
    return _worker_loop.run_until_complete(coroutine)


async def _process_file(file_id: str) -> None:
    async with async_session_maker() as session:
        file_item = await session.get(StoredFile, file_id)
        if not file_item:
            return

        file_item.processing_status = "processing"
        reasons = _scan(file_item)
        file_item.scan_status = "suspicious" if reasons else "clean"
        file_item.scan_details = ", ".join(reasons) if reasons else "no threats found"
        file_item.requires_attention = bool(reasons)

        stored_path = STORAGE_DIR / file_item.stored_name
        if not stored_path.exists():
            file_item.processing_status = "failed"
            file_item.scan_status = file_item.scan_status or "failed"
            file_item.scan_details = "stored file not found during metadata extraction"
            alert = Alert(file_id=file_id, level="critical", message="File processing failed")
        else:
            file_item.metadata_json = _extract_metadata(file_item, stored_path)
            file_item.processing_status = "processed"
            alert = _create_alert(file_item)

        session.add(alert)
        await session.commit()


def _scan(file_item: StoredFile) -> list[str]:
    reasons = []
    extension = Path(file_item.original_name).suffix.lower()
    if extension in {".exe", ".bat", ".cmd", ".sh", ".js"}:
        reasons.append(f"suspicious extension {extension}")
    if file_item.size > 10 * 1024 * 1024:
        reasons.append("file is larger than 10 MB")
    if extension == ".pdf" and file_item.mime_type not in {
        "application/pdf",
        "application/octet-stream",
    }:
        reasons.append("pdf extension does not match mime type")
    return reasons


def _extract_metadata(file_item: StoredFile, stored_path: Path) -> dict:
    metadata = {
        "extension": Path(file_item.original_name).suffix.lower(),
        "size_bytes": file_item.size,
        "mime_type": file_item.mime_type,
    }
    if file_item.mime_type.startswith("text/"):
        content = stored_path.read_text(encoding="utf-8", errors="ignore")
        metadata.update(line_count=len(content.splitlines()), char_count=len(content))
    elif file_item.mime_type == "application/pdf":
        content = stored_path.read_bytes()
        metadata["approx_page_count"] = max(content.count(b"/Type /Page"), 1)
    return metadata


def _create_alert(file_item: StoredFile) -> Alert:
    if file_item.requires_attention:
        return Alert(
            file_id=file_item.id,
            level="warning",
            message=f"File requires attention: {file_item.scan_details}",
        )
    return Alert(file_id=file_item.id, level="info", message="File processed successfully")


@celery_app.task
def process_file(file_id: str) -> None:
    run_in_worker_loop(_process_file(file_id))

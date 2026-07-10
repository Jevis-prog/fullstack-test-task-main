import mimetypes
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import delete, select

from src.database import async_session_maker
from src.models import Alert, StoredFile


BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage" / "files"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
async def list_files() -> list[StoredFile]:
    async with async_session_maker() as session:
        result = await session.execute(select(StoredFile).order_by(StoredFile.created_at.desc()))
        return list(result.scalars().all())


async def list_alerts() -> list[Alert]:
    async with async_session_maker() as session:
        result = await session.execute(select(Alert).order_by(Alert.created_at.desc()))
        return list(result.scalars().all())


async def get_file(file_id: str) -> StoredFile:
    async with async_session_maker() as session:
        file_item = await session.get(StoredFile, file_id)
        if not file_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        return file_item


async def create_file(title: str, upload_file: UploadFile) -> StoredFile:
    title = title.strip()
    if not title:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Title must not be empty")
    file_id = str(uuid4())
    original_name = Path((upload_file.filename or "file").replace("\\", "/")).name
    suffix = Path(original_name).suffix
    stored_name = f"{file_id}{suffix}"
    stored_path = STORAGE_DIR / stored_name
    size = 0

    try:
        with stored_path.open("wb") as output:
            while chunk := await upload_file.read(1024 * 1024):
                size += len(chunk)
                output.write(chunk)
        if size == 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "File is empty")

        file_item = StoredFile(
            id=file_id,
            title=title.strip(),
            original_name=original_name,
            stored_name=stored_name,
            mime_type=upload_file.content_type
            or mimetypes.guess_type(original_name)[0]
            or "application/octet-stream",
            size=size,
            processing_status="uploaded",
        )
        async with async_session_maker() as session:
            session.add(file_item)
            await session.commit()
            await session.refresh(file_item)
        return file_item
    except Exception:
        if stored_path.exists():
            stored_path.unlink()
        raise
    finally:
        await upload_file.close()


async def update_file(file_id: str, title: str) -> StoredFile:
    title = title.strip()
    if not title:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Title must not be empty")
    async with async_session_maker() as session:
        file_item = await session.get(StoredFile, file_id)
        if not file_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        file_item.title = title
        await session.commit()
        await session.refresh(file_item)
        return file_item


async def delete_file(file_id: str) -> None:
    async with async_session_maker() as session:
        file_item = await session.get(StoredFile, file_id)
        if not file_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        await session.execute(delete(Alert).where(Alert.file_id == file_id))
        stored_path = STORAGE_DIR / file_item.stored_name
        await session.delete(file_item)
        await session.commit()
        if stored_path.exists():
            stored_path.unlink()


async def get_file_path(file_id: str) -> tuple[StoredFile, Path]:
    file_item = await get_file(file_id)
    stored_path = STORAGE_DIR / file_item.stored_name
    if not stored_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file not found")
    return file_item, stored_path


async def create_alert(file_id: str, level: str, message: str) -> Alert:
    alert = Alert(file_id=file_id, level=level, message=message)
    async with async_session_maker() as session:
        session.add(alert)
        await session.commit()
        await session.refresh(alert)
        return alert

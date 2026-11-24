import os
import uuid
from fastapi import HTTPException, UploadFile

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/octet-stream",  # Some browsers send this; extension check enforces safety
}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


def generate_project_id() -> str:
    return f"proj-{uuid.uuid4().hex[:10]}"


def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    if size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes / (1024 * 1024):.2f} MB"


def validate_upload_file(file: UploadFile, content: bytes) -> str:
    filename = file.filename or "drawing"
    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension '.{ext}'. Accepted formats: PDF, PNG, JPG, JPEG.",
        )

    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported MIME type '{content_type}'. Accepted formats: PDF, PNG, JPG.",
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File size ({format_file_size(len(content))}) exceeds the 25 MB limit.",
        )

    return ext

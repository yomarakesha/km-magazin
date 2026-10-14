"""Admin image uploads: validation (extension + magic-bytes whitelist, size
cap) and saving into the public /media tree.

Every admin file upload funnels through save_upload(), so a mislabeled or
oversized file is rejected with 415/413 instead of ending up in /media.
"""
import re
from pathlib import Path

from fastapi import HTTPException, UploadFile

from .config import MEDIA_DIR

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB

IMAGE_EXTS = {"jpg", "jpeg", "png", "webp", "avif", "gif"}

_SAFE = re.compile(r"[^a-zA-Z0-9._-]+")


def _ext(name: str) -> str:
    return name.rsplit(".", 1)[-1].lower() if "." in name else ""


def _magic_ok(head: bytes) -> bool:
    """Cheap signature check on the first bytes — catches files whose content
    doesn't match the claimed extension (e.g. an .exe renamed to .jpg)."""
    # An ISO-BMFF container (ftyp) is only an image if its brand says so —
    # otherwise an .mp4 renamed to .jpg would slip through and get served.
    _IMG_BRANDS = {
        b"avif", b"avis", b"heic", b"heix", b"heim", b"heis",
        b"hevc", b"hevx", b"mif1", b"msf1",
    }
    return (
        head.startswith(b"\xff\xd8\xff")  # jpeg
        or head.startswith(b"\x89PNG")  # png
        or (head[:4] == b"RIFF" and head[8:12] == b"WEBP")  # webp
        or head.startswith(b"GIF8")  # gif
        or (head[4:8] == b"ftyp" and head[8:12] in _IMG_BRANDS)  # avif/heif
    )


def validate_upload(upload: UploadFile) -> None:
    """Raise 415 (bad type) / 413 (too large) unless the file is an allowed image."""
    allowed = IMAGE_EXTS
    limit = MAX_IMAGE_BYTES

    ext = _ext(upload.filename or "")
    if ext not in allowed:
        raise HTTPException(415, f"File type .{ext or '?'} is not allowed (expected: {', '.join(sorted(allowed))})")

    f = upload.file
    f.seek(0, 2)
    size = f.tell()
    f.seek(0)
    if size > limit:
        raise HTTPException(413, f"File is too large ({size // (1024 * 1024)} MB, limit {limit // (1024 * 1024)} MB)")

    head = f.read(16)
    f.seek(0)
    if not _magic_ok(head):
        raise HTTPException(415, "File content does not match its extension")


def _safe_name(name: str) -> str:
    name = _SAFE.sub("-", name.strip()).strip("-.")
    return name or "file"


def _unique_path(subdir: str, name: str) -> Path:
    base = MEDIA_DIR / subdir
    stem, dot, ext = name.partition(".")
    candidate = base / name
    i = 1
    while candidate.exists():
        candidate = base / f"{stem}-{i}{dot}{ext}"
        i += 1
    return candidate


def save_upload(upload: UploadFile, subdir: str) -> str:
    """Validate (type + size + magic bytes) and write the upload to
    MEDIA_DIR/subdir. Returns the stored file name."""
    validate_upload(upload)
    path = _unique_path(subdir, _safe_name(upload.filename or "file"))
    with path.open("wb") as f:
        f.write(upload.file.read())
    return path.name

"""Upload validation: extension + magic-bytes whitelist and size caps.

Every admin file upload funnels through validate_upload() before being written
to disk, so a mislabeled or oversized file is rejected with 415/413 instead of
landing in the public /media tree.
"""
from fastapi import HTTPException, UploadFile

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_VIDEO_BYTES = 200 * 1024 * 1024  # 200 MB

IMAGE_EXTS = {"jpg", "jpeg", "png", "webp", "avif", "gif"}
VIDEO_EXTS = {"mp4", "webm", "mov"}


def _ext(name: str) -> str:
    return name.rsplit(".", 1)[-1].lower() if "." in name else ""


def _magic_ok(head: bytes, kind: str) -> bool:
    """Cheap signature check on the first bytes — catches files whose content
    doesn't match the claimed extension (e.g. an .exe renamed to .jpg)."""
    if kind == "img":
        return (
            head.startswith(b"\xff\xd8\xff")  # jpeg
            or head.startswith(b"\x89PNG")  # png
            or (head[:4] == b"RIFF" and head[8:12] == b"WEBP")  # webp
            or head.startswith(b"GIF8")  # gif
            or head[4:8] == b"ftyp"  # avif/heif container
        )
    return (
        head[4:8] == b"ftyp"  # mp4/mov
        or head.startswith(b"\x1a\x45\xdf\xa3")  # webm/matroska
    )


def validate_upload(upload: UploadFile, kind: str) -> None:
    """Raise 415 (bad type) / 413 (too large) unless the file is an allowed
    image or video. `kind` is 'img' or 'video'."""
    allowed = IMAGE_EXTS if kind == "img" else VIDEO_EXTS
    limit = MAX_IMAGE_BYTES if kind == "img" else MAX_VIDEO_BYTES

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
    if not _magic_ok(head, kind):
        raise HTTPException(415, "File content does not match its extension")

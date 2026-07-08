"""Tiny in-memory sliding-window rate limiter.

Suitable for this deployment (single uvicorn process, SQLite-scale traffic):
no external store, no extra dependency. Each (bucket, client-ip) pair keeps a
deque of recent hit timestamps; requests over the limit get HTTP 429.

Usage:
    @router.post("/orders", dependencies=[Depends(limiter("orders", 5))])
"""
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_lock = threading.Lock()
_hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def limiter(bucket: str, limit: int, window: float = 60.0):
    """Dependency factory: allow at most `limit` hits per `window` seconds
    per client IP for this bucket."""

    def dep(request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        key = (bucket, ip)
        now = time.monotonic()
        with _lock:
            q = _hits[key]
            while q and q[0] <= now - window:
                q.popleft()
            if len(q) >= limit:
                raise HTTPException(429, "Too many requests, please slow down")
            q.append(now)

    return dep

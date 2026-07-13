"""Tiny in-memory sliding-window rate limiter.

Suitable for this deployment (single uvicorn process, SQLite-scale traffic):
no external store, no extra dependency. Each (bucket, client-ip) pair keeps a
deque of recent hit timestamps; requests over the limit get HTTP 429.

Usage:
    @router.post("/orders", dependencies=[Depends(limiter("orders", 5))])
"""
import hmac
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from .config import REVALIDATE_SECRET, TRUST_PROXY

_lock = threading.Lock()
_hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    """Best-effort client IP. Behind a trusted proxy the real client is in the
    leftmost X-Forwarded-For entry; request.client.host would be the proxy and
    collapse every user into one bucket."""
    if TRUST_PROXY:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _is_internal(request: Request) -> bool:
    """Frontend SSR fetches carry the shared secret so server-side renders (all
    from the one frontend host) aren't throttled as if they were one abusive
    client. Disabled when no secret is configured."""
    key = request.headers.get("x-internal-key")
    return bool(REVALIDATE_SECRET and key and hmac.compare_digest(key, REVALIDATE_SECRET))


def limiter(bucket: str, limit: int, window: float = 60.0):
    """Dependency factory: allow at most `limit` hits per `window` seconds
    per client IP for this bucket."""

    def dep(request: Request) -> None:
        if _is_internal(request):
            return
        ip = _client_ip(request)
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

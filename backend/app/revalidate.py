"""Fire-and-forget cache invalidation ping to the Next.js frontend.

The frontend caches SSR fetches under the "shop"/"content" tags (60s window);
after any successful admin write we POST /api/revalidate so edits are visible
immediately. Best-effort: a down frontend must never break the admin API —
the 60s revalidate window covers the miss."""
import json
import logging
import threading
import urllib.request

from .config import FRONTEND_ORIGIN, REVALIDATE_SECRET

log = logging.getLogger(__name__)


def _post(tags: list[str]) -> None:
    req = urllib.request.Request(
        f"{FRONTEND_ORIGIN}/api/revalidate",
        data=json.dumps({"tags": tags}).encode(),
        headers={
            "Content-Type": "application/json",
            "X-Revalidate-Secret": REVALIDATE_SECRET,
        },
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:  # noqa: BLE001 — invalidation is best-effort
        log.warning("frontend revalidate failed: %s", e)


def revalidate_frontend(tags: list[str]) -> None:
    """No-op until REVALIDATE_SECRET is configured on both sides."""
    if not REVALIDATE_SECRET:
        return
    threading.Thread(target=_post, args=(tags,), daemon=True).start()

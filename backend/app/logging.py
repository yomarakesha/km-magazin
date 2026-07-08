"""Structured (JSON-lines) logging for the backend.

One record per line on stdout — greppable in dev, machine-parseable if the
process output is ever shipped to a collector. Business events worth auditing
(orders, auth failures) go through the "km" logger with extra fields.
"""
import json
import logging
import sys
from datetime import datetime, timezone

_RESERVED = set(logging.LogRecord("", 0, "", 0, "", (), None).__dict__) | {"message", "asctime"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        out = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            out["exc"] = self.formatException(record.exc_info)
        # extra={...} fields land on the record; forward anything non-standard
        for key, value in record.__dict__.items():
            if key not in _RESERVED and not key.startswith("_"):
                out[key] = value
        return json.dumps(out, ensure_ascii=False, default=str)


def setup_logging() -> None:
    """Route the app's loggers through the JSON formatter. Uvicorn keeps its
    own handlers (access log stays human-readable)."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    km = logging.getLogger("km")
    km.setLevel(logging.INFO)
    km.handlers = [handler]
    km.propagate = False


log = logging.getLogger("km")

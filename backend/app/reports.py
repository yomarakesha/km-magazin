"""Report helpers: period parsing and CSV rendering.

Orders store aware-UTC created_at (models._now). A report period is an
inclusive date range [from, to] interpreted in UTC; `to` covers the whole day.
"""
import csv
import io
from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException
from fastapi.responses import Response


def parse_period(date_from: str | None, date_to: str | None, default_days: int = 30) -> tuple[datetime, datetime]:
    """Return (start, end) aware-UTC datetimes. Missing values default to the
    last `default_days`; `end` is pushed to 23:59:59.999999 of the `to` day."""
    now = datetime.now(timezone.utc)
    try:
        start = (
            datetime.combine(date.fromisoformat(date_from), time.min, tzinfo=timezone.utc)
            if date_from
            else now - timedelta(days=default_days)
        )
        end = (
            datetime.combine(date.fromisoformat(date_to), time.max, tzinfo=timezone.utc)
            if date_to
            else now
        )
    except ValueError as exc:
        raise HTTPException(422, "invalid date (expected YYYY-MM-DD)") from exc
    if end < start:
        raise HTTPException(422, "'to' is before 'from'")
    return start, end


def csv_response(filename: str, header: list[str], rows: list[list]) -> Response:
    """Render rows to a UTF-8 CSV download (BOM so Excel reads Cyrillic)."""
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(header)
    writer.writerows(rows)
    data = ("﻿" + buf.getvalue()).encode("utf-8")
    return Response(
        content=data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

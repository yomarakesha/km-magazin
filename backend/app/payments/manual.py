"""Default provider: no online payment. Orders stay `unpaid` and the admin
flips them to `paid` from the orders page (PATCH /orders/{id}/payment)."""
from collections.abc import Mapping

from fastapi import HTTPException

from .base import PaymentProvider, WebhookEvent


class ManualProvider(PaymentProvider):
    name = "manual"

    def start(self, order_id: int, amount: int, currency: str) -> str | None:
        return None  # nothing to redirect to — payment happens offline

    def parse_webhook(self, body: bytes, headers: Mapping[str, str]) -> WebhookEvent:
        raise HTTPException(501, "No online payment provider is configured")

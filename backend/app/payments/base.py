"""Payment provider abstraction.

An order carries payment_status (unpaid|pending|paid|refunded) plus
payment_provider/payment_ref set by the active provider. Providers move the
status: start() takes it to pending (or leaves unpaid for offline flows),
the webhook confirms paid/refunded.

Turkmenistan integration candidates (each becomes a subclass registered in
registry.py once credentials exist): Halkbank e-commerce, Rysgal bank,
a local processing aggregator. Until then ManualProvider is the default —
orders stay unpaid and the admin marks them paid by hand.
"""
from abc import ABC, abstractmethod
from collections.abc import Mapping


class WebhookEvent:
    """Parsed provider callback: which order-reference changed to what status."""

    def __init__(self, ref: str, status: str) -> None:
        self.ref = ref  # provider-side payment id, matches Order.payment_ref
        self.status = status  # "paid" | "refunded" | "pending"


class PaymentProvider(ABC):
    name: str = "abstract"

    @abstractmethod
    def start(self, order_id: int, amount: int, currency: str) -> str | None:
        """Begin a payment for the order. Returns a redirect URL for the
        customer, or None when the flow needs no redirect (manual/offline)."""

    @abstractmethod
    def parse_webhook(self, body: bytes, headers: Mapping[str, str]) -> WebhookEvent:
        """Verify the callback signature and parse it. Must raise
        fastapi.HTTPException(400) on a bad signature/payload, or
        HTTPException(501) when the provider has no webhook support."""

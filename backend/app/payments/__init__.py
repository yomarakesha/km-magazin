"""Payment providers. The active one is picked by PAYMENT_PROVIDER in
backend/.env (default "manual"). Register new gateways in _REGISTRY."""
from ..config import PAYMENT_PROVIDER
from .base import PaymentProvider, WebhookEvent
from .manual import ManualProvider

_REGISTRY: dict[str, PaymentProvider] = {
    "manual": ManualProvider(),
}


def get_provider() -> PaymentProvider:
    provider = _REGISTRY.get(PAYMENT_PROVIDER)
    if provider is None:
        raise RuntimeError(
            f"Unknown PAYMENT_PROVIDER {PAYMENT_PROVIDER!r}; known: {sorted(_REGISTRY)}"
        )
    return provider


__all__ = ["PaymentProvider", "WebhookEvent", "get_provider"]

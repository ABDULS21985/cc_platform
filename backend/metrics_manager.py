from prometheus_client import REGISTRY, Counter
from threading import Lock


class MetricsManager:
    _lock = Lock()
    _initialized = False

    def __init__(self):
        if not MetricsManager._initialized:
            with MetricsManager._lock:
                if not MetricsManager._initialized:
                    self._init_metrics()
                    MetricsManager._initialized = True

    def _init_metrics(self):
        """Thread-safe metric initialization"""
        # Check if metrics already exist
        existing = {m.name for m in REGISTRY.collect()}

        if "wallet_balance_requests" not in existing:
            self.WALLET_BALANCE_REQUESTS = Counter(
                "wallet_balance_requests",
                "Community wallet balance requests",
                ["community_id", "user_id"],
            )

        if "wallet_transfer_requests" not in existing:
            self.WALLET_TRANSFER_REQUESTS = Counter(
                "wallet_transfer_requests",
                "Community wallet transfer requests",
                ["community_id", "user_id"],
            )


# Global instance
metrics = MetricsManager()

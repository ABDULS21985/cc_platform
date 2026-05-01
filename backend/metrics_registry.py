from prometheus_client import REGISTRY, Counter


class MetricsRegistry:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_metrics()
        return cls._instance

    def _init_metrics(self):
        """Initialize all metrics here"""
        self.WALLET_BALANCE_REQUESTS = Counter(
            "wallet_balance_requests",
            "Community wallet balance requests",
            ["community_id", "user_id"],
            registry=REGISTRY,
        )

        self.WALLET_TRANSFER_REQUESTS = Counter(
            "wallet_transfer_requests",
            "Community wallet transfer requests",
            ["community_id", "user_id"],
            registry=REGISTRY,
        )


# Singleton instance
metrics = MetricsRegistry()

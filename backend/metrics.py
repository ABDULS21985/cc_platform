from prometheus_client import Counter, REGISTRY
import atexit

# Global variables to hold our metrics
WALLET_BALANCE_REQUESTS = None
WALLET_TRANSFER_REQUESTS = None


def init_metrics():
    global WALLET_BALANCE_REQUESTS, WALLET_TRANSFER_REQUESTS

    # Only initialize if not already created
    if WALLET_BALANCE_REQUESTS is None:
        try:
            WALLET_BALANCE_REQUESTS = Counter(
                "wallet_balance_requests",
                "Community wallet balance requests",
                ["community_id", "user_id"],
            )
            REGISTRY.register(WALLET_BALANCE_REQUESTS)
        except ValueError as e:
            if "Duplicated timeseries" in str(e):
                # Get existing metric if already registered
                WALLET_BALANCE_REQUESTS = REGISTRY._names_to_collectors[
                    "wallet_balance_requests"
                ]

    if WALLET_TRANSFER_REQUESTS is None:
        try:
            WALLET_TRANSFER_REQUESTS = Counter(
                "wallet_transfer_requests",
                "Community wallet transfer requests",
                ["community_id", "user_id"],
            )
            REGISTRY.register(WALLET_TRANSFER_REQUESTS)
        except ValueError as e:
            if "Duplicated timeseries" in str(e):
                WALLET_TRANSFER_REQUESTS = REGISTRY._names_to_collectors[
                    "wallet_transfer_requests"
                ]


def reset_metrics():
    global WALLET_BALANCE_REQUESTS, WALLET_TRANSFER_REQUESTS
    if WALLET_BALANCE_REQUESTS is not None:
        try:
            REGISTRY.unregister(WALLET_BALANCE_REQUESTS)
        except KeyError:
            pass
        WALLET_BALANCE_REQUESTS = None

    if WALLET_TRANSFER_REQUESTS is not None:
        try:
            REGISTRY.unregister(WALLET_TRANSFER_REQUESTS)
        except KeyError:
            pass
        WALLET_TRANSFER_REQUESTS = None


# Initialize metrics when module is imported
init_metrics()
atexit.register(reset_metrics)


# from prometheus_client import Counter

# # Singleton pattern for metrics
# _metrics_initialized = False
# WALLET_BALANCE_REQUESTS = None
# WALLET_TRANSFER_REQUESTS = None


# def init_metrics():
#     global _metrics_initialized, WALLET_BALANCE_REQUESTS, WALLET_TRANSFER_REQUESTS

#     if not _metrics_initialized:
#         WALLET_BALANCE_REQUESTS = Counter(
#             "wallet_balance_requests",
#             "Community wallet balance requests",
#             ["community_id", "user_id"],
#         )

#         WALLET_TRANSFER_REQUESTS = Counter(
#             "wallet_transfer_requests",
#             "Community wallet transfer requests",
#             ["community_id", "user_id"],
#         )

#         _metrics_initialized = True

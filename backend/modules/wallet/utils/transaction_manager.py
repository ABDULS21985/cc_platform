"""
Database Transaction Manager
Provides atomic transaction handling with automatic rollback
"""
from contextlib import contextmanager
from modules.auth_v2.extensions import db
import logging

logger = logging.getLogger(__name__)


@contextmanager
def atomic_transaction():
    """
    Context manager for atomic database transactions

    Provides automatic commit on success and rollback on failure.
    Uses savepoints for nested transaction support.

    Usage:
        with atomic_transaction():
            wallet.credit(1000)
            transaction_repo.create({...})

    Benefits:
        - Automatic commit if no exception raised
        - Automatic rollback if exception raised
        - Nested transaction support via savepoints
        - Clean error handling
    """
    try:
        nested = db.session.begin_nested()
        yield nested

        db.session.commit()
        logger.debug("Transaction committed successfully")

    except Exception as e:
        db.session.rollback()
        logger.error(f"Transaction rolled back due to error: {str(e)}")
        raise


@contextmanager
def atomic_transaction_with_lock(wallet_id: int):
    """
    Context manager with pessimistic row-level locking for wallet operations

    Prevents race conditions in concurrent credit/debit operations by acquiring
    a database-level lock on the wallet row using SELECT ... FOR UPDATE.

    Args:
        wallet_id: ID of wallet to lock

    Yields:
        Locked Wallet instance

    Usage:
        with atomic_transaction_with_lock(wallet_id=123) as wallet:
            wallet.credit(1000)

    Security:
        The lock is automatically released when transaction commits or rolls back.
        No other transaction can modify this wallet until lock is released.
    """
    from modules.wallet.models.wallet import Wallet

    try:
        nested = db.session.begin_nested()

        wallet = Wallet.query.filter_by(id=wallet_id).with_for_update().first()

        if not wallet:
            raise ValueError(f"Wallet {wallet_id} not found")

        yield wallet

        db.session.commit()
        logger.debug(f"Transaction committed with lock release for wallet {wallet_id}")

    except Exception as e:
        db.session.rollback()
        logger.error(f"Locked transaction rolled back: {str(e)}")
        raise

"""
Wallet Module Filters

Flask-SQLAlchemy query builders for wallet transaction list endpoints.

Usage
-----
    from modules.wallet.filters import TransactionFilter
    from modules.wallet.models.wallet_transaction import WalletTransaction

    base = WalletTransaction.query.filter_by(wallet_id=wallet.id)
    f = TransactionFilter(base, args)
    transactions, total = (
        f.apply()
         .order(WalletTransaction.created_at.desc())
         .paginate(limit, offset)
    )
"""

from modules.core.filters import BaseFilter


class TransactionFilter(BaseFilter):
    """
    Filter for WalletTransaction list queries.

    The initial query should already be scoped to the relevant wallet::

        base = WalletTransaction.query.filter_by(wallet_id=wallet.id)
        f = TransactionFilter(base, args)

    Supported args (from ``TransactionQuerySchema``)
    ------------------------------------------------
    type    str  — 'credit' | 'debit'
    status  str  — 'pending' | 'successful' | 'failed'
    """

    def apply(self) -> "TransactionFilter":
        from modules.wallet.models.wallet_transaction import WalletTransaction

        args = self._args

        if txn_type := args.get("type"):
            # Support both the old 'credit/debit' convention and the DB enums
            # ('deposit/withdrawal/transfer/payment'). Some environments may still
            # have legacy data, so we keep both.
            if txn_type == "credit":
                self._query = self._query.filter(WalletTransaction.type.in_(["credit", "deposit"]))
            elif txn_type == "debit":
                self._query = self._query.filter(
                    WalletTransaction.type.in_(["debit", "withdrawal", "transfer", "payment"])
                )
            else:
                self._query = self._query.filter_by(type=txn_type)

        if status := args.get("status"):
            if status == "successful":
                self._query = self._query.filter(WalletTransaction.status.in_(["successful", "completed"]))
            elif status == "completed":
                self._query = self._query.filter(WalletTransaction.status.in_(["completed", "successful"]))
            else:
                self._query = self._query.filter_by(status=status)

        if bill_id := args.get("bill_id"):
            self._query = self._query.filter(WalletTransaction.bill_id == int(bill_id))

        return self

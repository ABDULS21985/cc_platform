"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpRight,
  Copy,
  Landmark,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
} from "lucide-react";
import useCurrency from "@/hooks/useCurrency";
import { ApiService, type CommunityBalanceData, type CommunityTransaction } from "@/services/api";
import { toast } from "sonner";
import { toastAxiosError } from "@/hooks/useAxiosError";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WalletTabProps {
  communityName: string;
  communityId: number;
}

type FilterType = "all" | "credit" | "debit";

interface Transaction {
  id: string | number;
  type: "credit" | "debit";
  description: string;
  sub_description?: string;
  amount: number;
  created_at: string;
}

const PAGE_SIZE = 20;

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function transactionDirection(txn: CommunityTransaction): "credit" | "debit" {
  if (txn.direction === "credit" || txn.direction === "debit") {
    return txn.direction;
  }

  if (
    txn.transaction_type === "community_transfer" ||
    txn.type === "transfer" ||
    txn.type === "withdrawal"
  ) {
    return "debit";
  }

  return "credit";
}

function mapTransaction(txn: CommunityTransaction): Transaction {
  const type = transactionDirection(txn);
  const payerName = txn.payer_name || txn.user?.full_name || txn.payer?.full_name;
  const status = txn.status ? `${txn.status}` : undefined;

  return {
    id: txn.id,
    type,
    description:
      txn.description ||
      (type === "credit" ? "Community wallet credit" : "Community wallet transfer"),
    sub_description: payerName || status,
    amount: Math.abs(toNumber(txn.net_amount ?? txn.amount)),
    created_at: txn.created_at,
  };
}

function groupByDate(transactions: Transaction[]) {
  const groups: { label: string; items: Transaction[] }[] = [];
  const seen = new Map<string, number>();

  for (const txn of transactions) {
    const date = new Date(txn.created_at);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (Number.isNaN(date.getTime())) {
      label = "Unknown date";
    } else if (date.toDateString() === today.toDateString()) {
      label = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = "Yesterday";
    } else {
      label = date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    if (!seen.has(label)) {
      seen.set(label, groups.length);
      groups.push({ label, items: [] });
    }
    groups[seen.get(label)!].items.push(txn);
  }

  return groups;
}

export default function WalletTab({
  communityName,
  communityId,
}: WalletTabProps) {
  const { formatCurrency } = useCurrency();
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [balanceInfo, setBalanceInfo] = useState<CommunityBalanceData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [fundDescription, setFundDescription] = useState("");
  const [funding, setFunding] = useState(false);
  const [depositResult, setDepositResult] = useState<any>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientBankCode, setRecipientBankCode] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawPin, setWithdrawPin] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const [balanceResponse, transactionsResponse] = await Promise.all([
        ApiService.communities.getBalance(communityId),
        ApiService.communities.getTransactions(communityId, {
          limit: PAGE_SIZE,
          offset: 0,
        }),
      ]);

      setBalanceInfo(balanceResponse.data.data);
      const payload = transactionsResponse.data.data;
      setTransactions((payload.transactions ?? []).map(mapTransaction));
      setHasMore(Boolean(payload.pagination?.has_more));
    } catch (err: any) {
      toastAxiosError(err, "Failed to load wallet data.");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const totalCollected = balanceInfo?.total_deposits ?? 0;
  const totalSpent = balanceInfo?.total_withdrawals ?? 0;
  const transactionCount = balanceInfo?.transaction_count ?? transactions.length;

  const filtered = useMemo(
    () => transactions.filter((t) => (filter === "all" ? true : t.type === filter)),
    [filter, transactions],
  );

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const response = await ApiService.communities.getTransactions(communityId, {
        limit: PAGE_SIZE,
        offset: transactions.length,
      });
      const payload = response.data.data;
      setTransactions((prev) => [
        ...prev,
        ...(payload.transactions ?? []).map(mapTransaction),
      ]);
      setHasMore(Boolean(payload.pagination?.has_more));
    } catch (err: any) {
      toastAxiosError(err, "Failed to load more transactions.");
    } finally {
      setLoadingMore(false);
    }
  };

  const resetDepositForm = () => {
    setFundAmount("");
    setFundDescription("");
    setDepositResult(null);
  };

  const handleFundWallet = async () => {
    const amount = Number(fundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    setFunding(true);
    try {
      const response = await ApiService.communities.deposit(communityId, {
        amount,
        description: fundDescription.trim() || `Deposit to ${communityName}`,
      });
      setDepositResult(response.data.data);
      toast.success("Deposit account generated");
      await fetchWallet();
    } catch (err: any) {
      toastAxiosError(err, "Failed to start funding flow.");
    } finally {
      setFunding(false);
    }
  };

  const resetWithdrawForm = () => {
    setWithdrawAmount("");
    setRecipientAccount("");
    setRecipientName("");
    setRecipientBankCode("");
    setWithdrawReason("");
    setWithdrawPin("");
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid withdrawal amount.");
      return;
    }
    if (!recipientAccount.trim() || !recipientName.trim() || !recipientBankCode.trim()) {
      toast.error("Recipient account, name, and bank code are required.");
      return;
    }
    if (!/^\d{4}$/.test(withdrawPin)) {
      toast.error("Enter your 4-digit transaction PIN.");
      return;
    }

    setWithdrawing(true);
    try {
      await ApiService.communities.transfer(communityId, {
        amount,
        recipient_account: recipientAccount.trim(),
        recipient_name: recipientName.trim(),
        recipient_bank_code: recipientBankCode.trim(),
        reason: withdrawReason.trim() || `Withdrawal from ${communityName}`,
        pin: withdrawPin,
      });
      toast.success("Transfer initiated");
      setWithdrawOpen(false);
      resetWithdrawForm();
      await fetchWallet();
    } catch (err: any) {
      toastAxiosError(err, "Failed to withdraw funds.");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleCopyAccount = async () => {
    if (!balanceInfo?.account_number) return;
    await navigator.clipboard.writeText(balanceInfo.account_number);
    toast.success("Account number copied");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: "#0E9DA5" }}
      >
        <div className="absolute -top-14 -right-10 w-48 h-48 rounded-full bg-white/[0.07]" />
        <div className="absolute -bottom-12 left-10 w-36 h-36 rounded-full bg-white/[0.05]" />

        <p className="text-xs text-white/80 mb-1 relative z-10">
          Community wallet balance
        </p>
        <p className="text-3xl font-bold mb-1 relative z-10">
          {formatCurrency(balanceInfo?.balance ?? 0)}
        </p>
        <p className="text-xs text-white/75 mb-5 relative z-10 capitalize">
          {balanceInfo?.status ? `${balanceInfo.status} wallet` : "Wallet"}
        </p>

        <div className="flex gap-3 relative z-10">
          <button
            type="button"
            onClick={() => {
              resetDepositForm();
              setFundOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition text-white text-sm font-medium py-2 rounded-md"
          >
            <Plus className="w-4 h-4" />
            Fund wallet
          </button>
          <button
            type="button"
            onClick={() => setWithdrawOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition text-white text-sm font-medium py-2 rounded-md"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Withdraw
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition text-white text-sm font-medium py-2 rounded-md"
              >
                <MoreHorizontal className="w-4 h-4" />
                More
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={fetchWallet}>
                <RefreshCw className="mr-2 size-4" />
                Refresh wallet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
                <Landmark className="mr-2 size-4" />
                Wallet details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
          <div className="w-7 h-7 rounded-lg bg-[#fff3eb] flex items-center justify-center mb-3">
            <ArrowUpRight className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-base font-bold text-black">
            {formatCurrency(totalSpent)}
          </p>
          <p className="text-xs text-[#959595] mt-0.5">Total spent</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
          <div className="w-7 h-7 rounded-lg bg-[#e1f2ee] flex items-center justify-center mb-3">
            <ArrowDownLeft className="w-4 h-4 text-[#0E9DA5]" />
          </div>
          <p className="text-base font-bold text-black">
            {formatCurrency(totalCollected)}
          </p>
          <p className="text-xs text-[#959595] mt-0.5">Total collected</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
          <div className="w-7 h-7 rounded-lg bg-[#e6f1fb] flex items-center justify-center mb-3">
            <Landmark className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-base font-bold text-black">{transactionCount}</p>
          <p className="text-xs text-[#959595] mt-0.5">Transactions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#f0f0f0]">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h4 className="text-sm font-semibold text-black">
            Transaction history
          </h4>
          <div className="flex gap-2">
            {(["all", "credit", "debit"] as FilterType[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition capitalize ${
                  filter === f
                    ? "bg-[#0E9DA5] text-white border-[#0E9DA5]"
                    : "bg-[#f7f7f7] text-[#525252] border-[#e5e5e5] hover:bg-gray-100"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-[#959595]">
            No transactions found
          </div>
        ) : (
          <div className="space-y-1">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-[#959595] uppercase tracking-widest pt-3 pb-1">
                  {group.label}
                </p>
                {group.items.map((txn) => {
                  const isCredit = txn.type === "credit";
                  const time = new Date(txn.created_at);
                  return (
                    <div
                      key={txn.id}
                      className="flex items-center gap-3 py-2.5 border-b border-[#f7f7f7] last:border-b-0"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isCredit ? "bg-[#e1f2ee]" : "bg-[#fff3eb]"
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate">
                          {txn.description}
                        </p>
                        {txn.sub_description && (
                          <p className="text-xs text-[#959595] mt-0.5 truncate">
                            {txn.sub_description}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`text-sm font-semibold ${
                            isCredit ? "text-emerald-500" : "text-orange-500"
                          }`}
                        >
                          {isCredit ? "+" : "-"}
                          {formatCurrency(txn.amount)}
                        </p>
                        <p className="text-xs text-[#959595] mt-0.5">
                          {Number.isNaN(time.getTime())
                            ? "N/A"
                            : time.toLocaleTimeString("en-NG", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-sm text-[#0E9DA5] flex items-center gap-1.5 mx-auto hover:underline disabled:opacity-60"
            >
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loadingMore ? "Loading..." : "Load more transactions"}
            </button>
          </div>
        )}
      </div>

      <Dialog
        open={fundOpen}
        onOpenChange={(open) => {
          setFundOpen(open);
          if (!open) resetDepositForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fund community wallet</DialogTitle>
          </DialogHeader>
          {depositResult ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] p-4 space-y-3">
                <div>
                  <p className="text-xs text-[#959595]">Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(toNumber(depositResult.amount))}</p>
                </div>
                <div>
                  <p className="text-xs text-[#959595]">Account number</p>
                  <p className="font-semibold">{depositResult.account_details?.account_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#959595]">Account name</p>
                  <p className="font-semibold">{depositResult.account_details?.account_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#959595]">Bank</p>
                  <p className="font-semibold">{depositResult.account_details?.bank_name || "N/A"}</p>
                </div>
              </div>
              {depositResult.instructions && (
                <p className="text-sm text-muted-foreground">{depositResult.instructions}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="fund-amount">Amount</Label>
                <Input
                  id="fund-amount"
                  inputMode="decimal"
                  value={fundAmount}
                  onChange={(event) => setFundAmount(event.target.value)}
                  placeholder="5000"
                  disabled={funding}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fund-description">Description</Label>
                <Input
                  id="fund-description"
                  value={fundDescription}
                  onChange={(event) => setFundDescription(event.target.value)}
                  placeholder="Monthly contribution"
                  disabled={funding}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFundOpen(false)} disabled={funding}>
              Close
            </Button>
            {!depositResult && (
              <Button onClick={handleFundWallet} loading={funding}>
                Generate account
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw from community wallet</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="withdraw-amount">Amount</Label>
              <Input
                id="withdraw-amount"
                inputMode="decimal"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder="5000"
                disabled={withdrawing}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="recipient-account">Recipient account</Label>
              <Input
                id="recipient-account"
                inputMode="numeric"
                value={recipientAccount}
                onChange={(event) => setRecipientAccount(event.target.value.replace(/\D/g, ""))}
                placeholder="0123456789"
                disabled={withdrawing}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="recipient-name">Recipient name</Label>
              <Input
                id="recipient-name"
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="Recipient account name"
                disabled={withdrawing}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="recipient-bank-code">Bank code</Label>
              <Input
                id="recipient-bank-code"
                value={recipientBankCode}
                onChange={(event) => setRecipientBankCode(event.target.value.trim())}
                placeholder="058"
                disabled={withdrawing}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="withdraw-reason">Reason</Label>
              <Input
                id="withdraw-reason"
                value={withdrawReason}
                onChange={(event) => setWithdrawReason(event.target.value)}
                placeholder="Vendor payment"
                disabled={withdrawing}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="withdraw-pin">Transaction PIN</Label>
              <Input
                id="withdraw-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={withdrawPin}
                onChange={(event) => setWithdrawPin(event.target.value.replace(/\D/g, ""))}
                placeholder="1234"
                disabled={withdrawing}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)} disabled={withdrawing}>
              Cancel
            </Button>
            <Button onClick={handleWithdraw} loading={withdrawing}>
              Initiate transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wallet details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] p-4">
            <div>
              <p className="text-xs text-[#959595]">Community</p>
              <p className="font-semibold">{communityName}</p>
            </div>
            <div>
              <p className="text-xs text-[#959595]">Account number</p>
              <p className="font-semibold">{balanceInfo?.account_number || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-[#959595]">Account name</p>
              <p className="font-semibold">{balanceInfo?.account_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-[#959595]">Status</p>
              <p className="font-semibold capitalize">{balanceInfo?.status || "N/A"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleCopyAccount}
              disabled={!balanceInfo?.account_number}
              leadingIcon={<Copy className="size-4" />}
            >
              Copy account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

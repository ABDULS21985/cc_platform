"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  ArrowDownToLine,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import useCurrency from "@/hooks/useCurrency";
import { ApiService } from "@/services/api";
import toast from "react-hot-toast";
import { toastAxiosError } from "@/hooks/useAxiosError";

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

// Group transactions by relative date label
function groupByDate(transactions: Transaction[]) {
  const groups: { label: string; items: Transaction[] }[] = [];
  const seen = new Map<string, number>();

  for (const txn of transactions) {
    const date = new Date(txn.created_at);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) {
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
  const [balance, setBalance] = useState<number>(0);
  const [totalCollected, setTotalCollected] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const fetchWallet = async () => {
      setLoading(true);
      try {
        // const res = await ApiService.communities.getWallet(communityId);
        // const data = res.data.data;
        // setBalance(data.balance ?? 0);
        // setTotalCollected(data.total_collected ?? 0);
        // setTotalSpent(data.total_spent ?? 0);
        // setTransactions(data.transactions ?? []);
        // setHasMore(data.has_more ?? false);
      } catch (err: any) {
        toastAxiosError(err, "Failed to load wallet data.");
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, [communityId]);

  const filtered = transactions.filter((t) =>
    filter === "all" ? true : t.type === filter,
  );

  const grouped = groupByDate(filtered);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
    //   const res = await ApiService.communities.getWallet(communityId, nextPage);
    //   const data = res.data.data;
    //   setTransactions((prev) => [...prev, ...(data.transactions ?? [])]);
    //   setHasMore(data.has_more ?? false);
    //   setPage(nextPage);
    } catch(err) {
      toastAxiosError(err, "Failed to load more transactions.");
    } finally {
      setLoadingMore(false);
    }
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
      {/* Balance card */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: "#0E9DA5" }}
      >
        {/* decorative circles */}
        <div className="absolute -top-14 -right-10 w-48 h-48 rounded-full bg-white/[0.07]" />
        <div className="absolute -bottom-12 left-10 w-36 h-36 rounded-full bg-white/[0.05]" />

        <p className="text-xs text-white/80 mb-1 relative z-10">
          Community wallet balance
        </p>
        <p className="text-3xl font-bold mb-5 relative z-10">
          {formatCurrency(balance)}
        </p>

        <div className="flex gap-3 relative z-10">
          <button className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition text-white text-sm font-medium py-2 rounded-md">
            <Plus className="w-4 h-4" />
            Fund wallet
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition text-white text-sm font-medium py-2 rounded-md">
            <ArrowDownToLine className="w-4 h-4" />
            Withdraw
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition text-white text-sm font-medium py-2 rounded-md">
            <MoreHorizontal className="w-4 h-4" />
            More
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
          <div className="w-7 h-7 rounded-lg bg-[#e1f2ee] flex items-center justify-center mb-3">
            <ArrowUpRight className="w-4 h-4 text-[#0E9DA5]" />
          </div>
          <p className="text-base font-bold text-black">
            {formatCurrency(totalSpent)}
          </p>
          <p className="text-xs text-[#959595] mt-0.5">Total spent</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
          <div className="w-7 h-7 rounded-lg bg-[#fff3eb] flex items-center justify-center mb-3">
            <ArrowDownLeft className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-base font-bold text-black">
            {formatCurrency(totalCollected)}
          </p>
          <p className="text-xs text-[#959595] mt-0.5">Total collected</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
          <div className="w-7 h-7 rounded-lg bg-[#e6f1fb] flex items-center justify-center mb-3">
            <svg
              className="w-4 h-4 text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <p className="text-base font-bold text-black">
            {transactions.length}
          </p>
          <p className="text-xs text-[#959595] mt-0.5">Transactions</p>
        </div>
      </div>

      {/* Transactions list */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#f0f0f0]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-black">
            Transaction history
          </h4>
          <div className="flex gap-2">
            {(["all", "credit", "debit"] as FilterType[]).map((f) => (
              <button
                key={f}
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
                          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-orange-500" />
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
                          {new Date(txn.created_at).toLocaleTimeString(
                            "en-NG",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
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
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-sm text-[#0E9DA5] flex items-center gap-1.5 mx-auto hover:underline"
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {loadingMore ? "Loading..." : "Load more transactions"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

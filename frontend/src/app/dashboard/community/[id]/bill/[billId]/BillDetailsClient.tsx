"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { TransactionPinModal } from "@/components/wallet/TransactionPinModal";
import { toastAxiosError } from "@/hooks/useAxiosError";
import useCurrency from "@/hooks/useCurrency";
import useDateFormatter from "@/hooks/useDateFormatter";
import { ApiService, BillData } from "@/services/api";
import { ArrowDown, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CommunityDetailsClientProps {
  id: string;
  communityId: string;
}

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getNameInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function statusPillClass(status: string) {
  if (status === "paid" || status === "settled" || status === "active") {
    return "bg-[#e1f2ee] text-[#0a7a6b]";
  }
  if (status === "closed" || status === "cancelled") {
    return "bg-gray-100 text-gray-600";
  }
  return "bg-[#fff3eb] text-[#c6652e]";
}

export default function BillDetailsClient({
  id,
  communityId,
}: CommunityDetailsClientProps) {
  const [loading, setLoading] = useState(false);
  const [bill, setBill] = useState<BillData>();
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const { formatDate } = useDateFormatter();

  const expectedMemberCount = bill?.expected_member_count ?? 0;
  const paidMemberCount = bill?.paid_member_count ?? 0;
  const totalTarget = bill
    ? bill.type === "fixed"
      ? bill.amount * Math.max(expectedMemberCount, 1)
      : bill.amount
    : 0;
  const percentageCollected =
    bill && totalTarget > 0
      ? Math.min(100, (bill.collected_amount / totalTarget) * 100)
      : 0;
  const createdBy =
    bill?.creator?.full_name ||
    [bill?.creator?.firstname, bill?.creator?.lastname].filter(Boolean).join(" ") ||
    (bill?.creator_id ? `User #${bill.creator_id}` : "N/A");
  const payableAmount = bill
    ? bill.type === "free_will"
      ? Math.max(toNumber(bill.min_amount), bill.amount)
      : bill.amount
    : 0;
  const isPayable = bill?.status === "active";
  const memberStatuses = bill?.member_payment_statuses ?? [];
  const recentTransactions = bill?.recent_transactions ?? [];
  const visibleMembers = showAllMembers ? memberStatuses : memberStatuses.slice(0, 5);
  const visibleTransactions = showAllTransactions
    ? recentTransactions
    : recentTransactions.slice(0, 5);

  const fetchBillDetails = async () => {
    setLoading(true);
    try {
      const response = await ApiService.communities.getBill(
        parseInt(communityId),
        parseInt(id),
    );
      setBill(response.data.data);
    } catch (error: any) {
      toastAxiosError(error, "Failed to load bill details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillDetails();
  }, [id, communityId]);

  const handlePayBill = async (pin: string) => {
    if (!bill) return;
    setPaying(true);
    try {
      await ApiService.communities.payBill(
        parseInt(communityId),
        bill.id,
        {
          amount: payableAmount,
          payment_method: "wallet",
          pin,
        },
      );
      toast.success("Bill paid successfully");
      setPinOpen(false);
      await fetchBillDetails();
    } catch (error: any) {
      toastAxiosError(error, "Failed to pay bill.");
    } finally {
      setPaying(false);
    }
  };

  const billSummaryInfos = [
    {
      label: "Created by",
      value: createdBy,
    },
    {
      label: "Created on",
      value: bill?.created_at ? formatDate(bill.created_at) : "N/A",
    },
    {
      label: "Due date",
      value: (
        <div className="text-[#c4541a]">
          {bill?.due_date ? formatDate(bill.due_date) : "N/A"}
        </div>
      ),
    },
    {
      label: "Frequency",
      value: bill?.recurrence_type || "One-time",
    },
    {
      label: "Status",
      value: bill?.status ? (
        <div className={`${statusPillClass(bill.status)} flex items-center gap-1 p-0.5 px-3 rounded-full capitalize text-xs`}>
          <span className="bg-current w-1 aspect-square rounded-full"></span>
          {bill.status}
        </div>
      ) : (
        "N/A"
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout pageTitle="Loading...">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!bill) {
    return (
      <DashboardLayout pageTitle="Bill Not Found">
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold">Bill not found</h2>
          <Button
            onClick={() => router.push(`/dashboard/community/${communityId}`)}
            className="mt-4"
          >
            Back to Bills
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={bill.title || "Bill"}>
      {/* Back Button */}
      <div className="flex flex-col gap-4 mb-2">
        <Button
          variant="ghost"
          className="self-start font-normal text-gray-600"
          onClick={() => router.push(`/dashboard/community/${communityId}`)}
        >
          <ArrowLeft />
          Back to Bills
        </Button>
      </div>

      {/* Bill Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-4">
          <div>
            <div className="flex justify-between items-center gap-2">
              <span className={`${statusPillClass(bill.status)} flex items-center gap-1 p-0.5 px-3 text-xs rounded-full font-medium capitalize`}>
                <span className="bg-current w-1 aspect-square rounded-full"></span>
                {bill.status}
              </span>
              <p className="text-xs text-gray-500 font-medium text-right">
                {bill.type === "free_will" ? "Suggested" : "Amount per"}
                <br /> {bill.type === "free_will" ? "amount" : "member"}
              </p>
            </div>
            <div className="flex justify-between items-center gap-4">
              <h2 className="text-xl font-medium">{bill.title}</h2>
              <h1 className="text-3xl font-bold">
                {formatCurrency(bill.amount)}
              </h1>
            </div>
            <p className="text-gray-600 font-medium text-sm max-w-3/4">
              {bill.description}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 text-sm text-gray-600 font-medium">
              {`${formatCurrency(bill.collected_amount)} collected of ${formatCurrency(totalTarget)}`}
              <span className="text-[#0a7a6b]">{percentageCollected.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#1ec99c] h-2 rounded-full"
                style={{ width: `${percentageCollected.toFixed(0)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-xl font-bold">
                {paidMemberCount}/{expectedMemberCount}
              </p>
              <p className="text-base text-gray-500 font-medium">
                Members paid
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-xl font-bold">
                {formatCurrency(bill.collected_amount)}
              </p>
              <p className="text-base text-gray-500 font-medium">Collected</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-xl font-bold">
                {formatCurrency(totalTarget)}
              </p>
              <p className="text-base text-gray-500 font-medium">Total</p>
            </div>
          </div>

          <div className="border-t border-gray-200 py-4 flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Members payment status</h3>
            <div className="flex flex-col gap-2">
              {visibleMembers.length === 0 ? (
                <div className="bg-gray-100 p-4 rounded-lg text-sm text-gray-500">
                  No member payment statuses yet
                </div>
              ) : (
                visibleMembers.map((member) => {
                  const name =
                    member.user?.full_name ||
                    [member.user?.firstname, member.user?.lastname].filter(Boolean).join(" ") ||
                    `User #${member.user_id}`;
                  const paid = member.status === "paid";
                  return (
                    <div
                      key={member.member_id}
                      className="bg-gray-100 p-3 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-10 h-10 bg-[#e1f2ee] text-[#0a7a6b] rounded-full flex justify-center items-center font-bold flex-shrink-0">
                          {getNameInitials(name)}
                        </div>
                        <div className="text-base font-medium truncate">
                          {name}
                          <p className="text-xs text-gray-500">
                            {paid && member.paid_at
                              ? `Paid ${formatDate(member.paid_at)}`
                              : paid
                                ? `${formatCurrency(member.amount_paid)} paid`
                                : "Pending payment"}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`${paid ? "bg-[#e1f2ee] text-[#0a7a6b]" : "bg-[#fff3eb] text-[#c6652e]"} text-xs font-bold p-0.5 px-3 rounded-full capitalize`}
                      >
                        {member.status}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {memberStatuses.length > 5 && (
              <Button
                variant="outline"
                className="self-center"
                onClick={() => setShowAllMembers((current) => !current)}
              >
                {showAllMembers ? "Show fewer members" : `Show all ${memberStatuses.length} members`}
                <ArrowDown />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-4 py-6 flex flex-col gap-4">
            <h3 className="text-base font-bold">Bill summary</h3>
            <div className="flex flex-col">
              {billSummaryInfos.map((info, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2 border-b border-gray-200"
                >
                  <span className="text-gray-400">{info.label}</span>
                  <span className="font-medium">{info.value}</span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="self-center min-w-60"
              onClick={() => setPinOpen(true)}
              disabled={!isPayable || paying}
            >
              Pay {formatCurrency(payableAmount)}
            </Button>
          </div>

          <div className="bg-white rounded-2xl p-4 flex flex-col gap-4">
            <h3 className="text-base font-bold">Recent transactions</h3>
            <div className="flex flex-col gap-2">
              {visibleTransactions.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  No recent transactions
                </div>
              ) : (
                visibleTransactions.map((transaction) => {
                  const paidAt = transaction.created_at
                    ? new Date(transaction.created_at)
                    : null;
                  const payerName =
                    transaction.payer_name ||
                    transaction.payer?.full_name ||
                    transaction.user?.full_name ||
                    "Member";
                  return (
                    <div
                      key={transaction.id}
                      className="py-3 flex items-center justify-between border-b border-gray-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-10 h-10 bg-[#e1f2ee] text-[#19a1a9] rounded-lg flex justify-center items-center font-bold flex-shrink-0">
                          {getNameInitials(payerName)}
                        </div>
                        <div className="text-base font-medium truncate">
                          {payerName}
                          <div className="flex items-center gap-0.5 text-xs text-gray-500">
                            {paidAt && !Number.isNaN(paidAt.getTime())
                              ? formatDate(transaction.created_at)
                              : "N/A"}
                            <span className="w-0.5 aspect-square bg-gray-500 rounded-full"></span>
                            Wallet
                          </div>
                        </div>
                      </div>

                      <div className="text-[#10b981] font-bold p-0.5 px-3 rounded-full">
                        +{formatCurrency(toNumber(transaction.net_amount ?? transaction.amount))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {recentTransactions.length > 5 && (
              <Button
                variant="outline"
                className="self-center"
                onClick={() => setShowAllTransactions((current) => !current)}
              >
                {showAllTransactions ? "Show fewer transactions" : "View all transactions"}
                <ArrowDown />
              </Button>
            )}
          </div>
        </div>
      </div>
      <TransactionPinModal
        isOpen={pinOpen}
        onClose={() => {
          if (!paying) setPinOpen(false);
        }}
        onConfirm={handlePayBill}
        title="Pay bill"
        confirmButtonText="Pay"
        loading={paying}
      />
    </DashboardLayout>
  );
}

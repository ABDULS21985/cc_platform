"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Clock, Loader2 } from "lucide-react";
import { CreateCampaignDialog } from "./CreateCampaignDialog";
import { CreateSplitPaymentDialog } from "./CreateSplitPaymentDialog";
import { SelectedBillModal } from "./SelectedBillModal";
import { ApiService, type BillData, type CreateBillPayload } from "@/services/api";
import useCurrency from "@/hooks/useCurrency";
import { toastAxiosError } from "@/hooks/useAxiosError";
import { toast } from "sonner";

interface ExpensesTabProps {
  communityName: string;
  communityId: number;
}

export function ExpensesTab({ communityName, communityId }: ExpensesTabProps) {
  const [activeTab, setActiveTab] = useState<"campaigns" | "split-payment">(
    "campaigns",
  );
  const [bills, setBills] = useState<BillData[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isCreateSplitPaymentOpen, setIsCreateSplitPaymentOpen] =
    useState(false);
  const [selectedBill, setSelectedBill] = useState<BillData>();
  const { formatCurrency } = useCurrency();

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await ApiService.communities.getBills(communityId, {
        limit: 200,
        offset: 0,
      });
      setBills(response.data.data.bills ?? []);
    } catch (error) {
      toastAxiosError(error, "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchExpenses();
  }, [communityId]);

  const visibleBills = useMemo(
    () =>
      bills.filter((bill) =>
        activeTab === "campaigns"
          ? bill.type === "free_will"
          : bill.type === "fixed",
      ),
    [activeTab, bills],
  );

  const calculateProgress = (bill: BillData) => {
    if (typeof bill.progress_percentage === "number") {
      return Math.min(100, Math.max(0, bill.progress_percentage));
    }
    if (bill.amount <= 0) return 0;
    return Math.min(100, Math.max(0, (bill.collected_amount / bill.amount) * 100));
  };

  const daysLeft = (dueDate: string) => {
    const due = new Date(dueDate).getTime();
    if (Number.isNaN(due)) return null;
    return Math.max(0, Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  const handleCreateButtonClick = () => {
    if (activeTab === "campaigns") {
      setIsCreateCampaignOpen(true);
    } else {
      setIsCreateSplitPaymentOpen(true);
    }
  };

  const handleCreateExpense = async (payload: CreateBillPayload, label: string) => {
    setCreating(true);
    try {
      await ApiService.communities.createBill(communityId, payload);
      toast.success(`${label} created`);
      setIsCreateCampaignOpen(false);
      setIsCreateSplitPaymentOpen(false);
      await fetchExpenses();
    } catch (error) {
      toastAxiosError(error, `Failed to create ${label.toLowerCase()}.`);
      throw error;
    } finally {
      setCreating(false);
    }
  };

  const handleViewHistory = async (bill: BillData) => {
    try {
      const response = await ApiService.communities.getBill(communityId, bill.id);
      setSelectedBill(response.data.data);
    } catch (error) {
      toastAxiosError(error, "Failed to load payment history.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("campaigns")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "campaigns"
                  ? "bg-white text-[#000000] shadow-sm"
                  : "text-[#525252] hover:text-[#000000]"
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab("split-payment")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "split-payment"
                  ? "bg-white text-[#000000] shadow-sm"
                  : "text-[#525252] hover:text-[#000000]"
              }`}
            >
              Split payment
            </button>
          </div>

          <Button
            onClick={handleCreateButtonClick}
            className="bg-[#0E9DA5] hover:bg-[#0E9DA5]/90 text-white px-4 py-2 rounded-full"
          >
            {activeTab === "campaigns"
              ? "Create campaign"
              : "Create split payment"}
          </Button>
        </div>
      </div>

      {activeTab === "campaigns" && (
        <>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : visibleBills.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {visibleBills.map((campaign) => {
                const progressPercentage = calculateProgress(campaign);
                const remainingDays = daysLeft(campaign.due_date);

                return (
                  <div
                    key={campaign.id}
                    className="bg-[#f5f5f5] rounded-lg p-3 border border-gray-100"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-[#000000] mb-2">
                        {campaign.title}
                      </h3>
                      <p className="text-sm text-[#525252]">
                        {campaign.description || `Campaign in ${communityName}`}
                      </p>
                    </div>

                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#10B981] h-2 rounded-full"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-semibold text-[#000000]">
                        {formatCurrency(campaign.collected_amount)} of {formatCurrency(campaign.amount)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm text-[#525252]">
                        <Clock className="w-4 h-4" />
                        <span>{remainingDays === null ? "No due date" : `${remainingDays} days left`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#525252]">
                        <Users className="w-4 h-4" />
                        <span>{campaign.paid_member_count ?? 0} donors</span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleViewHistory(campaign)}
                        className="px-4 py-2 text-sm text-[#525252] bg-[#f5f5f5] border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        View payment history
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 bg-white rounded-lg border border-dashed border-gray-200">
              <p className="text-sm text-[#525252]">No campaigns yet for {communityName}</p>
            </div>
          )}
        </>
      )}

      {activeTab === "split-payment" && (
        <>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : visibleBills.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {visibleBills.map((splitPayment) => {
                const progressPercentage = calculateProgress(splitPayment);
                const remainingDays = daysLeft(splitPayment.due_date);

                return (
                  <div
                    key={`split-${splitPayment.id}`}
                    className="bg-[#f5f5f5] rounded-lg p-3 border border-gray-100"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-[#000000] mb-2">
                        {splitPayment.title}
                      </h3>
                      <p className="text-sm text-[#525252]">
                        {splitPayment.description || `Split payment in ${communityName}`}
                      </p>
                    </div>

                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#10B981] h-2 rounded-full"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-semibold text-[#000000]">
                        {formatCurrency(splitPayment.collected_amount)} of {formatCurrency(splitPayment.amount)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm text-[#525252]">
                        <Clock className="w-4 h-4" />
                        <span>{remainingDays === null ? "No due date" : `${remainingDays} days left`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#525252]">
                        <Users className="w-4 h-4" />
                        <span>
                          {splitPayment.paid_member_count ?? 0}/{splitPayment.expected_member_count ?? 0} paid
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleViewHistory(splitPayment)}
                        className="px-4 py-2 text-sm text-[#525252] bg-[#f5f5f5] border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        View payment history
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 bg-white rounded-lg border border-dashed border-gray-200">
              <p className="text-sm text-[#525252]">No split payments yet for {communityName}</p>
            </div>
          )}
        </>
      )}

      <CreateCampaignDialog
        isOpen={isCreateCampaignOpen}
        onClose={() => setIsCreateCampaignOpen(false)}
        onCreate={(payload) => handleCreateExpense(payload, "Campaign")}
        isSubmitting={creating}
      />

      <CreateSplitPaymentDialog
        isOpen={isCreateSplitPaymentOpen}
        onClose={() => setIsCreateSplitPaymentOpen(false)}
        onCreate={(payload) => handleCreateExpense(payload, "Split payment")}
        isSubmitting={creating}
      />

      {selectedBill && (
        <SelectedBillModal
          isOpen={!!selectedBill}
          onClose={() => setSelectedBill(undefined)}
          bill={selectedBill}
          communityId={communityId}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Clock } from "lucide-react";
import { CreateCampaignDialog } from "./CreateCampaignDialog";
import { CreateSplitPaymentDialog } from "./CreateSplitPaymentDialog";
import { SelectedBillModal } from "./SelectedBillModal";

interface ExpensesTabProps {
  communityName: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  currentAmount: string;
  totalAmount: string;
  daysLeft: number;
  donors: number;
}

export function ExpensesTab({ communityName }: ExpensesTabProps) {
  const [activeTab, setActiveTab] = useState<"campaigns" | "split-payment">(
    "campaigns",
  );
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isCreateSplitPaymentOpen, setIsCreateSplitPaymentOpen] =
    useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );

  const campaigns: Campaign[] = [
    {
      id: "1",
      title: "End of the year party",
      description:
        "Help us celebrate our achievements with an amazing year-end celebration!",
      currentAmount: "₦19,000",
      totalAmount: "₦38,000",
      daysLeft: 8,
      donors: 12,
    },
    {
      id: "2",
      title: "End of the year party",
      description:
        "Help us celebrate our achievements with an amazing year-end celebration!",
      currentAmount: "₦19,000",
      totalAmount: "₦38,000",
      daysLeft: 8,
      donors: 12,
    },
  ];

  const calculateProgress = (current: string, total: string) => {
    const currentNum = parseInt(current.replace(/[₦,]/g, ""));
    const totalNum = parseInt(total.replace(/[₦,]/g, ""));
    return (currentNum / totalNum) * 100;
  };

  const handleCreateButtonClick = () => {
    if (activeTab === "campaigns") {
      setIsCreateCampaignOpen(true);
    } else {
      setIsCreateSplitPaymentOpen(true);
    }
  };

  const handleViewHistory = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsPaymentHistoryOpen(true);
  };

  const closePaymentHistory = () => {
    setIsPaymentHistoryOpen(false);
    setSelectedCampaign(null);
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campaigns.map((campaign) => {
            const progressPercentage = calculateProgress(
              campaign.currentAmount,
              campaign.totalAmount,
            );

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
                    {campaign.description}
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
                    {campaign.currentAmount} of {campaign.totalAmount}
                  </p>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-[#525252]">
                    <Clock className="w-4 h-4" />
                    <span>{campaign.daysLeft} days left</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#525252]">
                    <Users className="w-4 h-4" />
                    <span>Donors</span>
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
      )}

      {activeTab === "split-payment" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campaigns.map((campaign) => {
            const progressPercentage = calculateProgress(
              campaign.currentAmount,
              campaign.totalAmount,
            );

            return (
              <div
                key={`split-${campaign.id}`}
                className="bg-[#f5f5f5] rounded-lg p-3 border border-gray-100"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[#000000] mb-2">
                    {campaign.title} (Split)
                  </h3>
                  <p className="text-sm text-[#525252]">
                    {campaign.description}
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
                    {campaign.currentAmount} of {campaign.totalAmount}
                  </p>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-[#525252]">
                    <Clock className="w-4 h-4" />
                    <span>{campaign.daysLeft} days left</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#525252]">
                    <Users className="w-4 h-4" />
                    <span>Donors</span>
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
      )}

      {/* Create Campaign Dialog */}
      <CreateCampaignDialog
        isOpen={isCreateCampaignOpen}
        onClose={() => setIsCreateCampaignOpen(false)}
      />

      {/* Create Split Payment Dialog */}
      <CreateSplitPaymentDialog
        isOpen={isCreateSplitPaymentOpen}
        onClose={() => setIsCreateSplitPaymentOpen(false)}
      />

      {/* Payment History Modal */}
      {/* {selectedCampaign && (
        <SelectedBillModal
          isOpen={isPaymentHistoryOpen}
          onClose={closePaymentHistory}
          paymentType={selectedCampaign.title}
          paymentDescription={selectedCampaign.description}
          amountDue={selectedCampaign.totalAmount}
          totalAmount={selectedCampaign.totalAmount}
          progressAmount={selectedCampaign.currentAmount}
          progressTotal={selectedCampaign.totalAmount}
          paidCount={Math.floor(
            parseInt(selectedCampaign.currentAmount.replace(/[₦,]/g, "")) /
              1000,
          )}
          totalCount={Math.floor(
            parseInt(selectedCampaign.totalAmount.replace(/[₦,]/g, "")) / 1000,
          )}
        />
      )} */}
    </div>
  );
}

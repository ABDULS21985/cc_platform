"use client";

import { useEffect, useState } from "react";
import { SelectedBillModal } from "./SelectedBillModal";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { ApiService, BillData } from "@/services/api";
import toast from "react-hot-toast";
import useCurrency from "@/hooks/useCurrency";
import CreateBillDialog from "../dialogs/CreateBillDialog";
import { ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toastAxiosError } from "@/hooks/useAxiosError";

interface DuesPaymentTabProps {
  communityId: number;
  isOwner?: boolean;
}

interface PaymentCard {
  id: string;
  type: string;
  description: string;
  amountDue: string;
  progressAmount: string;
  progressTotal: string;
  paidCount: number;
  totalCount: number;
}

export function BillsTab({ communityId, isOwner }: DuesPaymentTabProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "completed" | "expired">(
    "all",
  );
  const [bills, setBills] = useState<BillData[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillData>();
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { formatCurrency } = useCurrency();

  const goToDetailsPage = (billId: number) => {
    router.push(`/dashboard/community/${communityId}/bill/${billId}`);
  }

  const toggleCreateModal = () => {
    setIsCreateModalOpen(!isCreateModalOpen);
  };

  const fetchBills = async () => {
    setLoading(true);
    try {
      const response = await ApiService.communities.getBills(communityId);
      console.log("Fetched bills:", response.data.data);
      setBills(response.data.data.bills);
    } catch (error: any) {
      toastAxiosError(error, "Failed to load bills.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) =>
              setActiveTab(v as "all" | "completed" | "expired")
            }
          >
            <TabsList className="bg-gray-100 p-1">
              <TabsTrigger
                value="all"
                className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-[#000000] data-[state=active]:shadow-sm data-[state=inactive]:text-[#525252] data-[state=inactive]:hover:text-[#000000]"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-[#000000] data-[state=active]:shadow-sm data-[state=inactive]:text-[#525252] data-[state=inactive]:hover:text-[#000000]"
              >
                Completed
              </TabsTrigger>
              <TabsTrigger
                value="expired"
                className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-[#000000] data-[state=active]:shadow-sm data-[state=inactive]:text-[#525252] data-[state=inactive]:hover:text-[#000000]"
              >
                Expired
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {isOwner && (
            <Button
              onClick={toggleCreateModal}
              className="bg-[#0E9DA5] hover:bg-[#0E9DA5]/90 text-white px-4 py-2 rounded-full"
            >
              Create bill
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : bills.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bills.map((bill) => (
            <div key={bill.id} className="bg-[#f5f5f5] rounded-lg p-3">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-[#000000] mb-1 capitalize">
                    {bill.title}
                  </h4>
                  <p className="text-sm text-[#525252]">{bill.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#000000]">
                    {formatCurrency(bill.amount)}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#10B981] h-2 rounded-full"
                    style={{ width: "0%" }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  {/* <span className="text-sm text-[#000000]">
                  {bill.progressAmount} of {bill.progressTotal}
                </span> */}
                </div>
                <span className="text-sm text-[#525252]">
                  {/* {bill.paidCount}/{bill.totalCount} paid */}
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => goToDetailsPage(bill.id)}
                  className="px-3 bg-[#ededed] cursor-pointer py-2 text-sm text-[#525252] border rounded-full hover:bg-gray-50 hover:text-[#000000] flex items-center gap-1"
                >
                  View Bill <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-[#525252]">No bills found</p>
        </div>
      )}

      {/* Payment History Modal */}
      {selectedBill && (
        <SelectedBillModal
          isOpen={!!selectedBill}
          onClose={() => setSelectedBill(undefined)}
          bill={selectedBill}
          communityId={communityId}
        />
      )}

      {/* Create Bill Modal */}
      {isCreateModalOpen && (
        <CreateBillDialog
          isOpen={isCreateModalOpen}
          toggleDialog={toggleCreateModal}
          communityId={communityId}
          onSuccess={fetchBills}
        />
      )}
    </div>
  );
}

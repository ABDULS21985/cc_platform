"use client";

import { X, ChevronDown, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ApiService, BillData, PayBillPayload } from "@/services/api";
import useCurrency from "@/hooks/useCurrency";
import { Button } from "../ui/button";
import { useState } from "react";
import toast from "react-hot-toast";
import { toastAxiosError } from "@/hooks/useAxiosError";

interface SelectedBillProps {
  isOpen: boolean;
  onClose: () => void;
  bill: BillData;
  communityId: number;
}

export function SelectedBillModal({
  isOpen,
  onClose,
  bill,
  communityId,
}: SelectedBillProps) {
  const [isPaying, setIsPaying] = useState(false);
  const { formatCurrency } = useCurrency();
  const progressPercentage = 50;
  // const progressPercentage =
  //   (parseInt(progressAmount.replace(/[₦,]/g, '')) /
  //     parseInt(progressTotal.replace(/[₦,]/g, ''))) *
  //   100;

  const members = [
    { name: "Alice johnson", status: "paid" },
    { name: "Alice johnson", status: "pending" },
    { name: "Alice johnson", status: "pending" },
    { name: "Alice johnson", status: "pending" },
  ];

  const payBill = async () => {
    setIsPaying(true);
    try {
      const payload: PayBillPayload = {
        amount: bill.amount,
        payment_method: "wallet",
      };
      await ApiService.communities.payBill(communityId, bill.id, payload);
      toast.success("Bill paid successfully");
    } catch (error: any) {
      toastAxiosError(error, "Failed to pay bill. Please try again.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showClose={false} className="p-0 bg-white/95 backdrop-blur-2xl rounded-[32px] w-full max-w-lg overflow-hidden border-white/20 shadow-elevated animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-50/50">
          <DialogTitle className="text-xl font-extrabold text-gray-900 tracking-tight">Bill Details</DialogTitle>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="p-4 space-y-6 border border-[#f2f2f2] rounded-lg">
            <div className="bg-[#f5f5f5] p-4 rounded-lg flex flex-col gap-4">
              <div className="flex justify-between">
                <div>
                  <h4 className="font-semibold text-[#000000] mb-1 capitalize">
                    {bill.title}
                  </h4>
                  <p className="text-sm text-[#525252]">{bill.description}</p>
                </div>
                <div className="flex flex-col gap-4 text-right">
                  <p className="text-lg font-bold text-[#000000]">
                    {formatCurrency(bill.amount)}
                  </p>
                  <Button
                    size={"sm"}
                    className="text-white"
                    onClick={payBill}
                    disabled={isPaying}
                  >
                    {isPaying ? (
                      <div className="flex items-center gap-1">
                        <Loader2 className="animate-spin" /> Paying
                      </div>
                    ) : (
                      <>Pay</>
                    )}
                  </Button>
                </div>
              </div>
              <div className="mb-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#1ec99c] h-2 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* <div className="flex items-center justify-between">
                <span className="text-sm text-[#000000]">
                  <span className="font-[600]">{progressAmount}</span> of{' '}
                  <span className="text-[#a3a3a3]">{progressTotal}</span>
                </span>
                <span className="text-sm text-[#525252]">
                  {paidCount}/{totalCount} paid
                </span>
              </div> */}
            </div>

            <div>
              <h5 className="font-semibold text-[#000000] mb-3">Members :</h5>
              <div className="space-y-3">
                {members.map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-[#f5f5f5]  p-2 rounded-lg justify-between"
                  >
                    <span className="text-sm text-[#000000]">
                      {member.name}
                    </span>
                    <span
                      className={`text-sm py-1 px-2 rounded-full ${
                        member.status === "paid"
                          ? "text-[#5bd5b4] bg-[#e1f2ee]"
                          : "text-[#ff8b38] bg-[#f6ebe3]"
                      }`}
                    >
                      • {member.status === "paid" ? "Paid" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>

              {/* <div className="mt-4 text-center">
                <button className="text-sm text-[#000000] flex items-center justify-center gap-1 mx-auto hover:underline font-[500]">
                  See more
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div> */}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

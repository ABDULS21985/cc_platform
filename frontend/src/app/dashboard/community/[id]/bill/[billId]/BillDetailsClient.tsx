"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toastAxiosError } from "@/hooks/useAxiosError";
import useCurrency from "@/hooks/useCurrency";
import useDateFormatter from "@/hooks/useDateFormatter";
import { ApiService, BillData } from "@/services/api";
import { ArrowDown, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface CommunityDetailsClientProps {
  id: string;
  communityId: string;
}

export default function BillDetailsClient({
  id,
  communityId,
}: CommunityDetailsClientProps) {
  // const billId = parseInt(id);

  const [loading, setLoading] = useState(false);
  const [bill, setBill] = useState<BillData>();
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const { formatDate } = useDateFormatter();

  const percentageCollected = bill ? (bill?.collected_amount / bill?.amount) * 100 : 0;

  const fetchBillDetails = async () => {
    setLoading(true);
    try {
      const response = await ApiService.communities.getBill(
        parseInt(communityId),
        parseInt(id),
      );
      setBill(response.data.data);
    } catch (error: any) {
      console.error("Failed to fetch bill details: ", error);
      toastAxiosError(error, "Failed to load bill details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillDetails();
  }, [id, communityId]);

  const billSummaryInfos = [
    {
      label: "Created by",
      value: "Admin",
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
        <div className="bg-[#e1f2ee] text-[#0a7a6b] flex items-center gap-1 p-0.5 px-3 rounded-full capitalize text-xs">
          <span className="bg-[#0a7a6b] w-1 aspect-square rounded-full"></span>
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
              <span className="bg-[#e1f2ee] text-[#0a7a6b] flex items-center gap-1 p-0.5 px-3 text-xs rounded-full font-medium">
                <span className="bg-[#0a7a6b] w-1 aspect-square rounded-full"></span>
                Active
              </span>
              <p className="text-xs text-gray-500 font-medium text-right">
                Amount per
                <br /> member
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
              {`${formatCurrency(bill.collected_amount)} collected of ${formatCurrency(bill.amount)}`}
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
              <p className="text-xl font-bold">7/15</p>
              <p className="text-base text-gray-500 font-medium">
                Members paid
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-xl font-bold">₦35k</p>
              <p className="text-base text-gray-500 font-medium">Collected</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-xl font-bold">₦50k</p>
              <p className="text-base text-gray-500 font-medium">Total</p>
            </div>
          </div>

          <div className="border-t border-gray-200 py-4 flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Members payment status</h3>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-100 p-3 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#e1f2ee] text-[#0a7a6b] rounded-full flex justify-center items-center font-bold">
                      AJ
                    </div>
                    <div className="text-base font-medium">
                      Alice Johnson
                      <p className="text-xs text-gray-500">Paid Apr 20, 2026</p>
                    </div>
                  </div>

                  <div
                    className={`${i % 2 === 0 ? "bg-[#e1f2ee] text-[#0a7a6b]" : "bg-[#fff3eb] text-[#c6652e]"} text-xs font-bold p-0.5 px-3 rounded-full`}
                  >
                    {i % 2 === 0 ? "Paid" : "Pending"}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="self-center">
              Show all 15 members
              <ArrowDown />
            </Button>
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
            <Button variant="outline" className="self-center min-w-60">
              Pay {formatCurrency(bill.amount)}
            </Button>
          </div>

          <div className="bg-white rounded-2xl p-4 flex flex-col gap-4">
            <h3 className="text-base font-bold">Recent transactions</h3>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="py-3 flex items-center justify-between border-b border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#e1f2ee] text-[#19a1a9] rounded-lg flex justify-center items-center font-bold text-x;">
                      $
                    </div>
                    <div className="text-base font-medium">
                      Alice Johnson
                      <div className="flex items-center gap-0.5 text-xs text-gray-500">
                        Apr 20, 2026
                        <span className="w-0.5 aspect-square bg-gray-500 rounded-full"></span>
                        10:32 AM
                        <span className="w-0.5 aspect-square bg-gray-500 rounded-full"></span>
                        Wallet
                      </div>
                    </div>
                  </div>

                  <div
                    className={`text-[#10b981] font-bold p-0.5 px-3 rounded-full`}
                  >
                    +{formatCurrency(bill.amount)}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="self-center">
              View all transactions
              <ArrowDown />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

"use client";

import { ApiService, CreateBillPayload } from "@/services/api";
import { useState } from "react";
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { toastAxiosError } from "@/hooks/useAxiosError";

interface CreateBillDialogProps {
  isOpen: boolean;
  toggleDialog: () => void;
  communityId: number;
  onSuccess?: () => void;
}

type BillType = "fixed" | "free_will";
type RecurrenceType = "weekly" | "monthly" | "yearly";

export default function CreateBillDialog({
  isOpen,
  toggleDialog,
  communityId,
  onSuccess,
}: CreateBillDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<BillType>();
  const [minAmount, setMinAmount] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>();
  const [dueDate, setDueDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const billTypes = ["fixed", "percentage"];
  const recurrenceTypes = ["daily", "weekly", "monthly"];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = "Valid amount is required";
    }
    if (!type) newErrors.type = "Bill type is required";
    if (
      !minAmount.trim() ||
      isNaN(Number(minAmount)) ||
      Number(minAmount) <= 0
    ) {
      newErrors.minAmount = "Valid min amount is required";
    }
    if (!dueDate.trim()) {
      newErrors.dueDate = "Due date is required";
    }
    if (isRecurring && !recurrenceType) {
      newErrors.recurrenceType = "Recurrence type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onBillTypeValueChange = (value: string) => {
    if (billTypes.includes(value as BillType)) {
      setType(value as BillType);
    }
  };

  const onRecurrenceTypeValueChange = (value: string) => {
    if (recurrenceTypes.includes(value as RecurrenceType)) {
      setRecurrenceType(value as RecurrenceType);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);

    try {
      const payload: CreateBillPayload = {
        title: title.trim(),
        description: description.trim(),
        amount: Number(amount),
        type,
        min_amount: Number(minAmount),
        is_recurring: isRecurring,
        recurrence_type: recurrenceType,
        due_date: dueDate.trim(),
      };

      await ApiService.communities.createBill(communityId, payload);
      toast.success("Bill created successfully");

      // Reset
      setTitle("");
      setDescription("");
      setAmount("");
      setType(undefined);
      setMinAmount("");
      setIsRecurring(false);
      setRecurrenceType(undefined);
      setDueDate("");
      setErrors({});

      onSuccess?.();
      toggleDialog();
    } catch (error: any) {
      toastAxiosError(error, "Failed to create bill.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={toggleDialog}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Create new bill
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Title */}
          <div className="grid gap-1.5">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter bill title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={errors.title && "border-red-500"}
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="description"
              placeholder="What is this bill for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[90px] resize-y ${
                errors.description ? "border-red-500" : ""
              }`}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Amount */}
          <div className="grid gap-1.5">
            <Label htmlFor="amount">
              Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={errors.amount && "border-red-500"}
              disabled={isLoading}
            />
            {errors.amount && (
              <p className="text-xs text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* Type */}
          <div className="grid gap-1.5">
            <Label htmlFor="billType">
              Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={type}
              onValueChange={onBillTypeValueChange}
              disabled={isLoading}
            >
              <SelectTrigger id="type" className={`focus:ring-0 capitalize`}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {billTypes.map((bType) => (
                  <SelectItem
                    key={bType}
                    value={bType}
                    className="cursor-pointer capitalize"
                  >
                    {bType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-red-500">{errors.type}</p>
            )}
          </div>

          {/* Min Amount */}
          <div className="grid gap-1.5">
            <Label htmlFor="minAmount">
              Min Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              id="minAmount"
              placeholder="Enter min amount"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className={errors.minAmount && "border-red-500"}
              disabled={isLoading}
            />
            {errors.minAmount && (
              <p className="text-xs text-red-500">{errors.minAmount}</p>
            )}
          </div>

          {/* Due Date */}
          <div className="grid gap-1.5">
            <Label htmlFor="dueDate">
              Due date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dueDate"
              placeholder="Select due date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={errors.dueDate && "border-red-500"}
              disabled={isLoading}
            />
            {errors.dueDate && (
              <p className="text-xs text-red-500">{errors.dueDate}</p>
            )}
          </div>

          {/* Recurrence Toggle */}
          <div className="flex items-center justify-between border p-3 rounded-lg">
            <div>
              <p className="text-sm font-medium">Recurring</p>
              <p className="text-xs text-muted-foreground">
                This bill will be recurring based on the selected recurrence
                type.
              </p>
            </div>
            <Switch
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
              disabled={isLoading}
            />
          </div>

          {/* Recurrence Type */}
          {isRecurring && (
            <div className="grid gap-1.5">
              <Label htmlFor="recurrenceType">
                Recurrence Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={recurrenceType}
                onValueChange={onRecurrenceTypeValueChange}
                disabled={isLoading}
              >
                <SelectTrigger id="recurrenceType" className={`focus:ring-0`}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceTypes.map((rType) => (
                    <SelectItem
                      key={rType}
                      value={rType}
                      className="cursor-pointer"
                    >
                      {rType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.recurrenceType && (
                <p className="text-xs text-red-500">{errors.recurrenceType}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={toggleDialog} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-[#0E9DA5] hover:bg-[#0C8D94]"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

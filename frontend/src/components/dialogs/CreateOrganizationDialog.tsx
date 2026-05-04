import { ApiService, CreateOrganizationPayload } from "@/services/api";
import { useState } from "react";
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { toastAxiosError } from "@/hooks/useAxiosError";

interface CreateOrganizationDialogProps {
  isOpen: boolean;
  toggleDialog: () => void;
  onSuccess?: () => void;
}

export default function CreateOrganizationDialog({
  isOpen,
  toggleDialog,
  onSuccess,
}: CreateOrganizationDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [institutionId, setInstitutionId] = useState();
  const [isDefault, setIsDefault] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Organization name is required";
    if (!description.trim()) newErrors.description = "Description is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);

    try {
      const payload: CreateOrganizationPayload = {
        name: name.trim(),
        description: description.trim(),
        institution_id: Number(institutionId),
        is_default: isDefault,
      };

      await ApiService.organizations.create(payload);
      toast.success("Organization created successfully");

      // Reset form
      setName("");
      setDescription("");
      setInstitutionId(undefined);
      setIsDefault(false);
      setErrors({});

      onSuccess?.();
      toggleDialog();
    } catch (error: any) {
      toastAxiosError(error, "Failed to create organization.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={toggleDialog}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Create new organization
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="name">
              Organization Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter organization name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name && "border-red-500"}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="description"
              placeholder="What is this organization about?"
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

          {/* Default toggle */}
          <div className="flex items-center justify-between border p-3 rounded-lg">
            <div>
              <p className="text-sm font-medium">Set as default</p>
              <p className="text-xs text-muted-foreground">
                This organization will be selected by default when creating new
                communities.
              </p>
            </div>
            <Switch
              checked={isDefault}
              onCheckedChange={setIsDefault}
              disabled={isLoading}
            />
          </div>
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
            Create Organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

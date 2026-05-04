import { AxiosError } from "axios";
import { toast } from 'sonner';

export const toastAxiosError = (error: any, customError?: string) => {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const message = error.response?.data.responseMessage || error.response?.data.message || "";
    
    // Check for Identity Verification / KYC required errors
    const isKycError = 
      status === 403 && 
      (message.toLowerCase().includes("verification") || 
       message.toLowerCase().includes("kyc") ||
       message.toLowerCase().includes("verify your identity"));

    if (isKycError) {
      // Redirect to verification tab under settings
      window.location.href = "/dashboard/settings?tab=verification";
      return; // Suppress toast
    }

    toast.error(
      message ||
        error.message ||
        customError ||
        "An error occurred!",
    );
  } else {
    toast.error(customError || error.responseMessage || "An error occurred!");
  }
};

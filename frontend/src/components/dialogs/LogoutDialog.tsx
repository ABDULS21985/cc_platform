"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiService } from "@/services/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, LogOut } from "lucide-react";

interface LogoutDialogProps {
  isOpen: boolean;
  toggleDialog: () => void;
}

const LogoutDialog = ({ isOpen, toggleDialog }: LogoutDialogProps) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleOpenChange = (open: boolean) => {
    if (!open) toggleDialog();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await ApiService.auth.logout();
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setIsLoggingOut(false);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_data");
      
      // Close the dialog first
      toggleDialog();
      
      toast.success("Logged out");
      
      // Small delay to allow modal cleanup before navigation
      setTimeout(() => {
        router.push("/signin");
        // Force unlock body just in case
        document.body.style.pointerEvents = "auto";
        document.body.style.overflow = "auto";
      }, 100);
    }
  };

  // Safety cleanup for Radix UI body locks
  useEffect(() => {
    return () => {
      document.body.style.pointerEvents = "auto";
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        showClose={false} 
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="p-0 bg-white/95 backdrop-blur-2xl rounded-[32px] w-full max-w-sm overflow-hidden border-white/20 shadow-elevated animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="p-8 text-center space-y-6">
           <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50/50">
              <LogOut className="w-10 h-10 text-red-500" />
           </div>
           
           <div className="space-y-2">
              <DialogTitle className="text-2xl font-extrabold text-gray-900 tracking-tight">Logout</DialogTitle>
              <p className="text-gray-500 font-medium leading-relaxed">
                 Are you sure you want to sign out? You'll need to sign back in to access your community dashboard.
              </p>
           </div>

           <div className="flex flex-col gap-3">
              <Button 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-extrabold shadow-glow-red transition-all flex items-center justify-center gap-2"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  "Yes, Logout"
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={toggleDialog}
                disabled={isLoggingOut}
                className="w-full h-12 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all"
              >
                Cancel
              </Button>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutDialog;

'use client';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SuccessScreen() {
  const router = useRouter();

  const handleDone = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-[#f8fafc] relative overflow-hidden">
        {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
         <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#0E9DA5]/10 to-[#0E9DA5]/5 blur-3xl opacity-50" />
         <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#0E9DA5]/10 to-[#0E9DA5]/5 blur-3xl opacity-50" />
      </div>

       <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
        <Image
          src="/images/main-logo.svg"
          alt="Community Circle"
          width={40}
          height={40}
          className="w-10 h-10"
        />
      </div>

      <div className="w-full max-w-[400px] z-10 glass-card p-6 sm:p-8 rounded-2xl shadow-elevated border border-white/50 backdrop-blur-xl animate-scale-in text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center animate-bounce-slow">
              <CheckCircle className="w-10 h-10 text-[#0E9DA5]" />
            </div>
          </div>
          
          <div className="mb-8">
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Verification Successful
            </h1>
            <p className="text-gray-500 text-sm">
              Your identity has been verified successfully. Your wallet is now ready to use.
            </p>
          </div>

          <Button 
            onClick={handleDone}
            className="btn-primary w-full py-6 text-base font-semibold shadow-soft hover-glow"
          >
            Go to Dashboard
          </Button>
      </div>
    </div>
  );
}

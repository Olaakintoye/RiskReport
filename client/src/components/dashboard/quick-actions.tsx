import { useToast } from "@/hooks/use-toast";

interface QuickActionsProps {
  onDeposit: () => void;
  onWithdraw: () => void;
  onRedeem: () => void;
}

export default function QuickActions({ onDeposit, onWithdraw, onRedeem }: QuickActionsProps) {
  const { toast } = useToast();

  const handleAction = (action: string, callback: () => void) => {
    if (action === "deposit") {
      callback();
    } else {
      toast({
        title: "Feature coming soon",
        description: `The ${action} feature will be available in a future update.`,
        variant: "default",
      });
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <button 
        onClick={() => handleAction("deposit", onDeposit)}
        className="bg-white border border-neutral-200 rounded-lg p-3 flex flex-col items-center shadow-sm">
        <div className="w-10 h-10 bg-primary-light/10 rounded-full flex items-center justify-center mb-2">
          <i className="fas fa-plus text-primary"></i>
        </div>
        <span className="text-xs font-medium">Deposit</span>
      </button>
      
      <button 
        onClick={() => handleAction("withdraw", onWithdraw)}
        className="bg-white border border-neutral-200 rounded-lg p-3 flex flex-col items-center shadow-sm">
        <div className="w-10 h-10 bg-secondary-light/10 rounded-full flex items-center justify-center mb-2">
          <i className="fas fa-arrow-right text-secondary"></i>
        </div>
        <span className="text-xs font-medium">Withdraw</span>
      </button>
      
      <button 
        onClick={() => handleAction("redeem", onRedeem)}
        className="bg-white border border-neutral-200 rounded-lg p-3 flex flex-col items-center shadow-sm">
        <div className="w-10 h-10 bg-accent-light/10 rounded-full flex items-center justify-center mb-2">
          <i className="fas fa-rotate text-accent"></i>
        </div>
        <span className="text-xs font-medium">Redeem CD</span>
      </button>
    </div>
  );
}

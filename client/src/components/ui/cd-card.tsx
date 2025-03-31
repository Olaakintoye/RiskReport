import { formatCurrency, formatPercentage, formatDate, calculateProgressPercentage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Bank {
  id: number;
  name: string;
  rating: number;
  fdic_insured: boolean;
  logo_type: string;
  color: string;
}

interface CDProduct {
  id: number;
  bankId: number;
  name: string;
  termMonths: number;
  apy: number;
  minimumDeposit: number;
  earlyWithdrawalPenalty: string;
  description?: string;
}

interface Investment {
  id: number;
  amount: number;
  startDate: string;
  maturityDate: string;
  interestEarned: number;
  status: string;
  cdProduct?: CDProduct;
  bank?: Bank;
}

interface CDCardProps {
  investment: Investment;
  showActions?: boolean;
  onViewDetails?: () => void;
  onViewStatements?: () => void;
  onRedeem?: () => void;
}

export default function CDCard({ 
  investment, 
  showActions = false,
  onViewDetails,
  onViewStatements,
  onRedeem
}: CDCardProps) {
  const { amount, startDate, maturityDate, interestEarned, cdProduct, bank } = investment;
  
  const progress = calculateProgressPercentage(new Date(startDate), new Date(maturityDate));
  
  if (!cdProduct || !bank) return null;
  
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-3 shadow-sm">
      <div className="flex justify-between mb-2">
        <div className="flex items-center">
          <div className={cn(
            "w-10 h-10 bg-neutral-100 rounded-lg mr-3 flex items-center justify-center",
          )}>
            <i className={cn(
              "fas fa-landmark",
              bank.color === "primary" ? "text-primary" : 
              bank.color === "secondary" ? "text-secondary" : 
              bank.color === "accent" ? "text-accent" : "text-neutral-600"
            )}></i>
          </div>
          <div>
            <h3 className="font-medium">{bank.name}</h3>
            <p className="text-xs text-neutral-500">{cdProduct.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono font-semibold">{formatCurrency(amount)}</p>
          <p className="text-success text-xs font-medium">{formatPercentage(cdProduct.apy)} APY</p>
        </div>
      </div>
      
      <div className="w-full bg-neutral-100 rounded-full h-2 mb-1">
        <div 
          className={cn(
            "h-2 rounded-full",
            bank.color === "primary" ? "bg-primary" : 
            bank.color === "secondary" ? "bg-secondary" : 
            bank.color === "accent" ? "bg-accent" : "bg-neutral-600"
          )} 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between text-xs text-neutral-500 mb-3">
        <span>Started: {formatDate(startDate)}</span>
        <span>Matures: {formatDate(maturityDate)}</span>
      </div>
      
      {showActions && (
        <div className="grid grid-cols-3 text-center border-t border-neutral-200 pt-3">
          <button 
            onClick={onViewDetails}
            className="text-sm font-medium text-primary">
            Details
          </button>
          <button 
            onClick={onViewStatements}
            className="text-sm font-medium text-neutral-500">
            Statements
          </button>
          <button 
            onClick={onRedeem}
            className="text-sm font-medium text-neutral-500">
            Redeem
          </button>
        </div>
      )}
    </div>
  );
}

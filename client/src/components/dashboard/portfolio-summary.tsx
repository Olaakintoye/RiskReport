import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface PortfolioSummaryProps {
  userId: number;
}

export default function PortfolioSummary({ userId }: PortfolioSummaryProps) {
  const { data: summary, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}/portfolio-summary`],
  });

  if (isLoading) {
    return (
      <div className="bg-primary p-4 rounded-xl text-white mb-6 animate-pulse">
        <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-white/20 rounded w-2/3 mb-4"></div>
        <div className="h-6 bg-white/20 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-primary p-4 rounded-xl text-white mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-medium">Total Balance</h2>
        <i className="fas fa-eye-slash"></i>
      </div>
      <p className="font-mono text-3xl font-bold mb-1">
        {formatCurrency(summary?.totalInvested || 0)}
      </p>
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs text-primary-light bg-white/20 rounded-full px-2 py-1">
            <i className="fas fa-arrow-up text-xs"></i> 3.2% this month
          </span>
        </div>
        <div className="text-sm">
          <span className="text-primary-light">Interest earned: </span>
          <span className="font-mono font-medium">
            {formatCurrency(summary?.interestEarned || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

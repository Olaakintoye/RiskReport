import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import ProgressBar from "@/components/ui/progress-bar";

interface PortfolioOverviewProps {
  userId: number;
}

export default function PortfolioOverview({ userId }: PortfolioOverviewProps) {
  const { data: summary, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}/portfolio-summary`],
  });
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200 mb-6 animate-pulse">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="h-4 bg-neutral-200 rounded w-28 mb-2"></div>
            <div className="h-6 bg-neutral-200 rounded w-36"></div>
          </div>
          <div>
            <div className="h-4 bg-neutral-200 rounded w-28 mb-2"></div>
            <div className="h-6 bg-neutral-200 rounded w-36"></div>
          </div>
        </div>
        <div className="border-t border-neutral-200 pt-4">
          <div className="flex justify-between mb-1">
            <div className="h-4 bg-neutral-200 rounded w-24"></div>
            <div className="h-4 bg-neutral-200 rounded w-16"></div>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2 mb-3"></div>
          <div className="flex justify-between items-center">
            <div className="h-3 bg-neutral-200 rounded w-48"></div>
            <div className="h-3 bg-neutral-200 rounded w-14"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!summary) {
    return null;
  }
  
  // Calculate the performance percentage for the progress bar
  // Assuming 5% is excellent performance for the visual indicator
  const performancePercentage = Math.min(100, (summary.avgApy / 5) * 100);
  
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200 mb-6">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-neutral-500 text-sm">Total Invested</p>
          <p className="font-mono text-2xl font-bold">{formatCurrency(summary.totalInvested)}</p>
        </div>
        <div>
          <p className="text-neutral-500 text-sm">Interest Earned</p>
          <p className="font-mono text-2xl font-bold text-success">{formatCurrency(summary.interestEarned)}</p>
        </div>
      </div>
      <div className="border-t border-neutral-200 pt-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-neutral-500">Annual return</span>
          <span className="text-sm font-medium text-success">{formatPercentage(summary.avgApy)} Avg</span>
        </div>
        <ProgressBar 
          progress={performancePercentage} 
          color="success" 
          className="mb-3"
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-neutral-500">
            Projected annual earnings: 
            <span className="font-mono font-medium ml-1">
              {formatCurrency(summary.projectedAnnualEarnings)}
            </span>
          </p>
          <button className="text-xs text-primary font-medium">Details</button>
        </div>
      </div>
    </div>
  );
}

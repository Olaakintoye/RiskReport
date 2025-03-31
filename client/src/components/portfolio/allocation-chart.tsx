import { useQuery } from "@tanstack/react-query";
import DonutChart from "@/components/ui/donut-chart";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AllocationChartProps {
  userId: number;
}

interface ChartSegment {
  value: number;
  color: string;
  label: string;
  percentage: number;
}

export default function AllocationChart({ userId }: AllocationChartProps) {
  const { toast } = useToast();
  
  const { data: investments, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}/active-investments`],
  });
  
  const handleRebalance = () => {
    toast({
      title: "Coming Soon",
      description: "Portfolio rebalancing will be available in a future update.",
      variant: "default",
    });
  };
  
  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Investment Allocation</h2>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200 animate-pulse">
          <div className="flex mb-4">
            <div className="w-1/2 pr-2 flex justify-center">
              <div className="w-32 h-32 bg-neutral-200 rounded-full"></div>
            </div>
            <div className="w-1/2 pl-2 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-6 bg-neutral-200 rounded"></div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <div className="h-8 bg-neutral-200 rounded w-40"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!investments || investments.length === 0) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Investment Allocation</h2>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200 text-center">
          <p className="text-neutral-500 mb-4">You don't have any active investments yet.</p>
          <Button variant="default" size="sm" asChild>
            <a href="/marketplace">Browse Investments</a>
          </Button>
        </div>
      </div>
    );
  }
  
  // Group investments by term length
  const groupedInvestments: Record<string, number> = {};
  let totalAmount = 0;
  
  investments.forEach(inv => {
    const termMonths = inv.cdProduct?.termMonths;
    const amount = Number(inv.amount);
    totalAmount += amount;
    
    let termCategory: string;
    if (termMonths <= 6) {
      termCategory = "6-Month CDs";
    } else if (termMonths <= 12) {
      termCategory = "12-Month CDs";
    } else if (termMonths <= 18) {
      termCategory = "18-Month CDs";
    } else {
      termCategory = "24-Month CDs";
    }
    
    groupedInvestments[termCategory] = (groupedInvestments[termCategory] || 0) + amount;
  });
  
  // Prepare chart data
  const chartColors = {
    "6-Month CDs": "#00A67E", // secondary
    "12-Month CDs": "#0047AB", // primary
    "18-Month CDs": "#FFC107", // accent
    "24-Month CDs": "#9AA5B1", // neutral
  };
  
  const segments: ChartSegment[] = Object.entries(groupedInvestments).map(([label, value]) => ({
    label,
    value,
    color: chartColors[label as keyof typeof chartColors],
    percentage: (value / totalAmount) * 100,
  }));
  
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Investment Allocation</h2>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200">
        <div className="flex mb-3">
          <div className="w-1/2 pr-2">
            <DonutChart 
              segments={segments.map(s => ({ value: s.value, color: s.color }))}
              total={totalAmount}
              size={140}
              className="mx-auto"
            />
          </div>
          <div className="w-1/2 pl-2">
            <div className="mb-3">
              {segments.map((segment) => (
                <div key={segment.label} className="flex items-center mb-1">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: segment.color }}></div>
                  <span className="text-sm">{segment.label}</span>
                  <span className="ml-auto text-sm font-medium">{Math.round(segment.percentage)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="text-center">
          <Button 
            variant="link" 
            className="text-primary text-sm font-medium"
            onClick={handleRebalance}
          >
            Rebalance Portfolio
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage } from "@/lib/utils";

interface FeaturedCDProps {
  onInvest: (cdProductId: number) => void;
}

export default function FeaturedCD({ onInvest }: FeaturedCDProps) {
  const { data: featuredProduct, isLoading } = useQuery({
    queryKey: ['/api/cd-products/featured'],
  });
  
  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Featured CD</h2>
        <div className="bg-gradient-to-r from-primary to-primary-light rounded-xl p-5 text-white animate-pulse">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="h-6 bg-white/20 rounded w-40 mb-2"></div>
              <div className="h-4 bg-white/20 rounded w-32"></div>
            </div>
            <div className="h-6 bg-white/30 rounded-full w-24"></div>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="h-4 bg-white/20 rounded w-36 mb-2"></div>
              <div className="h-8 bg-white/20 rounded w-24 mb-2"></div>
              <div className="h-4 bg-white/20 rounded w-28"></div>
            </div>
            <div className="h-10 bg-white/30 rounded w-28"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!featuredProduct) {
    return null;
  }
  
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Featured CD</h2>
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-xl p-5 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1">{featuredProduct.bank?.name}</h3>
            <p className="text-white/80">{featuredProduct.name}</p>
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-full text-sm">Top Rated</div>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-white/80 text-sm">Annual Percentage Yield</p>
            <p className="text-3xl font-bold">{formatPercentage(featuredProduct.apy)}</p>
            <p className="text-sm text-white/80">Min Deposit: {formatCurrency(featuredProduct.minimumDeposit)}</p>
          </div>
          <Button
            variant="secondary" 
            className="bg-white text-primary hover:bg-white/90"
            onClick={() => onInvest(featuredProduct.id)}
          >
            Invest Now
          </Button>
        </div>
      </div>
    </div>
  );
}

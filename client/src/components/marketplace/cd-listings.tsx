import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatPercentage, termLengthToString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CDListingsProps {
  onViewDetails: (cdProductId: number) => void;
}

export default function CDListings({ onViewDetails }: CDListingsProps) {
  const [termFilter, setTermFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("highest-rate");
  const { toast } = useToast();
  
  const { data: cdProducts, isLoading } = useQuery({
    queryKey: ['/api/cd-products'],
  });
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-neutral-200 rounded-lg p-4 mb-3 shadow-sm animate-pulse">
            <div className="flex justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-neutral-200 rounded-lg mr-3"></div>
                <div>
                  <div className="h-4 bg-neutral-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-neutral-200 rounded w-16"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="h-6 bg-neutral-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-neutral-200 rounded w-8"></div>
              </div>
            </div>
            <div className="border-t border-neutral-200 pt-2 mt-2">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="h-10 bg-neutral-200 rounded"></div>
                <div className="h-10 bg-neutral-200 rounded"></div>
                <div className="h-10 bg-neutral-200 rounded"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-4 bg-neutral-200 rounded w-20"></div>
                <div className="h-8 bg-neutral-200 rounded w-28"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!cdProducts || cdProducts.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-6 text-center">
        <p className="text-neutral-500">No CD products available at this time.</p>
      </div>
    );
  }
  
  // Filter by term
  let filteredProducts = [...cdProducts];
  if (termFilter !== "all") {
    const [min, max] = termFilter.split("-").map(Number);
    filteredProducts = filteredProducts.filter(cd => {
      if (max) {
        return cd.termMonths >= min && cd.termMonths <= max;
      } else {
        return cd.termMonths >= min;
      }
    });
  }
  
  // Sort products
  if (sortBy === "highest-rate") {
    filteredProducts.sort((a, b) => Number(b.apy) - Number(a.apy));
  } else if (sortBy === "shortest-term") {
    filteredProducts.sort((a, b) => a.termMonths - b.termMonths);
  } else if (sortBy === "lowest-minimum") {
    filteredProducts.sort((a, b) => Number(a.minimumDeposit) - Number(b.minimumDeposit));
  }
  
  const getRatingStars = (rating: number) => {
    // Convert rating to nearest 0.5
    const roundedRating = Math.round(rating * 2) / 2;
    const fullStars = Math.floor(roundedRating);
    const halfStar = roundedRating % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
      <div className="flex items-center text-sm text-neutral-500">
        {[...Array(fullStars)].map((_, i) => (
          <i key={`full-${i}`} className="fas fa-star text-accent text-xs"></i>
        ))}
        {halfStar && <i className="fas fa-star-half-alt text-accent text-xs"></i>}
        {[...Array(emptyStars)].map((_, i) => (
          <i key={`empty-${i}`} className="fas fa-star text-neutral-300 text-xs"></i>
        ))}
        <span className="ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Available CDs</h2>
        <div className="flex items-center">
          <span className="text-sm text-neutral-500 mr-2">Sort by:</span>
          <select 
            className="text-sm bg-neutral-100 px-2 py-1 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-primary"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="highest-rate">Highest Rate</option>
            <option value="shortest-term">Shortest Term</option>
            <option value="lowest-minimum">Lowest Minimum</option>
          </select>
        </div>
      </div>
      
      {/* Filter Pills */}
      <div className="flex space-x-2 overflow-x-auto pb-4">
        <button 
          className={`whitespace-nowrap ${termFilter === 'all' ? 'bg-primary text-white' : 'bg-white border border-neutral-200'} px-4 py-2 rounded-full text-sm font-medium`}
          onClick={() => setTermFilter('all')}
        >
          All Terms
        </button>
        <button 
          className={`whitespace-nowrap ${termFilter === '3-6' ? 'bg-primary text-white' : 'bg-white border border-neutral-200'} px-4 py-2 rounded-full text-sm`}
          onClick={() => setTermFilter('3-6')}
        >
          3-6 Months
        </button>
        <button 
          className={`whitespace-nowrap ${termFilter === '6-12' ? 'bg-primary text-white' : 'bg-white border border-neutral-200'} px-4 py-2 rounded-full text-sm`}
          onClick={() => setTermFilter('6-12')}
        >
          6-12 Months
        </button>
        <button 
          className={`whitespace-nowrap ${termFilter === '12-18' ? 'bg-primary text-white' : 'bg-white border border-neutral-200'} px-4 py-2 rounded-full text-sm`}
          onClick={() => setTermFilter('12-18')}
        >
          12-18 Months
        </button>
        <button 
          className={`whitespace-nowrap ${termFilter === '18' ? 'bg-primary text-white' : 'bg-white border border-neutral-200'} px-4 py-2 rounded-full text-sm`}
          onClick={() => setTermFilter('18')}
        >
          18+ Months
        </button>
      </div>
      
      {/* CD Listings */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 text-center">
          <p className="text-neutral-500">No CDs match your filter criteria.</p>
          <button
            className="mt-2 text-primary font-medium"
            onClick={() => setTermFilter('all')}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        filteredProducts.map((product) => (
          <div key={product.id} className="bg-white border border-neutral-200 rounded-lg p-4 mb-3 shadow-sm">
            <div className="flex justify-between mb-1">
              <div className="flex items-center">
                <div className={`w-10 h-10 bg-neutral-100 rounded-lg mr-3 flex items-center justify-center`}>
                  <i className={`fas fa-landmark text-${product.bank?.color || 'primary'}`}></i>
                </div>
                <div>
                  <h3 className="font-medium">{product.bank?.name}</h3>
                  {getRatingStars(Number(product.bank?.rating) || 4)}
                </div>
              </div>
              <div className="text-right">
                <p className="text-success font-bold text-xl">{formatPercentage(product.apy)}</p>
                <p className="text-xs text-neutral-500">APY</p>
              </div>
            </div>
            <div className="border-t border-neutral-200 pt-2 mt-2">
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div>
                  <p className="text-neutral-500 text-xs">Term</p>
                  <p className="font-medium">{termLengthToString(product.termMonths)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Min. Deposit</p>
                  <p className="font-medium font-mono">{formatCurrency(product.minimumDeposit)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Early Withdrawal</p>
                  <p className={`font-medium ${product.earlyWithdrawalPenalty === 'Penalty' ? 'text-error' : 'text-warning'}`}>
                    {product.earlyWithdrawalPenalty}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">FDIC Insured</span>
                <Button
                  size="sm"
                  onClick={() => onViewDetails(product.id)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
      
      <Button 
        variant="outline" 
        className="w-full py-3"
        onClick={() => {
          toast({
            title: "Coming Soon",
            description: "More CD options will be available soon.",
          });
        }}
      >
        Load More Options
      </Button>
    </div>
  );
}

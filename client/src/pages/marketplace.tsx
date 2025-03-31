import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import FeaturedCD from "@/components/marketplace/featured-cd";
import CDListings from "@/components/marketplace/cd-listings";

export default function Marketplace() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showInvestDialog, setShowInvestDialog] = useState(false);
  const [selectedCdId, setSelectedCdId] = useState<number | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [isInvesting, setIsInvesting] = useState(false);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/current-user'],
  });

  // Get selected CD product details when selectedCdId changes
  const { data: selectedCd } = useQuery({
    queryKey: [`/api/cd-products/${selectedCdId}`],
    enabled: !!selectedCdId,
  });

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast({
      title: "Search Feature",
      description: "Search functionality will be available soon.",
    });
  };

  const handleViewDetails = (cdProductId: number) => {
    setSelectedCdId(cdProductId);
    setShowInvestDialog(true);
  };

  const handleInvestNow = (cdProductId: number) => {
    setSelectedCdId(cdProductId);
    setShowInvestDialog(true);
  };

  const handleInvestmentSubmit = async () => {
    if (!selectedCd || !currentUser) return;

    const amount = parseFloat(investmentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid investment amount.",
        variant: "destructive",
      });
      return;
    }

    if (amount < Number(selectedCd.minimumDeposit)) {
      toast({
        title: "Minimum Deposit Not Met",
        description: `The minimum deposit for this CD is ${formatCurrency(selectedCd.minimumDeposit)}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsInvesting(true);
      // Create investment
      await apiRequest('POST', `/api/users/${currentUser.id}/investments`, {
        cdProductId: selectedCd.id,
        amount
      });

      // Success
      toast({
        title: "Investment Created",
        description: `You've successfully invested ${formatCurrency(amount)} in the ${selectedCd.name}.`,
      });
      
      // Close dialog and navigate to portfolio
      setShowInvestDialog(false);
      setInvestmentAmount("");
      setSelectedCdId(null);
      
      // Invalidate active investments query
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser.id}/active-investments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser.id}/portfolio-summary`] });
      
      navigate('/portfolio');
    } catch (error: any) {
      toast({
        title: "Investment Failed",
        description: error.message || "Failed to create investment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInvesting(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-neutral-500 text-sm">Explore CD offerings</p>
        </div>
        <button className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center">
          <i className="fas fa-sliders text-neutral-600"></i>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="relative mb-4">
          <i className="fas fa-search absolute left-3 top-3 text-neutral-400"></i>
          <Input 
            type="text" 
            placeholder="Search banks or CD types" 
            className="w-full pl-10 pr-4 py-2.5 rounded-lg"
          />
        </form>
      </div>

      <FeaturedCD onInvest={handleInvestNow} />
      
      <CDListings onViewDetails={handleViewDetails} />

      {/* CD Investment Dialog */}
      <Dialog open={showInvestDialog} onOpenChange={setShowInvestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invest in CD</DialogTitle>
            <DialogDescription>
              {selectedCd ? (
                <div className="mt-2">
                  <p className="font-medium text-lg">{selectedCd.bank?.name} - {selectedCd.name}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-neutral-500">APY</p>
                      <p className="font-medium text-success">{formatPercentage(selectedCd.apy)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Term</p>
                      <p className="font-medium">{selectedCd.termMonths} Months</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Minimum</p>
                      <p className="font-medium">{formatCurrency(selectedCd.minimumDeposit)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">FDIC Insured</p>
                      <p className="font-medium">Yes</p>
                    </div>
                  </div>
                  {selectedCd.description && (
                    <p className="mt-2 text-sm text-neutral-600">{selectedCd.description}</p>
                  )}
                </div>
              ) : (
                <p>Loading CD details...</p>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <label htmlFor="amount" className="block text-sm font-medium mb-1">
              Investment Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
              <Input
                id="amount"
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                className="pl-8"
                placeholder="Enter amount"
                min={selectedCd?.minimumDeposit?.toString() || "0"}
              />
            </div>
            {selectedCd && (
              <p className="text-xs text-neutral-500 mt-1">
                Minimum deposit: {formatCurrency(selectedCd.minimumDeposit)}
              </p>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-neutral-50 rounded-lg text-sm">
            <p className="font-medium mb-1">Terms & Conditions</p>
            <p className="text-neutral-600 text-xs">
              By investing, you agree that your funds will be locked until maturity. 
              Early withdrawal may incur penalties. Interest is paid at maturity.
              This CD is FDIC insured up to $250,000.
            </p>
          </div>
          
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowInvestDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvestmentSubmit}
              disabled={isInvesting || !investmentAmount}
            >
              {isInvesting ? 'Processing...' : 'Confirm Investment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

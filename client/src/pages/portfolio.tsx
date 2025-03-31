import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatPercentage } from "@/lib/utils";

import PortfolioOverview from "@/components/portfolio/portfolio-overview";
import AllocationChart from "@/components/portfolio/allocation-chart";
import CDCard from "@/components/ui/cd-card";

export default function Portfolio() {
  const [selectedInvestment, setSelectedInvestment] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { toast } = useToast();
  
  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/current-user'],
  });
  
  const userId = currentUser?.id || 1; // Default to ID 1 for demo
  
  // Get user's active investments
  const { data: investments, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}/active-investments`],
    enabled: !!userId,
  });
  
  const handleViewDetails = (investment: any) => {
    setSelectedInvestment(investment);
    setShowDetailsDialog(true);
  };
  
  const handleViewStatements = () => {
    toast({
      title: "Statements",
      description: "Statements feature will be available in a future update.",
    });
  };
  
  const handleRedeem = () => {
    toast({
      title: "Redeem CD",
      description: "CD redemption feature will be available in a future update.",
    });
  };
  
  return (
    <div className="px-4 pt-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-neutral-500 text-sm">Manage your investments</p>
        </div>
        <button className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center">
          <i className="fas fa-ellipsis-vertical text-neutral-600"></i>
        </button>
      </div>
      
      <PortfolioOverview userId={userId} />
      
      <AllocationChart userId={userId} />
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Active Investments</h2>
          <button 
            className="text-primary text-sm font-medium"
            onClick={() => {
              toast({
                title: "Filter",
                description: "Filtering feature will be available in a future update.",
              });
            }}
          >
            Filter
          </button>
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-neutral-200 rounded-lg p-4 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-neutral-200 rounded-lg mr-3"></div>
                    <div>
                      <div className="h-4 bg-neutral-200 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-neutral-200 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-neutral-200 rounded w-20 mb-2"></div>
                    <div className="h-3 bg-neutral-200 rounded w-12"></div>
                  </div>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2 mb-3"></div>
                <div className="flex justify-between">
                  <div className="h-3 bg-neutral-200 rounded w-20"></div>
                  <div className="h-3 bg-neutral-200 rounded w-20"></div>
                </div>
                <div className="grid grid-cols-3 text-center border-t border-neutral-200 mt-3 pt-3">
                  <div className="h-4 bg-neutral-200 rounded mx-auto w-12"></div>
                  <div className="h-4 bg-neutral-200 rounded mx-auto w-12"></div>
                  <div className="h-4 bg-neutral-200 rounded mx-auto w-12"></div>
                </div>
              </div>
            ))}
          </div>
        ) : investments && investments.length > 0 ? (
          <div>
            {investments.map((investment: any) => (
              <CDCard 
                key={investment.id} 
                investment={investment}
                showActions={true}
                onViewDetails={() => handleViewDetails(investment)}
                onViewStatements={handleViewStatements}
                onRedeem={handleRedeem}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-lg p-6 text-center">
            <p className="text-neutral-500 mb-4">You don't have any active investments yet.</p>
            <Button asChild>
              <a href="/marketplace">Browse CD Options</a>
            </Button>
          </div>
        )}
      </div>
      
      {/* Investment Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Investment Details</DialogTitle>
          </DialogHeader>
          
          {selectedInvestment && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center">
                <div className={`w-12 h-12 bg-neutral-100 rounded-lg mr-4 flex items-center justify-center text-${selectedInvestment.bank?.color || 'primary'}`}>
                  <i className="fas fa-landmark text-xl"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedInvestment.bank?.name}</h3>
                  <p className="text-neutral-500">{selectedInvestment.cdProduct?.name}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-b border-neutral-200 py-4">
                <div>
                  <p className="text-neutral-500 text-sm">Principal Amount</p>
                  <p className="font-mono font-semibold text-lg">{formatCurrency(selectedInvestment.amount)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-sm">Interest Rate</p>
                  <p className="font-semibold text-lg text-success">{formatPercentage(selectedInvestment.cdProduct?.apy)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-sm">Start Date</p>
                  <p className="font-medium">{formatDate(selectedInvestment.startDate)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-sm">Maturity Date</p>
                  <p className="font-medium">{formatDate(selectedInvestment.maturityDate)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-sm">Interest Earned</p>
                  <p className="font-mono font-medium text-success">{formatCurrency(selectedInvestment.interestEarned)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-sm">Status</p>
                  <p className="font-medium capitalize">{selectedInvestment.status}</p>
                </div>
              </div>
              
              <div>
                <p className="text-neutral-500 text-sm mb-1">Maturity Options</p>
                <p className="text-sm text-neutral-600">
                  At maturity, you can choose to withdraw funds, renew at the current rate, or roll over into a new CD. 
                  Set your preference up to 30 days before maturity date.
                </p>
              </div>
              
              <div className="flex gap-2 justify-between border-t pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleRedeem}
                >
                  Redeem Early
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

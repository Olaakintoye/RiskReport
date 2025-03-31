import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import PortfolioSummary from "@/components/dashboard/portfolio-summary";
import QuickActions from "@/components/dashboard/quick-actions";
import ActiveInvestments from "@/components/dashboard/active-investments";
import TopCDRates from "@/components/dashboard/top-cd-rates";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showMaturityAlert, setShowMaturityAlert] = useState(true);
  
  // Get current user
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['/api/current-user'],
  });
  
  // Get notifications
  const { data: notifications, isLoading: isLoadingNotifications } = useQuery({
    queryKey: [`/api/users/1/unread-notifications`],
    enabled: !!currentUser,
  });
  
  const handleQuickAction = (action: string) => {
    if (action === 'deposit') {
      navigate('/marketplace');
    } else {
      toast({
        title: `${action} Action`,
        description: `The ${action} feature will be available soon.`,
      });
    }
  };
  
  const handleSetPreference = () => {
    toast({
      title: "Preference Saved",
      description: "Your CD will be automatically renewed at maturity.",
    });
    setShowMaturityAlert(false);
  };
  
  const handleRemindLater = () => {
    toast({
      title: "Reminder Set",
      description: "We'll remind you again in 7 days.",
    });
    setShowMaturityAlert(false);
  };
  
  if (isLoadingUser) {
    return (
      <div className="px-4 pt-4 pb-20 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-7 bg-neutral-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-neutral-200 rounded w-48"></div>
          </div>
          <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
        </div>
        
        <div className="h-36 bg-primary/30 rounded-xl mb-6"></div>
        
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-neutral-200 rounded-lg"></div>
          ))}
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <div className="h-6 bg-neutral-200 rounded w-40"></div>
            <div className="h-4 bg-neutral-200 rounded w-16"></div>
          </div>
          
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-28 bg-neutral-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  const userId = currentUser?.id || 1; // Default to ID 1 for demo
  
  return (
    <div className="px-4 pt-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-neutral-500 text-sm">Welcome back, {currentUser?.fullName?.split(' ')[0] || 'Alex'}</p>
        </div>
        <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center cursor-pointer" onClick={() => navigate('/account')}>
          <i className="fas fa-user text-neutral-600"></i>
        </div>
      </div>

      <PortfolioSummary userId={userId} />
      
      <QuickActions 
        onDeposit={() => handleQuickAction('deposit')}
        onWithdraw={() => handleQuickAction('withdraw')}
        onRedeem={() => handleQuickAction('redeem')}
      />
      
      <ActiveInvestments userId={userId} limit={2} />
      
      <TopCDRates />
      
      {/* Upcoming Maturity Alert */}
      {showMaturityAlert && notifications?.some(n => n.type === 'maturity') && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Upcoming Maturities</h2>
          </div>
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-3">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center mr-3">
                <i className="fas fa-bell text-accent"></i>
              </div>
              <div>
                <h3 className="font-medium">Coastal Credit Union CD matures in 15 days</h3>
                <p className="text-sm text-neutral-600 mb-2">Your 6-month CD of $15,000 will mature on Feb 15, 2024</p>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    className="text-xs bg-accent text-white hover:bg-accent/90"
                    onClick={handleSetPreference}
                  >
                    Set Preference
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleRemindLater}
                  >
                    Remind Me
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

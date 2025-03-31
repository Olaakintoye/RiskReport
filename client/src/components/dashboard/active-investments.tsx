import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import CDCard from "@/components/ui/cd-card";

interface ActiveInvestmentsProps {
  userId: number;
  limit?: number;
}

export default function ActiveInvestments({ userId, limit }: ActiveInvestmentsProps) {
  const { data: investments, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}/active-investments`],
  });

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Active Investments</h2>
          <Link href="/portfolio">
            <a className="text-primary text-sm font-medium">See All</a>
          </Link>
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
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
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayInvestments = limit ? investments?.slice(0, limit) : investments;

  if (!displayInvestments || displayInvestments.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Active Investments</h2>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-6 text-center">
          <p className="text-neutral-500">You have no active investments.</p>
          <Link href="/marketplace">
            <a className="mt-2 inline-block text-primary font-medium">
              Browse the Marketplace
            </a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Active Investments</h2>
        {investments?.length > (limit || 0) && (
          <Link href="/portfolio">
            <a className="text-primary text-sm font-medium">See All</a>
          </Link>
        )}
      </div>

      {displayInvestments.map((investment) => (
        <CDCard 
          key={investment.id} 
          investment={investment} 
        />
      ))}
    </div>
  );
}

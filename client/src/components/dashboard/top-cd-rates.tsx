import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export default function TopCDRates() {
  const { data: topCDs, isLoading } = useQuery({
    queryKey: ['/api/cd-products/top'],
  });

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Top CD Rates Today</h2>
          <Link href="/marketplace">
            <a className="text-primary text-sm font-medium">Marketplace</a>
          </Link>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden animate-pulse">
          <div className="bg-neutral-100 p-3">
            <div className="grid grid-cols-4 gap-4">
              <div className="h-4 bg-neutral-200 rounded"></div>
              <div className="h-4 bg-neutral-200 rounded"></div>
              <div className="h-4 bg-neutral-200 rounded"></div>
              <div className="h-4 bg-neutral-200 rounded"></div>
            </div>
          </div>
          <div className="p-3 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4">
                <div className="h-4 bg-neutral-200 rounded"></div>
                <div className="h-4 bg-neutral-200 rounded"></div>
                <div className="h-4 bg-neutral-200 rounded"></div>
                <div className="h-4 bg-neutral-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!topCDs || topCDs.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Top CD Rates Today</h2>
        <Link href="/marketplace">
          <a className="text-primary text-sm font-medium">Marketplace</a>
        </Link>
      </div>
      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="py-3 px-4 text-left font-medium">Bank</th>
              <th className="py-3 px-2 text-center font-medium">Term</th>
              <th className="py-3 px-2 text-right font-medium">APY</th>
              <th className="py-3 px-4 text-right font-medium">Min. Deposit</th>
            </tr>
          </thead>
          <tbody>
            {topCDs.map((cd, index) => (
              <tr key={cd.id} className={index < topCDs.length - 1 ? "border-b border-neutral-200" : ""}>
                <td className="py-3 px-4 font-medium">{cd.bank.name}</td>
                <td className="py-3 px-2 text-center">{cd.termMonths} Mo</td>
                <td className="py-3 px-2 text-right text-success font-medium">{formatPercentage(cd.apy)}</td>
                <td className="py-3 px-4 text-right font-mono">{formatCurrency(cd.minimumDeposit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

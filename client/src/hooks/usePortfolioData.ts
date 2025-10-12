import { useQuery } from '@tanstack/react-query';
import portfolioService, { Portfolio } from '../services/portfolioService';

/**
 * Hook to fetch all portfolios
 */
export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const portfolios = await portfolioService.getPortfolios();
      return portfolios;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Hook to fetch portfolio summaries (lightweight data)
 */
export function usePortfolioSummaries() {
  return useQuery({
    queryKey: ['portfolio-summaries'],
    queryFn: async () => {
      const summaries = await portfolioService.getPortfolioSummaries();
      return summaries;
    },
    staleTime: 30000,
  });
}

/**
 * Hook to fetch portfolios with current prices
 */
export function usePortfoliosWithPrices() {
  return useQuery({
    queryKey: ['portfolios-with-prices'],
    queryFn: async () => {
      const portfolios = await portfolioService.getPortfoliosWithPrices();
      return portfolios;
    },
    staleTime: 60000, // 1 minute - since we're fetching live prices
  });
}

/**
 * Hook to fetch a single portfolio by ID
 */
export function usePortfolio(portfolioId: string | null) {
  return useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return null;
      return await portfolioService.getPortfolioById(portfolioId);
    },
    enabled: !!portfolioId,
    staleTime: 30000,
  });
}

/**
 * Hook to fetch a portfolio with updated prices
 */
export function usePortfolioWithPrices(portfolioId: string | null) {
  return useQuery({
    queryKey: ['portfolio-with-prices', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return null;
      const portfolio = await portfolioService.getPortfolioById(portfolioId);
      if (!portfolio) return null;
      return await portfolioService.refreshPortfolioPrices(portfolio);
    },
    enabled: !!portfolioId,
    staleTime: 60000,
  });
}


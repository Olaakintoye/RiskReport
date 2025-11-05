import { useQuery, keepPreviousData } from '@tanstack/react-query';
import portfolioService, { Portfolio } from '../services/portfolioService';

/**
 * Hook to fetch all portfolios
 * Optimized with placeholderData to show cached data while refetching
 */
export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const portfolios = await portfolioService.getPortfolios();
      return portfolios;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - increased from 30s for better caching
    placeholderData: keepPreviousData, // Show old data while loading new data
  });
}

/**
 * Hook to fetch portfolio summaries (lightweight data)
 * Optimized with placeholderData for smoother UX
 */
export function usePortfolioSummaries() {
  return useQuery({
    queryKey: ['portfolio-summaries'],
    queryFn: async () => {
      const summaries = await portfolioService.getPortfolioSummaries();
      return summaries;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch portfolios with current prices
 * Uses longer stale time due to market data API rate limits
 */
export function usePortfoliosWithPrices() {
  return useQuery({
    queryKey: ['portfolios-with-prices'],
    queryFn: async () => {
      const portfolios = await portfolioService.getPortfoliosWithPrices();
      return portfolios;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes - increased for rate limiting
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch a single portfolio by ID
 * Optimized with placeholderData for smooth transitions
 */
export function usePortfolio(portfolioId: string | null) {
  return useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return null;
      return await portfolioService.getPortfolioById(portfolioId);
    },
    enabled: !!portfolioId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch a portfolio with updated prices
 * Uses longer stale time to reduce API calls
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
    staleTime: 3 * 60 * 1000, // 3 minutes
    placeholderData: keepPreviousData,
  });
}


import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getScenarios, getScenarioById, getScenarioRuns } from '../services/scenarioService';

/**
 * Hook to fetch all scenarios
 * Optimized with longer stale time and placeholderData
 */
export function useScenarios() {
  return useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      try {
        const scenarios = await getScenarios();
        return scenarios || [];
      } catch (error) {
        console.warn('Failed to fetch scenarios:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - scenarios change infrequently
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch scenario runs
 * Optimized with longer stale time and caching
 */
export function useScenarioRuns() {
  return useQuery({
    queryKey: ['scenario-runs'],
    queryFn: async () => {
      try {
        const runs = await getScenarioRuns();
        return runs || [];
      } catch (error) {
        console.warn('Failed to fetch scenario runs:', error);
        return [];
      }
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch a single scenario by ID
 * Optimized with placeholderData for smooth navigation
 */
export function useScenario(scenarioId: string | null) {
  return useQuery({
    queryKey: ['scenario', scenarioId],
    queryFn: async () => {
      if (!scenarioId) return null;
      try {
        const scenario = await getScenarioById(scenarioId);
        return scenario || null;
      } catch (error) {
        console.warn(`Failed to fetch scenario ${scenarioId}:`, error);
        return null;
      }
    },
    enabled: !!scenarioId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch scenario runs for a specific portfolio
 * Optimized with better caching and placeholderData
 */
export function usePortfolioScenarioRuns(portfolioId: string | null) {
  return useQuery({
    queryKey: ['portfolio-scenario-runs', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return [];
      try {
        const runs = await getScenarioRuns();
        // Filter runs for this portfolio if available
        return (runs || []).filter((run: any) => run.portfolioId === portfolioId);
      } catch (error) {
        console.warn(`Failed to fetch scenario runs for portfolio ${portfolioId}:`, error);
        return [];
      }
    },
    enabled: !!portfolioId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    placeholderData: keepPreviousData,
  });
}


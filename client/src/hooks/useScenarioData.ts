import { useQuery } from '@tanstack/react-query';
import { getScenarios, getScenarioById, getScenarioRuns } from '../services/scenarioService';

/**
 * Hook to fetch all scenarios
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
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch scenario runs
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
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch a single scenario by ID
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
    staleTime: 60000,
  });
}

/**
 * Hook to fetch scenario runs for a specific portfolio
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
    staleTime: 60000,
  });
}


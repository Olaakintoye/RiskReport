/**
 * Real-time Risk Data Hook
 * Provides real-time updates for risk calculations and portfolio changes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseService, CalcJob, Result } from '../services/supabaseClient';
import { riskEngineClient } from '../services/riskEngineClient';

export interface RiskMetrics {
  var95?: number;
  var99?: number;
  expectedShortfall?: number;
  portfolioValue: number;
  lastUpdated: string;
  isCalculating: boolean;
  calculationProgress: number;
}

export interface UseRealTimeRiskOptions {
  portfolioId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useRealTimeRisk({ 
  portfolioId, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: UseRealTimeRiskOptions) {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    portfolioValue: 0,
    lastUpdated: new Date().toISOString(),
    isCalculating: false,
    calculationProgress: 0,
  });
  
  const [activeJobs, setActiveJobs] = useState<CalcJob[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const subscriptionsRef = useRef<(() => void)[]>([]);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get portfolio with positions
      const portfolio = await supabaseService.getPortfolio(portfolioId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Calculate current portfolio value
      const portfolioValue = portfolio.positions?.reduce(
        (sum, position) => sum + (position.market_value || 0), 
        0
      ) || 0;

      // Get recent results
      const results = await supabaseService.getResults(portfolioId, 5);
      setRecentResults(results);

      // Get active calculation jobs
      const jobs = await supabaseService.getCalcJobs(portfolioId, 10);
      const activeJobsList = jobs.filter(job => 
        job.status === 'queued' || job.status === 'running'
      );
      setActiveJobs(activeJobsList);

      // Extract latest risk metrics from results
      const latestVar95 = results.find(r => r.calc_type === 'var_95')?.var_amount;
      const latestVar99 = results.find(r => r.calc_type === 'var_99')?.var_amount;
      const latestES = results.find(r => r.calc_type.startsWith('es_'))?.es_amount;

      setRiskMetrics({
        var95: latestVar95 ? Math.abs(latestVar95) : undefined,
        var99: latestVar99 ? Math.abs(latestVar99) : undefined,
        expectedShortfall: latestES ? Math.abs(latestES) : undefined,
        portfolioValue,
        lastUpdated: results[0]?.created_at || new Date().toISOString(),
        isCalculating: activeJobsList.length > 0,
        calculationProgress: activeJobsList.length > 0 
          ? Math.max(...activeJobsList.map(job => job.progress))
          : 0,
      });

    } catch (err) {
      console.error('Error loading initial risk data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load risk data');
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId]);

  // Handle real-time calculation job updates
  const handleJobUpdate = useCallback((payload: any) => {
    const updatedJob: CalcJob = payload.new || payload.old;
    
    setActiveJobs(prev => {
      const filtered = prev.filter(job => job.id !== updatedJob.id);
      
      if (updatedJob.status === 'queued' || updatedJob.status === 'running') {
        return [...filtered, updatedJob];
      }
      
      return filtered;
    });

    // Update calculation progress
    setRiskMetrics(prev => ({
      ...prev,
      isCalculating: updatedJob.status === 'running',
      calculationProgress: updatedJob.progress || 0,
    }));

    // If job completed, refresh results
    if (updatedJob.status === 'completed') {
      loadInitialData();
    }
  }, [loadInitialData]);

  // Handle real-time results updates
  const handleResultUpdate = useCallback((payload: any) => {
    const newResult: Result = payload.new;
    
    setRecentResults(prev => [newResult, ...prev.slice(0, 4)]);

    // Update risk metrics if this is a relevant result
    setRiskMetrics(prev => {
      const updates: Partial<RiskMetrics> = {
        lastUpdated: newResult.created_at,
      };

      if (newResult.calc_type === 'var_95' && newResult.var_amount) {
        updates.var95 = Math.abs(newResult.var_amount);
      } else if (newResult.calc_type === 'var_99' && newResult.var_amount) {
        updates.var99 = Math.abs(newResult.var_amount);
      } else if (newResult.calc_type.startsWith('es_') && newResult.es_amount) {
        updates.expectedShortfall = Math.abs(newResult.es_amount);
      }

      return { ...prev, ...updates };
    });
  }, []);

  // Handle portfolio/position updates
  const handlePortfolioUpdate = useCallback(() => {
    // Refresh portfolio value when positions change
    loadInitialData();
  }, [loadInitialData]);

  // Calculate new VaR
  const calculateVaR = useCallback(async (
    confidence: number = 0.95,
    method: 'parametric' | 'historical' | 'monte_carlo_normal' | 'monte_carlo_t' = 'monte_carlo_t'
  ) => {
    try {
      setError(null);
      
      const calcType = confidence === 0.95 ? 'var_95' : 'var_99';
      
      const response = await riskEngineClient.runVaRCalculation({
        portfolio_id: portfolioId,
        calc_type: calcType,
        confidence,
        horizon_days: 1,
        n_sim: 50000,
        method,
        distribution: method.includes('normal') ? 'normal' : 't',
        lookback_days: 1260,
      });

      if (!response.success) {
        throw new Error(response.error || 'Calculation failed');
      }

      return response.job_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start calculation';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [portfolioId]);

  // Calculate Expected Shortfall
  const calculateExpectedShortfall = useCallback(async (confidence: number = 0.95) => {
    try {
      setError(null);
      
      const response = await riskEngineClient.calculateExpectedShortfall(portfolioId, confidence);
      
      if (!response.success) {
        throw new Error(response.error || 'Calculation failed');
      }

      return response.job_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start calculation';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [portfolioId]);

  // Run stress test
  const runStressTest = useCallback(async (scenarioId: string) => {
    try {
      setError(null);
      
      const response = await riskEngineClient.runStressTest({
        portfolio_id: portfolioId,
        scenario_id: scenarioId,
      });

      if (!response.success) {
        throw new Error(response.error || 'Stress test failed');
      }

      return response.job_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start stress test';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [portfolioId]);

  // Refresh data manually
  const refresh = useCallback(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Setup subscriptions and intervals
  useEffect(() => {
    // Load initial data
    loadInitialData();

    // Setup real-time subscriptions
    const jobSubscription = supabaseService.subscribeToCalcJobs(portfolioId, handleJobUpdate);
    const resultSubscription = supabaseService.subscribeToResults(portfolioId, handleResultUpdate);
    const portfolioSubscription = supabaseService.subscribeToPortfolios(handlePortfolioUpdate);

    subscriptionsRef.current = [jobSubscription, resultSubscription, portfolioSubscription];

    // Setup auto-refresh interval
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(loadInitialData, refreshInterval);
    }

    // Cleanup function
    return () => {
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
      subscriptionsRef.current = [];
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [portfolioId, autoRefresh, refreshInterval, loadInitialData, handleJobUpdate, handleResultUpdate, handlePortfolioUpdate]);

  return {
    // Data
    riskMetrics,
    activeJobs,
    recentResults,
    
    // State
    isLoading,
    error,
    
    // Actions
    calculateVaR,
    calculateExpectedShortfall,
    runStressTest,
    refresh,
    
    // Utilities
    clearError: () => setError(null),
  };
}




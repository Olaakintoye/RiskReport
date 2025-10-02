/**
 * Risk Engine Client
 * Handles communication with the Python FastAPI risk engine
 */

import { supabaseService } from './supabaseClient';

const RISK_ENGINE_URL = process.env.EXPO_PUBLIC_RISK_ENGINE_URL || 'http://localhost:8000';

export interface VaRRequest {
  portfolio_id: string;
  calc_type: 'var_95' | 'var_99' | 'var_975' | 'es_95' | 'es_99' | 'monte_carlo' | 'parametric' | 'historical';
  confidence: number;
  horizon_days: number;
  n_sim: number;
  method: 'parametric' | 'historical' | 'monte_carlo_normal' | 'monte_carlo_t';
  distribution: 'normal' | 't' | 'empirical';
  lookback_days: number;
  params?: Record<string, any>;
}

export interface StressTestRequest {
  portfolio_id: string;
  scenario_id: string;
  params?: Record<string, any>;
}

export interface CalcResponse {
  success: boolean;
  job_id?: string;
  result?: Record<string, any>;
  error?: string;
}

class RiskEngineClient {
  private baseUrl: string;

  constructor(baseUrl: string = RISK_ENGINE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabaseService.getSession();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // =============================================
  // HEALTH CHECK
  // =============================================

  async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    return this.makeRequest('/health');
  }

  // =============================================
  // VaR CALCULATIONS
  // =============================================

  async runVaRCalculation(request: VaRRequest): Promise<CalcResponse> {
    const { data: { user } } = await supabaseService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    return this.makeRequest('/calc/run', {
      method: 'POST',
      body: JSON.stringify({
        ...request,
        user_id: user.id,
      }),
    });
  }

  async runStressTest(request: StressTestRequest): Promise<CalcResponse> {
    const { data: { user } } = await supabaseService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    return this.makeRequest('/calc/stress-test', {
      method: 'POST',
      body: JSON.stringify({
        ...request,
        user_id: user.id,
      }),
    });
  }

  // =============================================
  // JOB STATUS
  // =============================================

  async getJobStatus(jobId: string): Promise<any> {
    return this.makeRequest(`/jobs/${jobId}`);
  }

  // =============================================
  // PORTFOLIO DATA
  // =============================================

  async getPortfolio(portfolioId: string): Promise<any> {
    return this.makeRequest(`/portfolios/${portfolioId}`);
  }

  async getPortfolioResults(portfolioId: string, limit: number = 10): Promise<any[]> {
    return this.makeRequest(`/portfolios/${portfolioId}/results?limit=${limit}`);
  }

  // =============================================
  // CONVENIENCE METHODS
  // =============================================

  async calculateVaR95(
    portfolioId: string,
    options: Partial<VaRRequest> = {}
  ): Promise<CalcResponse> {
    return this.runVaRCalculation({
      portfolio_id: portfolioId,
      calc_type: 'var_95',
      confidence: 0.95,
      horizon_days: 1,
      n_sim: 50000,
      method: 'monte_carlo_t',
      distribution: 't',
      lookback_days: 1260,
      ...options,
    });
  }

  async calculateVaR99(
    portfolioId: string,
    options: Partial<VaRRequest> = {}
  ): Promise<CalcResponse> {
    return this.runVaRCalculation({
      portfolio_id: portfolioId,
      calc_type: 'var_99',
      confidence: 0.99,
      horizon_days: 1,
      n_sim: 50000,
      method: 'monte_carlo_t',
      distribution: 't',
      lookback_days: 1260,
      ...options,
    });
  }

  async calculateExpectedShortfall(
    portfolioId: string,
    confidence: number = 0.95,
    options: Partial<VaRRequest> = {}
  ): Promise<CalcResponse> {
    return this.runVaRCalculation({
      portfolio_id: portfolioId,
      calc_type: confidence === 0.95 ? 'es_95' : 'es_99',
      confidence,
      horizon_days: 1,
      n_sim: 50000,
      method: 'monte_carlo_t',
      distribution: 't',
      lookback_days: 1260,
      ...options,
    });
  }

  async runHistoricalVaR(
    portfolioId: string,
    confidence: number = 0.95,
    options: Partial<VaRRequest> = {}
  ): Promise<CalcResponse> {
    return this.runVaRCalculation({
      portfolio_id: portfolioId,
      calc_type: 'historical',
      confidence,
      horizon_days: 1,
      n_sim: 0, // Not used for historical
      method: 'historical',
      distribution: 'empirical',
      lookback_days: 1260,
      ...options,
    });
  }

  async runParametricVaR(
    portfolioId: string,
    confidence: number = 0.95,
    distribution: 'normal' | 't' = 'normal',
    options: Partial<VaRRequest> = {}
  ): Promise<CalcResponse> {
    return this.runVaRCalculation({
      portfolio_id: portfolioId,
      calc_type: 'parametric',
      confidence,
      horizon_days: 1,
      n_sim: 0, // Not used for parametric
      method: 'parametric',
      distribution,
      lookback_days: 1260,
      ...options,
    });
  }

  async runMonteCarloVaR(
    portfolioId: string,
    confidence: number = 0.95,
    simulations: number = 50000,
    distribution: 'normal' | 't' = 't',
    options: Partial<VaRRequest> = {}
  ): Promise<CalcResponse> {
    return this.runVaRCalculation({
      portfolio_id: portfolioId,
      calc_type: 'monte_carlo',
      confidence,
      horizon_days: 1,
      n_sim: simulations,
      method: distribution === 'normal' ? 'monte_carlo_normal' : 'monte_carlo_t',
      distribution,
      lookback_days: 1260,
      ...options,
    });
  }

  // =============================================
  // STRESS TESTING
  // =============================================

  async runGFCStressTest(portfolioId: string): Promise<CalcResponse> {
    return this.runStressTest({
      portfolio_id: portfolioId,
      scenario_id: 'gfc-2008',
    });
  }

  async runCovidStressTest(portfolioId: string): Promise<CalcResponse> {
    return this.runStressTest({
      portfolio_id: portfolioId,
      scenario_id: 'covid-2020',
    });
  }

  async runCustomStressTest(
    portfolioId: string, 
    scenarioId: string,
    params?: Record<string, any>
  ): Promise<CalcResponse> {
    return this.runStressTest({
      portfolio_id: portfolioId,
      scenario_id: scenarioId,
      params,
    });
  }

  // =============================================
  // BATCH CALCULATIONS
  // =============================================

  async runFullRiskSuite(portfolioId: string): Promise<{
    var95: CalcResponse;
    var99: CalcResponse;
    es95: CalcResponse;
    historical: CalcResponse;
    gfcStress: CalcResponse;
  }> {
    const [var95, var99, es95, historical, gfcStress] = await Promise.all([
      this.calculateVaR95(portfolioId),
      this.calculateVaR99(portfolioId),
      this.calculateExpectedShortfall(portfolioId, 0.95),
      this.runHistoricalVaR(portfolioId),
      this.runGFCStressTest(portfolioId),
    ]);

    return {
      var95,
      var99,
      es95,
      historical,
      gfcStress,
    };
  }

  // =============================================
  // POLLING UTILITIES
  // =============================================

  async pollJobUntilComplete(
    jobId: string,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<any> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const job = await this.getJobStatus(jobId);
      
      if (job.status === 'completed') {
        return job;
      } else if (job.status === 'failed') {
        throw new Error(job.error_message || 'Calculation failed');
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error('Job polling timed out');
  }

  async runCalculationAndWait(request: VaRRequest): Promise<any> {
    const response = await this.runVaRCalculation(request);
    
    if (!response.success || !response.job_id) {
      throw new Error(response.error || 'Failed to start calculation');
    }
    
    return this.pollJobUntilComplete(response.job_id);
  }
}

// Export singleton instance
export const riskEngineClient = new RiskEngineClient();
export default riskEngineClient;




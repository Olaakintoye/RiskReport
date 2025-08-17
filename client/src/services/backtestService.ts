import API_BASE from '../config/api';
import { Portfolio } from './portfolioService';

export type Rebalancing = 'none' | 'monthly' | 'quarterly' | 'yearly';

export interface BacktestParams {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  rebalancing?: Rebalancing;
  benchmarkSymbols?: string[];
  riskFreeRate?: number; // annual
}

export interface EquityPoint { date: string; value: number }

export interface BacktestMetrics {
  cagr: number;
  volatility: number;
  sharpe: number;
  sortino: number | null;
  maxDrawdown: number; // percentage
  calmar: number | null;
}

export interface BacktestResult {
  equityCurve: EquityPoint[];
  drawdown: EquityPoint[];
  annualReturns: Record<string, number>;
  metrics: BacktestMetrics;
  benchmarks: Array<{ symbol: string; equityCurve: EquityPoint[]; relativeCagr: number }>;
  startDate: string;
  endDate: string;
  rebalancing: Rebalancing;
  symbols: string[];
}

const API_URL = API_BASE;

export async function runBacktest(portfolio: Portfolio, params: BacktestParams): Promise<BacktestResult> {
  const response = await fetch(`${API_URL}/api/backtest-portfolio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      portfolio,
      startDate: params.startDate,
      endDate: params.endDate,
      rebalancing: params.rebalancing || 'none',
      benchmarkSymbols: params.benchmarkSymbols || [],
      riskFreeRate: params.riskFreeRate ?? 0.02,
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Backtest failed: ${text}`);
  }

  const data = await response.json();
  if (!data.success || !data.results) {
    throw new Error('Backtest returned invalid response');
  }
  return data.results as BacktestResult;
}

export default { runBacktest };



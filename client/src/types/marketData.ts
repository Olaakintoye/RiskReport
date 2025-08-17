export interface MarketIndicator {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  volume?: number;
  timestamp?: number;
}


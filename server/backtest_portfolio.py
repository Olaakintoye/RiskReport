#!/usr/bin/env python3
"""
Portfolio Backtesting Script

Inputs (via --input JSON file):
{
  "portfolio": {
    "name": str,
    "assets": [{ "symbol": str, "quantity": float, "price": float }]
  },
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "rebalancing": "none" | "monthly" | "quarterly" | "yearly",
  "benchmarkSymbols": [str],
  "riskFreeRate": number (annual, optional)
}

Outputs (to --output JSON file):
{
  "equityCurve": [{"date": str, "value": float}],
  "drawdown": [{"date": str, "value": float}],
  "annualReturns": {year: pct},
  "metrics": {
    "cagr": pct,
    "volatility": pct,
    "sharpe": number,
    "sortino": number,
    "maxDrawdown": pct,
    "calmar": number
  },
  "benchmarks": {
    "symbol": str,
    "equityCurve": [{"date": str, "value": float}],
    "relativeCagr": pct
  }[]
}
"""

import argparse
import json
from datetime import datetime
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import yfinance as yf


def parse_args():
    parser = argparse.ArgumentParser(description="Run a portfolio backtest")
    parser.add_argument("--input", required=True, type=str)
    parser.add_argument("--output", required=True, type=str)
    return parser.parse_args()


def _end_of_period_flags(index: pd.DatetimeIndex, frequency: str) -> pd.Series:
    if frequency == "monthly":
        return pd.Series(index.is_month_end, index=index)
    if frequency == "quarterly":
        # quarter end is month end and month in {3, 6, 9, 12}
        return pd.Series(index.is_quarter_end, index=index)
    if frequency == "yearly":
        return pd.Series(index.is_year_end, index=index)
    return pd.Series(False, index=index)


def _compute_weights(assets: List[Dict]) -> Tuple[np.ndarray, List[str], float]:
    values = np.array([a.get("quantity", 0.0) * a.get("price", 0.0) for a in assets], dtype=float)
    symbols = [a["symbol"] for a in assets]
    total = float(values.sum()) if values.size > 0 else 0.0
    if total <= 0:
        # if prices not provided, assume equal weights
        n = len(assets)
        if n == 0:
            return np.array([]), symbols, 0.0
        return np.ones(n) / n, symbols, 0.0
    return values / total, symbols, total


def _portfolio_equity_from_returns(returns: pd.DataFrame, target_weights: np.ndarray, rebalancing: str) -> pd.Series:
    """Compute equity curve from asset return matrix and target weights.
    returns: DataFrame of daily returns with columns aligned to weights
    target_weights: 1D numpy array summing to 1
    rebalancing: 'none'|'monthly'|'quarterly'|'yearly'
    """
    if returns.empty:
        return pd.Series(dtype=float)

    equity = pd.Series(index=returns.index, dtype=float)
    equity.iloc[0] = 1.0

    if rebalancing == "none":
        # Fixed weights for the whole period
        port_rets = (returns * target_weights).sum(axis=1)
        equity = (1.0 + port_rets).cumprod()
        return equity

    rebalance_flags = _end_of_period_flags(returns.index, rebalancing)
    current_weights = target_weights.copy()
    current_equity = 1.0

    for i, (dt, row) in enumerate(returns.iterrows()):
        # Apply daily returns to each sleeve
        current_weights = current_weights * (1.0 + row.values)
        # Normalize to portfolio value contribution
        sleeve_sum = current_weights.sum()
        if sleeve_sum > 0:
            current_weights = current_weights / sleeve_sum
        # Portfolio daily return is weighted sum pre-normalization effect captured by normalization
        # To compute equity precisely, recompute using normalized yesterday weights times today's gross returns
        day_ret = float((row.values * current_weights).sum())
        current_equity *= (1.0 + day_ret)
        equity.iloc[i] = current_equity

        # Rebalance at period end to target weights
        if rebalance_flags.iloc[i]:
            current_weights = target_weights.copy()

    return equity


def _drawdown(series: pd.Series) -> pd.Series:
    if series.empty:
        return series
    peak = series.cummax()
    dd = (series / peak) - 1.0
    return dd


def _annual_returns(equity: pd.Series) -> Dict[str, float]:
    if equity.empty:
        return {}
    # group by year and compute calendar year return
    eq_year_end = equity.resample("Y").last()
    eq_year_begin = equity.resample("Y").first()
    rets = (eq_year_end / eq_year_begin - 1.0).dropna()
    out = {str(idx.year): round(val * 100, 2) for idx, val in rets.items()}
    return out


def _cagr(equity: pd.Series) -> float:
    if equity.empty:
        return 0.0
    start, end = equity.index[0], equity.index[-1]
    years = max((end - start).days / 365.25, 1e-9)
    total_return = float(equity.iloc[-1] / equity.iloc[0])
    return (total_return ** (1.0 / years) - 1.0)


def _ann_vol(returns: pd.Series) -> float:
    if returns.empty:
        return 0.0
    return float(returns.std() * np.sqrt(252))


def _sharpe(returns: pd.Series, rf: float) -> float:
    if returns.empty:
        return 0.0
    # convert annual rf to daily
    rf_daily = (1.0 + rf) ** (1.0 / 252.0) - 1.0
    excess = returns - rf_daily
    vol = returns.std()
    if vol == 0:
        return 0.0
    return float((excess.mean() * np.sqrt(252)) / vol)


def _sortino(returns: pd.Series, rf: float) -> float:
    if returns.empty:
        return 0.0
    rf_daily = (1.0 + rf) ** (1.0 / 252.0) - 1.0
    downside = returns[returns < rf_daily]
    if downside.empty:
        return float("inf")
    dd_vol = downside.std() * np.sqrt(252)
    if dd_vol == 0:
        return float("inf")
    ann_ret = (1 + returns.mean()) ** 252 - 1
    return float((ann_ret - rf) / dd_vol)


def _calmar(cagr: float, max_dd: float) -> float:
    if max_dd <= 0:
        return float("inf")
    return float(cagr / abs(max_dd))


def run_backtest(cfg: Dict) -> Dict:
    portfolio = cfg.get("portfolio", {})
    assets = portfolio.get("assets", [])
    start_date = cfg.get("startDate")
    end_date = cfg.get("endDate")
    rebal = cfg.get("rebalancing", "none")
    benchmark_symbols = cfg.get("benchmarkSymbols", []) or []
    risk_free_rate = float(cfg.get("riskFreeRate", 0.02))

    # Determine target weights and symbols
    target_weights, symbols, initial_value = _compute_weights(assets)
    if len(symbols) == 0:
        return {
            "error": "Portfolio has no assets",
        }

    # Try to use server-fetched Tiingo prices if provided in payload (priceMap), else fallback to yfinance
    symbols_unique = list(dict.fromkeys(symbols))
    tickers = symbols_unique + benchmark_symbols
    price_map = cfg.get("priceMap")
    if price_map:
        # Build a DataFrame from priceMap which is {symbol: [{date, adjClose|close, ...}]}
        frames = []
        for sym in symbols_unique:
            rows = price_map.get(sym, [])
            if not rows:
                continue
            # Tiingo daily returns objects have 'adjClose' or 'close'
            dates = [pd.to_datetime(r.get('date') or r.get('datetime')) for r in rows]
            vals = [r.get('adjClose') or r.get('close') for r in rows]
            s = pd.Series(vals, index=pd.DatetimeIndex(dates), name=sym)
            frames.append(s)
        if frames:
            prices = pd.concat(frames, axis=1).sort_index().dropna(how='all')
        else:
            prices = pd.DataFrame()
        # For benchmarks, we don't have Tiingo here; fallback later via yfinance
    else:
        data = yf.download(tickers, start=start_date, end=end_date, progress=False)
        if data is None or isinstance(data, pd.DataFrame) and data.empty:
            return {"error": "No market data returned"}

        # Robust extraction of close prices regardless of yfinance version/auto_adjust
        if isinstance(data, pd.DataFrame) and isinstance(data.columns, pd.MultiIndex):
            # Level 0 contains OHLCV labels
            level0 = set([lvl0 for (lvl0, _) in data.columns])
            if 'Adj Close' in level0:
                prices = data.xs('Adj Close', axis=1, level=0)
            elif 'Close' in level0:
                prices = data.xs('Close', axis=1, level=0)
            else:
                # Fallback: choose the first available price-like field
                candidate = 'Close' if 'Close' in level0 else next(iter(level0))
                prices = data.xs(candidate, axis=1, level=0)
        elif isinstance(data, pd.DataFrame):
            # Single ticker DataFrame
            chosen = None
            for col in ['Adj Close', 'Close', 'close']:
                if col in data.columns:
                    chosen = col
                    break
            if chosen is None and len(data.columns) > 0:
                chosen = data.columns[0]
            series = data[chosen] if chosen in data.columns else data.squeeze()
            prices = series.to_frame()
            # Name the column with the first ticker if possible
            if isinstance(tickers, list) and len(tickers) > 0:
                prices.columns = [tickers[0]]
        else:
            # Series fallback
            prices = data.to_frame()

    # Keep only available portfolio symbols
    available_symbols = [s for s in symbols_unique if s in getattr(prices, 'columns', [])]
    if not available_symbols:
        return {"error": "No matching symbols in downloaded data"}

    # Align weights to available symbols
    idx_map = [symbols.index(s) for s in available_symbols]
    aligned_weights = target_weights[idx_map]
    # Normalize
    if aligned_weights.sum() > 0:
        aligned_weights = aligned_weights / aligned_weights.sum()
    else:
        aligned_weights = np.ones(len(available_symbols)) / len(available_symbols)

    asset_prices = prices[available_symbols].dropna()
    asset_returns = asset_prices.pct_change().dropna()

    # Equity curve
    equity = _portfolio_equity_from_returns(asset_returns, aligned_weights, rebal)
    port_returns = equity.pct_change().fillna(0.0)
    dd = _drawdown(equity)

    # Metrics
    cagr = _cagr(equity)
    vol = _ann_vol(port_returns)
    sharpe = _sharpe(port_returns, risk_free_rate)
    sortino = _sortino(port_returns, risk_free_rate)
    max_dd = float(dd.min())  # negative number
    calmar = _calmar(cagr, max_dd)

    # Benchmarks: use prices if present, else download via yfinance
    benchmarks_out = []
    for b in benchmark_symbols:
        b_series = None
        if 'columns' in dir(prices) and b in prices.columns:
            b_series = prices[b].dropna()
        else:
            try:
                y = yf.download(b, start=start_date, end=end_date, progress=False)
                if isinstance(y, pd.DataFrame) and 'Adj Close' in y.columns:
                    b_series = y['Adj Close'].dropna()
                elif isinstance(y, pd.Series):
                    b_series = y.dropna()
            except Exception:
                b_series = None
        if b_series is not None and not b_series.empty:
            b_equity = (b_series / b_series.iloc[0]).rename('equity')
            rel_cagr = _cagr(b_equity)
            benchmarks_out.append({
                "symbol": b,
                "equityCurve": [{"date": d.strftime("%Y-%m-%d"), "value": float(v)} for d, v in b_equity.items()],
                "relativeCagr": round((cagr - rel_cagr) * 100, 2)
            })

    out = {
        "equityCurve": [{"date": d.strftime("%Y-%m-%d"), "value": float(v)} for d, v in equity.items()],
        "drawdown": [{"date": d.strftime("%Y-%m-%d"), "value": float(v)} for d, v in dd.items()],
        "annualReturns": _annual_returns(equity),
        "metrics": {
            "cagr": round(cagr * 100, 2),
            "volatility": round(vol * 100, 2),
            "sharpe": round(sharpe, 2),
            "sortino": round(sortino, 2) if sortino != float("inf") else None,
            "maxDrawdown": round(max_dd * 100, 2),
            "calmar": round(calmar, 2) if calmar != float("inf") else None
        },
        "benchmarks": benchmarks_out,
        "startDate": asset_prices.index[0].strftime("%Y-%m-%d") if not asset_prices.empty else start_date,
        "endDate": asset_prices.index[-1].strftime("%Y-%m-%d") if not asset_prices.empty else end_date,
        "rebalancing": rebal,
        "symbols": available_symbols,
    }

    return out


def main():
    args = parse_args()
    with open(args.input, "r") as f:
        cfg = json.load(f)

    result = run_backtest(cfg)

    with open(args.output, "w") as f:
        json.dump(result, f, indent=2)


if __name__ == "__main__":
    main()



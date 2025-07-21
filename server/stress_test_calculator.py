#!/usr/bin/env python3
"""
Quantitative Stress Test Calculator
===================================

This script performs comprehensive stress testing on investment portfolios
using proper quantitative finance methodologies.
"""

import json
import argparse
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import sys
import os
import logging
from typing import Dict, List, Tuple, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class StressTestCalculator:
    """
    Quantitative Stress Test Calculator
    
    This class implements proper quantitative finance methodologies for
    stress testing investment portfolios.
    """
    
    def __init__(self):
        self.asset_sensitivities = self._initialize_asset_sensitivities()
        self.correlation_matrix = self._initialize_correlation_matrix()
        
    def _initialize_asset_sensitivities(self) -> Dict[str, Dict[str, float]]:
        """Initialize asset sensitivity database"""
        return {
            'equity': {
                'Technology': {'equity_beta': 1.3, 'rates_sensitivity': -0.8, 'credit_sensitivity': 0.4},
                'Healthcare': {'equity_beta': 0.9, 'rates_sensitivity': -0.3, 'credit_sensitivity': 0.2},
                'Financial': {'equity_beta': 1.4, 'rates_sensitivity': 0.6, 'credit_sensitivity': 0.8},
                'Consumer Discretionary': {'equity_beta': 1.6, 'rates_sensitivity': -0.9, 'credit_sensitivity': 0.5},
                'Consumer Staples': {'equity_beta': 0.7, 'rates_sensitivity': -0.2, 'credit_sensitivity': 0.1},
                'Energy': {'equity_beta': 1.2, 'rates_sensitivity': 0.3, 'credit_sensitivity': 0.6},
                'Materials': {'equity_beta': 1.1, 'rates_sensitivity': 0.2, 'credit_sensitivity': 0.4},
                'Industrials': {'equity_beta': 1.0, 'rates_sensitivity': -0.1, 'credit_sensitivity': 0.3},
                'Utilities': {'equity_beta': 0.6, 'rates_sensitivity': -0.7, 'credit_sensitivity': 0.1},
                'Real Estate': {'equity_beta': 1.0, 'rates_sensitivity': -1.2, 'credit_sensitivity': 0.4},
                'Telecommunications': {'equity_beta': 0.8, 'rates_sensitivity': -0.5, 'credit_sensitivity': 0.2},
                'Diversified': {'equity_beta': 1.0, 'rates_sensitivity': -0.4, 'credit_sensitivity': 0.3}
            },
            'bond': {
                'Government Bonds': {'duration': 7.0, 'credit_sensitivity': 0.0, 'rates_sensitivity': 1.0},
                'Corporate Bonds': {'duration': 5.0, 'credit_sensitivity': 0.8, 'rates_sensitivity': 0.9},
                'High Yield': {'duration': 4.0, 'credit_sensitivity': 1.5, 'rates_sensitivity': 0.7},
                'Municipal Bonds': {'duration': 6.0, 'credit_sensitivity': 0.3, 'rates_sensitivity': 0.9},
                'Treasury Bills': {'duration': 0.25, 'credit_sensitivity': 0.0, 'rates_sensitivity': 1.0},
                'Fixed Income': {'duration': 6.0, 'credit_sensitivity': 0.4, 'rates_sensitivity': 0.95}
            },
            'commodity': {
                'Precious Metals': {'commodity_beta': 1.0, 'inflation_sensitivity': 0.8, 'fx_sensitivity': -0.6},
                'Energy': {'commodity_beta': 1.5, 'inflation_sensitivity': 1.2, 'fx_sensitivity': -0.4},
                'Agriculture': {'commodity_beta': 0.8, 'inflation_sensitivity': 0.6, 'fx_sensitivity': -0.3},
                'Industrial Metals': {'commodity_beta': 1.2, 'inflation_sensitivity': 0.7, 'fx_sensitivity': -0.5},
                'Commodities': {'commodity_beta': 1.0, 'inflation_sensitivity': 0.8, 'fx_sensitivity': -0.5}
            },
            'reit': {
                'Real Estate': {'equity_beta': 1.0, 'rates_sensitivity': -1.5, 'credit_sensitivity': 0.6}
            },
            'cash': {
                'Cash': {'rates_sensitivity': 0.1, 'credit_sensitivity': 0.0, 'equity_beta': 0.0}
            }
        }
    
    def _initialize_correlation_matrix(self) -> Dict[str, Dict[str, float]]:
        """Initialize correlation matrix between factors"""
        return {
            'equity': {'equity': 1.0, 'rates': -0.3, 'credit': 0.6, 'fx': -0.2, 'commodity': 0.3},
            'rates': {'equity': -0.3, 'rates': 1.0, 'credit': -0.4, 'fx': 0.5, 'commodity': -0.1},
            'credit': {'equity': 0.6, 'rates': -0.4, 'credit': 1.0, 'fx': -0.1, 'commodity': 0.2},
            'fx': {'equity': -0.2, 'rates': 0.5, 'credit': -0.1, 'fx': 1.0, 'commodity': -0.3},
            'commodity': {'equity': 0.3, 'rates': -0.1, 'credit': 0.2, 'fx': -0.3, 'commodity': 1.0}
        }
    
    def calculate_asset_impact(self, asset: Dict[str, Any], scenario_factors: Dict[str, float]) -> Dict[str, float]:
        """
        Calculate impact on individual asset based on scenario factors
        
        Args:
            asset: Asset information including type, sector, value, etc.
            scenario_factors: Scenario factor changes (equity, rates, credit, fx, commodity)
            
        Returns:
            Dictionary with calculated impacts
        """
        asset_type = asset.get('assetType', 'equity')
        asset_class = asset.get('assetClass', 'Diversified')
        sector = asset.get('sector', 'Diversified')
        current_value = asset.get('value', 0)
        
        # Get asset sensitivities
        if asset_type in self.asset_sensitivities and asset_class in self.asset_sensitivities[asset_type]:
            sensitivities = self.asset_sensitivities[asset_type][asset_class]
        elif asset_type in self.asset_sensitivities and sector in self.asset_sensitivities[asset_type]:
            sensitivities = self.asset_sensitivities[asset_type][sector]
        else:
            # Default sensitivities
            sensitivities = {'equity_beta': 1.0, 'rates_sensitivity': -0.4, 'credit_sensitivity': 0.3}
        
        # Calculate factor-specific impacts
        equity_impact = 0
        rates_impact = 0
        credit_impact = 0
        fx_impact = 0
        commodity_impact = 0
        
        if asset_type == 'equity':
            # Equity assets are primarily affected by equity factor
            equity_beta = sensitivities.get('equity_beta', 1.0)
            equity_impact = (scenario_factors.get('equity', 0) / 100) * equity_beta
            
            # Secondary effects from other factors
            rates_sensitivity = sensitivities.get('rates_sensitivity', -0.4)
            credit_sensitivity = sensitivities.get('credit_sensitivity', 0.3)
            
            rates_impact = (scenario_factors.get('rates', 0) / 10000) * rates_sensitivity
            credit_impact = (scenario_factors.get('credit', 0) / 10000) * credit_sensitivity
            
        elif asset_type == 'bond':
            # Bond assets are primarily affected by rates and credit
            duration = sensitivities.get('duration', 5.0)
            credit_sensitivity = sensitivities.get('credit_sensitivity', 0.5)
            
            rates_impact = -(scenario_factors.get('rates', 0) / 10000) * duration
            credit_impact = -(scenario_factors.get('credit', 0) / 10000) * credit_sensitivity
            
            # Minimal equity impact
            equity_impact = (scenario_factors.get('equity', 0) / 100) * 0.1
            
        elif asset_type == 'commodity':
            # Commodity assets are primarily affected by commodity factor
            commodity_beta = sensitivities.get('commodity_beta', 1.0)
            commodity_impact = (scenario_factors.get('commodity', 0) / 100) * commodity_beta
            
            # Secondary effects
            fx_sensitivity = sensitivities.get('fx_sensitivity', -0.5)
            fx_impact = (scenario_factors.get('fx', 0) / 100) * fx_sensitivity
            
        elif asset_type == 'reit':
            # REITs are affected by equity and rates
            equity_beta = sensitivities.get('equity_beta', 1.0)
            rates_sensitivity = sensitivities.get('rates_sensitivity', -1.5)
            credit_sensitivity = sensitivities.get('credit_sensitivity', 0.6)
            
            equity_impact = (scenario_factors.get('equity', 0) / 100) * equity_beta
            rates_impact = (scenario_factors.get('rates', 0) / 10000) * rates_sensitivity
            credit_impact = (scenario_factors.get('credit', 0) / 10000) * credit_sensitivity
            
        elif asset_type == 'cash':
            # Cash is minimally affected
            rates_impact = (scenario_factors.get('rates', 0) / 10000) * 0.1
        
        # Apply correlations to adjust for factor interactions
        correlation_adjustment = self._calculate_correlation_adjustment(
            scenario_factors, asset_type
        )
        
        # Total impact calculation
        total_impact_percent = (
            equity_impact + rates_impact + credit_impact + fx_impact + commodity_impact
        ) * (1 + correlation_adjustment)
        
        # Apply volatility adjustment based on scenario severity
        volatility_factor = abs(scenario_factors.get('volatility', 0)) / 100
        volatility_adjustment = volatility_factor * 0.1 * np.random.normal(0, 1) * 0.1
        
        total_impact_percent += volatility_adjustment
        
        # Calculate monetary impact
        stressed_value = current_value * (1 + total_impact_percent)
        impact_value = stressed_value - current_value
        
        return {
            'current_value': current_value,
            'stressed_value': stressed_value,
            'impact_value': impact_value,
            'impact_percent': total_impact_percent * 100,
            'factor_contributions': {
                'equity': equity_impact * 100,
                'rates': rates_impact * 100,
                'credit': credit_impact * 100,
                'fx': fx_impact * 100,
                'commodity': commodity_impact * 100
            },
            'sensitivities_used': sensitivities
        }
    
    def _calculate_correlation_adjustment(self, scenario_factors: Dict[str, float], asset_type: str) -> float:
        """Calculate adjustment factor based on factor correlations"""
        # Simple correlation adjustment - can be enhanced
        adjustment = 0
        
        # If multiple factors are stressed, apply correlation adjustment
        active_factors = [k for k, v in scenario_factors.items() if abs(v) > 0.1]
        
        if len(active_factors) > 1:
            # Diversification benefit from multiple factors
            adjustment = -0.05 * (len(active_factors) - 1)
        
        return adjustment
    
    def calculate_portfolio_impact(self, portfolio: Dict[str, Any], scenario: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate impact on entire portfolio
        
        Args:
            portfolio: Portfolio data with assets
            scenario: Scenario data with factors
            
        Returns:
            Complete portfolio stress test results
        """
        logger.info(f"Calculating portfolio impact for scenario: {scenario['name']}")
        
        scenario_factors = scenario['factors']
        assets = portfolio['assets']
        
        # Calculate impact on each asset
        asset_results = []
        total_current_value = 0
        total_stressed_value = 0
        
        for asset in assets:
            asset_impact = self.calculate_asset_impact(asset, scenario_factors)
            
            # Calculate stressed price
            stressed_price = asset.get('price', 0) * (1 + asset_impact['impact_percent'] / 100)
            
            # Calculate portfolio weight
            current_value = asset_impact['current_value']
            portfolio_weight = current_value / portfolio['totalValue'] if portfolio['totalValue'] > 0 else 0
            
            # Enhanced asset identification
            asset_identification = {
                'symbol': asset['symbol'],
                'name': asset['name'],
                'assetType': asset.get('assetType', 'equity'),
                'assetClass': asset.get('assetClass', 'Unknown'),
                'sector': asset.get('sector', 'Unknown'),
                'quantity': asset.get('quantity', 0),
                'currentPrice': asset.get('price', 0),
                'currentValue': current_value,
                'portfolioWeight': portfolio_weight
            }
            
            # Enhanced stress impact breakdown
            stress_impact = {
                'currentValue': current_value,
                'stressedValue': asset_impact['stressed_value'],
                'absoluteImpact': asset_impact['impact_value'],
                'percentageImpact': asset_impact['impact_percent'],
                'currentPrice': asset.get('price', 0),
                'stressedPrice': stressed_price,
                'priceChange': stressed_price - asset.get('price', 0),
                'priceChangePercent': ((stressed_price - asset.get('price', 0)) / asset.get('price', 0)) * 100 if asset.get('price', 0) > 0 else 0,
                'factorBreakdown': asset_impact['factor_contributions'],
                'riskMetrics': self._calculate_asset_risk_metrics(asset, scenario_factors)
            }
            
            asset_result = {
                'symbol': asset['symbol'],
                'name': asset['name'],
                'assetType': asset['assetType'],
                'assetClass': asset.get('assetClass', 'Unknown'),
                'sector': asset.get('sector', 'Unknown'),
                'quantity': asset.get('quantity', 0),
                'price': asset.get('price', 0),
                'current_value': asset_impact['current_value'],
                'stressed_value': asset_impact['stressed_value'],
                'impact_value': asset_impact['impact_value'],
                'impact_percent': asset_impact['impact_percent'],
                'factor_contributions': asset_impact['factor_contributions'],
                'weight': portfolio_weight,
                'contribution_to_portfolio': asset_impact['impact_value'] / portfolio['totalValue'] * 100,
                # NEW: Enhanced asset breakdown fields
                'assetIdentification': asset_identification,
                'stressImpact': stress_impact
            }
            
            asset_results.append(asset_result)
            total_current_value += asset_impact['current_value']
            total_stressed_value += asset_impact['stressed_value']
        
        # Calculate portfolio-level metrics
        total_impact_value = total_stressed_value - total_current_value
        total_impact_percent = (total_impact_value / total_current_value) * 100
        
        # Calculate asset class impacts
        asset_class_impacts = {}
        for asset_result in asset_results:
            asset_class = asset_result['assetClass']
            if asset_class not in asset_class_impacts:
                asset_class_impacts[asset_class] = {
                    'current_value': 0,
                    'stressed_value': 0,
                    'impact_value': 0,
                    'impact_percent': 0,
                    'weight': 0
                }
            
            asset_class_impacts[asset_class]['current_value'] += asset_result['current_value']
            asset_class_impacts[asset_class]['stressed_value'] += asset_result['stressed_value']
            asset_class_impacts[asset_class]['impact_value'] += asset_result['impact_value']
            asset_class_impacts[asset_class]['weight'] += asset_result['weight']
        
        # Calculate percentages for asset classes
        for asset_class in asset_class_impacts:
            if asset_class_impacts[asset_class]['current_value'] > 0:
                asset_class_impacts[asset_class]['impact_percent'] = (
                    asset_class_impacts[asset_class]['impact_value'] / 
                    asset_class_impacts[asset_class]['current_value'] * 100
                )
        
        # Calculate factor attribution
        factor_attribution = {'equity': 0, 'rates': 0, 'credit': 0, 'fx': 0, 'commodity': 0}
        
        for asset_result in asset_results:
            weight = asset_result['weight']
            for factor, contribution in asset_result['factor_contributions'].items():
                factor_attribution[factor] += contribution * weight
        
        # Calculate risk metrics
        risk_metrics = self._calculate_risk_metrics(asset_results, scenario_factors)
        
        # Calculate Greeks (simplified)
        greeks = self._calculate_greeks(asset_results, scenario_factors)
        
        return {
            'portfolioValue': total_current_value,
            'stressedValue': total_stressed_value,
            'totalImpact': total_impact_value,
            'totalImpactPercent': total_impact_percent,
            'assetClassImpacts': asset_class_impacts,
            'factorAttribution': factor_attribution,
            'riskMetrics': risk_metrics,
            'greeks': greeks,
            'assetResults': asset_results,
            'scenarioFactors': scenario_factors,
            'metadata': {
                'calculationTime': datetime.now().isoformat(),
                'scenarioName': scenario['name'],
                'scenarioId': scenario['id'],
                'portfolioName': portfolio['name'],
                'portfolioId': portfolio['id'],
                'assetsCount': len(assets)
            }
        }
    
    def _calculate_asset_risk_metrics(self, asset: Dict[str, Any], scenario_factors: Dict[str, float]) -> Dict[str, float]:
        """Calculate asset-specific risk metrics"""
        
        asset_type = asset.get('assetType', 'equity')
        
        # Estimate volatility based on asset type
        volatility_map = {
            'equity': 0.20,      # 20% annual volatility for equities
            'bond': 0.08,        # 8% annual volatility for bonds
            'cash': 0.01,        # 1% annual volatility for cash
            'commodity': 0.25,   # 25% annual volatility for commodities
            'reit': 0.18,        # 18% annual volatility for REITs
            'alternative': 0.30  # 30% annual volatility for alternatives
        }
        volatility = volatility_map.get(asset_type, 0.15)
        
        # Calculate correlation with market (simplified)
        correlation_map = {
            'equity': 0.8,
            'bond': 0.1,
            'cash': 0.0,
            'commodity': 0.3,
            'reit': 0.6,
            'alternative': 0.4
        }
        correlation = correlation_map.get(asset_type, 0.5)
        
        # Calculate liquidity score (simplified)
        liquidity_map = {
            'equity': 0.9,       # High liquidity for equities
            'bond': 0.7,         # Medium liquidity for bonds
            'cash': 1.0,         # Perfect liquidity for cash
            'commodity': 0.6,    # Medium liquidity for commodities
            'reit': 0.8,         # High liquidity for REITs
            'alternative': 0.4   # Lower liquidity for alternatives
        }
        liquidity = liquidity_map.get(asset_type, 0.7)
        
        return {
            'volatility': volatility,
            'correlation': correlation,
            'liquidity': liquidity
        }
    
    def _calculate_risk_metrics(self, asset_results: List[Dict], scenario_factors: Dict[str, float]) -> Dict[str, float]:
        """Calculate portfolio risk metrics"""
        
        # Calculate concentration risk (Herfindahl-Hirschman Index)
        weights = [asset['weight'] for asset in asset_results]
        hhi = sum(w**2 for w in weights)
        concentration = hhi
        
        # Calculate diversification benefit
        diversification = 1 - hhi
        
        # Calculate stress test coverage
        assets_with_impact = sum(1 for asset in asset_results if abs(asset['impact_percent']) > 0.1)
        coverage = assets_with_impact / len(asset_results)
        
        # Calculate tail risk
        impacts = [asset['impact_percent'] for asset in asset_results]
        tail_risk = np.percentile(impacts, 5) if impacts else 0
        
        return {
            'concentration': concentration,
            'diversification': diversification,
            'coverage': coverage,
            'tailRisk': tail_risk,
            'volatilityImpact': abs(scenario_factors.get('volatility', 0)) / 100
        }
    
    def _calculate_greeks(self, asset_results: List[Dict], scenario_factors: Dict[str, float]) -> Dict[str, float]:
        """Calculate portfolio Greeks (simplified)"""
        
        # Delta: Sensitivity to equity movements
        delta = sum(asset['factor_contributions']['equity'] * asset['weight'] for asset in asset_results)
        
        # Gamma: Second-order sensitivity (simplified)
        gamma = delta * 0.1
        
        # Theta: Time decay (simplified)
        theta = sum(asset['impact_percent'] * asset['weight'] * 0.01 for asset in asset_results)
        
        # Vega: Volatility sensitivity
        vega = abs(scenario_factors.get('volatility', 0)) / 100
        
        # Rho: Interest rate sensitivity
        rho = sum(asset['factor_contributions']['rates'] * asset['weight'] for asset in asset_results)
        
        return {
            'delta': delta,
            'gamma': gamma,
            'theta': theta,
            'vega': vega,
            'rho': rho
        }

def main():
    """Main function to run stress test calculation"""
    
    parser = argparse.ArgumentParser(description='Quantitative Stress Test Calculator')
    parser.add_argument('--input', required=True, help='Input JSON file path')
    parser.add_argument('--output', required=True, help='Output JSON file path')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        # Read input data
        logger.info(f"Reading input data from: {args.input}")
        with open(args.input, 'r') as f:
            input_data = json.load(f)
        
        # Initialize calculator
        calculator = StressTestCalculator()
        
        # Extract data
        portfolio = input_data['portfolio']
        scenario = input_data['scenario']
        options = input_data.get('options', {})
        
        logger.info(f"Portfolio: {portfolio['name']} (${portfolio['totalValue']:,.2f})")
        logger.info(f"Scenario: {scenario['name']} ({scenario['id']})")
        logger.info(f"Assets: {len(portfolio['assets'])}")
        
        # Calculate stress test
        results = calculator.calculate_portfolio_impact(portfolio, scenario)
        
        # Write results
        logger.info(f"Writing results to: {args.output}")
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        logger.info("Stress test calculation completed successfully")
        logger.info(f"Portfolio Impact: {results['totalImpactPercent']:.2f}% (${results['totalImpact']:,.2f})")
        
    except Exception as e:
        logger.error(f"Error in stress test calculation: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 
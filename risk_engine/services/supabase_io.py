"""
Supabase I/O Service
Handles all database operations for the risk engine
"""

import os
import pandas as pd
from supabase import create_client, Client
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
import json
import base64
from uuid import uuid4

logger = logging.getLogger(__name__)

class SupabaseService:
    """Service for Supabase database operations"""
    
    # Storage bucket name for VaR charts
    VAR_CHARTS_BUCKET = "var-charts"
    
    def __init__(self):
        self.client: Optional[Client] = None
        self.url = os.getenv("SUPABASE_URL")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.url or not self.service_key:
            logger.warning("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set - database features will be limited")
        else:
            # Initialize immediately if credentials are available
            try:
                self.client = create_client(self.url, self.service_key)
                logger.info("Supabase client initialized successfully")
                logger.info(f"Storage bucket configured: {self.VAR_CHARTS_BUCKET}")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
    
    async def initialize(self):
        """Initialize Supabase client"""
        try:
            self.client = create_client(self.url, self.service_key)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise
    
    # =============================================
    # PORTFOLIO OPERATIONS
    # =============================================
    
    async def get_portfolio(self, portfolio_id: str) -> Optional[Dict[str, Any]]:
        """Get portfolio by ID"""
        try:
            response = self.client.table("portfolios").select("*").eq("id", portfolio_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching portfolio {portfolio_id}: {e}")
            raise
    
    async def get_portfolio_with_positions(self, portfolio_id: str) -> Optional[Dict[str, Any]]:
        """Get portfolio with all positions"""
        try:
            # Get portfolio
            portfolio_response = self.client.table("portfolios").select("*").eq("id", portfolio_id).execute()
            if not portfolio_response.data:
                return None
            
            portfolio = portfolio_response.data[0]
            
            # Get positions
            positions_response = self.client.table("positions").select("*").eq("portfolio_id", portfolio_id).execute()
            portfolio["positions"] = positions_response.data
            
            return portfolio
        except Exception as e:
            logger.error(f"Error fetching portfolio with positions {portfolio_id}: {e}")
            raise
    
    async def get_portfolio_positions_df(self, portfolio_id: str) -> pd.DataFrame:
        """Get portfolio positions as DataFrame"""
        try:
            response = self.client.table("positions").select("*").eq("portfolio_id", portfolio_id).execute()
            return pd.DataFrame(response.data)
        except Exception as e:
            logger.error(f"Error fetching positions for portfolio {portfolio_id}: {e}")
            raise
    
    # =============================================
    # CALCULATION JOB OPERATIONS
    # =============================================
    
    async def create_calc_job(
        self,
        user_id: str,
        portfolio_id: str,
        calc_type: str,
        params: Dict[str, Any]
    ) -> str:
        """Create a new calculation job"""
        try:
            job_data = {
                "user_id": user_id,
                "portfolio_id": portfolio_id,
                "calc_type": calc_type,
                "params": params,
                "status": "queued",
                "progress": 0
            }
            
            response = self.client.table("calc_jobs").insert(job_data).execute()
            return response.data[0]["id"]
        except Exception as e:
            logger.error(f"Error creating calc job: {e}")
            raise
    
    async def get_calc_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get calculation job by ID"""
        try:
            response = self.client.table("calc_jobs").select("*").eq("id", job_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching calc job {job_id}: {e}")
            raise
    
    async def update_calc_job(
        self,
        job_id: str,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        error_message: Optional[str] = None,
        started_at: Optional[datetime] = None,
        finished_at: Optional[datetime] = None
    ):
        """Update calculation job status"""
        try:
            update_data = {}
            
            if status is not None:
                update_data["status"] = status
            if progress is not None:
                update_data["progress"] = progress
            if error_message is not None:
                update_data["error_message"] = error_message
            if started_at is not None:
                update_data["started_at"] = started_at.isoformat()
            if finished_at is not None:
                update_data["finished_at"] = finished_at.isoformat()
            
            if update_data:
                self.client.table("calc_jobs").update(update_data).eq("id", job_id).execute()
                
        except Exception as e:
            logger.error(f"Error updating calc job {job_id}: {e}")
            raise
    
    # =============================================
    # RESULTS OPERATIONS
    # =============================================
    
    async def save_var_result(
        self,
        portfolio_id: str,
        calc_job_id: str,
        calc_type: str,
        confidence: float,
        horizon_days: int,
        result: Dict[str, Any]
    ):
        """Save VaR calculation result"""
        try:
            result_data = {
                "portfolio_id": portfolio_id,
                "calc_job_id": calc_job_id,
                "calc_type": calc_type,
                "confidence": confidence,
                "horizon_days": horizon_days,
                "var_amount": result.get("var"),
                "es_amount": result.get("es"),
                "distribution_stats": {
                    "var_percentage": result.get("var_percentage"),
                    "es_percentage": result.get("es_percentage"),
                    "portfolio_volatility": result.get("portfolio_volatility"),
                    "avg_correlation": result.get("avg_correlation")
                },
                "risk_metrics": {
                    "method": result.get("method"),
                    "n_assets": result.get("n_assets"),
                    "n_simulations": result.get("n_simulations"),
                    "distribution_params": result.get("distribution_params"),
                    "simulation_stats": result.get("simulation_stats")
                },
                "params": result.get("params", {}),
                "chart_url": f"data:image/png;base64,{result.get('chart_data', '')}" if result.get('chart_data') else None
            }
            
            self.client.table("results").insert(result_data).execute()
            logger.info(f"Saved VaR result for portfolio {portfolio_id}")
            
        except Exception as e:
            logger.error(f"Error saving VaR result: {e}")
            raise
    
    async def get_portfolio_results(self, portfolio_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent results for a portfolio"""
        try:
            response = (
                self.client.table("results")
                .select("*")
                .eq("portfolio_id", portfolio_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching results for portfolio {portfolio_id}: {e}")
            raise
    
    # =============================================
    # STRESS TEST OPERATIONS
    # =============================================
    
    async def get_stress_scenario(self, scenario_id: str) -> Optional[Dict[str, Any]]:
        """Get stress test scenario by ID"""
        try:
            response = self.client.table("stress_scenarios").select("*").eq("id", scenario_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching stress scenario {scenario_id}: {e}")
            raise
    
    async def save_stress_test_result(
        self,
        portfolio_id: str,
        scenario_id: str,
        calc_job_id: str,
        base_value: float,
        stressed_value: float,
        component_results: List[Dict[str, Any]]
    ):
        """Save stress test result"""
        try:
            result_data = {
                "portfolio_id": portfolio_id,
                "scenario_id": scenario_id,
                "calc_job_id": calc_job_id,
                "base_value": base_value,
                "stressed_value": stressed_value,
                "component_results": component_results
            }
            
            self.client.table("stress_test_results").insert(result_data).execute()
            logger.info(f"Saved stress test result for portfolio {portfolio_id}")
            
        except Exception as e:
            logger.error(f"Error saving stress test result: {e}")
            raise
    
    # =============================================
    # MARKET DATA OPERATIONS
    # =============================================
    
    async def update_market_data(self, symbol: str, price_data: Dict[str, Any]):
        """Update market data for a symbol"""
        try:
            # Upsert market data
            self.client.table("market_data_cache").upsert({
                "symbol": symbol,
                "last_price": price_data.get("last_price"),
                "price_change": price_data.get("price_change"),
                "price_change_pct": price_data.get("price_change_pct"),
                "volume": price_data.get("volume"),
                "market_cap": price_data.get("market_cap"),
                "currency": price_data.get("currency", "USD"),
                "exchange": price_data.get("exchange"),
                "last_updated": datetime.utcnow().isoformat()
            }).execute()
            
        except Exception as e:
            logger.error(f"Error updating market data for {symbol}: {e}")
            raise
    
    async def get_market_data(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """Get market data for multiple symbols"""
        try:
            response = (
                self.client.table("market_data_cache")
                .select("*")
                .in_("symbol", symbols)
                .execute()
            )
            
            return {item["symbol"]: item for item in response.data}
            
        except Exception as e:
            logger.error(f"Error fetching market data: {e}")
            raise
    
    async def batch_update_market_data(self, market_data: List[Dict[str, Any]]):
        """Batch update market data for multiple symbols"""
        try:
            # Prepare data with timestamps
            now = datetime.utcnow().isoformat()
            data_to_upsert = []
            
            for item in market_data:
                data_to_upsert.append({
                    "symbol": item["symbol"],
                    "last_price": item.get("last_price"),
                    "price_change": item.get("price_change"),
                    "price_change_pct": item.get("price_change_pct"),
                    "volume": item.get("volume"),
                    "market_cap": item.get("market_cap"),
                    "currency": item.get("currency", "USD"),
                    "exchange": item.get("exchange"),
                    "last_updated": now
                })
            
            # Batch upsert
            self.client.table("market_data_cache").upsert(data_to_upsert).execute()
            
            logger.info(f"Batch updated market data for {len(data_to_upsert)} symbols")
            
        except Exception as e:
            logger.error(f"Error batch updating market data: {e}")
            raise
    
    async def get_stale_symbols(self, portfolio_id: str, max_age_minutes: int = 5) -> List[Dict[str, Any]]:
        """Get symbols that need price refresh for a portfolio"""
        try:
            # Call the Postgres function
            response = self.client.rpc('get_stale_symbols', {
                'p_portfolio_id': portfolio_id,
                'p_max_age_minutes': max_age_minutes
            }).execute()
            
            return response.data
            
        except Exception as e:
            logger.error(f"Error getting stale symbols: {e}")
            raise
    
    async def refresh_portfolio_prices(self, portfolio_id: str) -> Dict[str, Any]:
        """Refresh portfolio prices from market data cache"""
        try:
            # Call the Postgres function
            response = self.client.rpc('refresh_portfolio_prices', {
                'p_portfolio_id': portfolio_id
            }).execute()
            
            updated_count = len(response.data) if response.data else 0
            logger.info(f"Refreshed {updated_count} positions for portfolio {portfolio_id}")
            
            return {
                'updated_count': updated_count,
                'positions': response.data
            }
            
        except Exception as e:
            logger.error(f"Error refreshing portfolio prices: {e}")
            raise
    
    # =============================================
    # STORAGE OPERATIONS
    # =============================================
    
    async def upload_chart_to_storage(
        self,
        chart_base64: str,
        user_id: str,
        portfolio_id: str,
        method: str
    ) -> Optional[str]:
        """
        Upload VaR chart to Supabase Storage
        
        Args:
            chart_base64: Base64-encoded PNG image
            user_id: User ID for folder organization
            portfolio_id: Portfolio ID
            method: VaR method (parametric, historical, monte-carlo)
        
        Returns:
            Public URL of uploaded chart, or None on error
        """
        try:
            if not chart_base64:
                logger.warning("No chart data provided for upload")
                return None
            
            # Decode base64 to bytes
            chart_bytes = base64.b64decode(chart_base64)
            
            # Create unique filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"{user_id}/{portfolio_id}/{method}_{timestamp}.png"
            
            # Upload to storage
            response = self.client.storage.from_(self.VAR_CHARTS_BUCKET).upload(
                filename,
                chart_bytes,
                file_options={"content-type": "image/png", "upsert": "true"}
            )
            
            # Get public URL
            public_url = self.client.storage.from_(self.VAR_CHARTS_BUCKET).get_public_url(filename)
            
            logger.info(f"Chart uploaded successfully: {filename}")
            return public_url
            
        except Exception as e:
            logger.error(f"Error uploading chart to storage: {e}")
            return None
    
    # =============================================
    # RESULTS OPERATIONS
    # =============================================
    
    async def save_var_result(
        self,
        portfolio_id: str,
        calc_type: str,
        var_data: Dict[str, Any],
        chart_url: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Optional[str]:
        """
        Save VaR analysis result to database
        
        Args:
            portfolio_id: Portfolio ID
            calc_type: Calculation type (parametric, historical, monte_carlo)
            var_data: Dictionary with VaR calculation results
            chart_url: Supabase Storage URL for chart
            user_id: User ID (optional, for logging)
        
        Returns:
            Result ID or None on error
        """
        try:
            # Extract values from var_data
            results = var_data.get('results', var_data)
            
            # Prepare result data
            result_data = {
                'portfolio_id': portfolio_id,
                'calc_type': calc_type,
                'confidence': results.get('confidence_level', 0.95),
                'horizon_days': results.get('time_horizon', 1),
                'var_amount': results.get('var', 0),
                'var_percentage': results.get('var_percentage', 0),
                'es_amount': results.get('cvar', 0),  # Expected Shortfall
                'cvar_percentage': results.get('cvar_percentage', 0),
                'portfolio_value': results.get('portfolio_value', 0),
                'chart_storage_url': chart_url,
                'parameters': json.dumps({
                    'confidence_level': results.get('confidence_level', 0.95),
                    'time_horizon': results.get('time_horizon', 1),
                    'lookback_years': results.get('lookback_years'),
                    'num_simulations': results.get('num_simulations'),
                    'distribution': results.get('distribution'),
                    'timestamp': datetime.utcnow().isoformat()
                }),
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Insert into results table
            response = self.client.table("results").insert(result_data).execute()
            
            if response.data:
                result_id = response.data[0]['id']
                logger.info(f"VaR result saved successfully: {result_id} for portfolio {portfolio_id}")
                return result_id
            else:
                logger.error("No data returned from results insert")
                return None
                
        except Exception as e:
            logger.error(f"Error saving VaR result: {e}")
            return None
    
    async def get_var_history(
        self,
        portfolio_id: str,
        limit: int = 5,
        calc_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get VaR analysis history for a portfolio
        
        Args:
            portfolio_id: Portfolio ID
            limit: Maximum number of results to return
            calc_type: Optional filter by calculation type
        
        Returns:
            List of VaR results, most recent first
        """
        try:
            query = self.client.table("results") \
                .select("*") \
                .eq("portfolio_id", portfolio_id) \
                .order("created_at", desc=True) \
                .limit(limit)
            
            if calc_type:
                query = query.eq("calc_type", calc_type)
            
            response = query.execute()
            return response.data if response.data else []
            
        except Exception as e:
            logger.error(f"Error fetching VaR history: {e}")
            return []
    
    # =============================================
    # UTILITY FUNCTIONS
    # =============================================
    
    async def health_check(self) -> bool:
        """Check if Supabase connection is healthy"""
        try:
            # Simple query to test connection
            response = self.client.table("portfolios").select("id").limit(1).execute()
            return True
        except Exception as e:
            logger.error(f"Supabase health check failed: {e}")
            return False


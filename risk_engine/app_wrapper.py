"""
FastAPI Wrapper for Existing VAR Models
Adds modern infrastructure without changing core calculation logic
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import os
import json
import tempfile
import subprocess
import logging
from datetime import datetime
import asyncio
import sys

# Add var_models to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'var_models'))

# Import auth dependency (needed for route decorators)
from services.auth import get_current_user

# Configure logging
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("var_api_wrapper")

app = FastAPI(
    title="VAR Calculation API",
    description="RESTful API wrapper for proven VAR calculation models",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services lazily (only when needed, after env vars are loaded)
supabase_service = None
get_market_data_service = None

def get_supabase_service():
    """Lazy load Supabase service"""
    global supabase_service
    if supabase_service is None:
        from services.supabase_io import SupabaseService
        supabase_service = SupabaseService()
    return supabase_service

def get_market_data_service():
    """Lazy load Market Data service"""
    global get_market_data_service
    if get_market_data_service is None:
        from services.market_data import MarketDataService
        get_market_data_service = MarketDataService()
    return get_market_data_service

# =============================================
# REQUEST/RESPONSE MODELS
# =============================================

class VaRRequest(BaseModel):
    portfolio_id: str
    method: str = Field(default="monte_carlo", description="VaR method: parametric, historical, monte_carlo")
    confidence: float = Field(default=0.95, ge=0.01, le=0.999)
    horizon_days: int = Field(default=1, ge=1, le=252)
    num_simulations: int = Field(default=50000, ge=10000, le=500000)
    lookback_years: int = Field(default=3, ge=1, le=10)
    params: Dict[str, Any] = Field(default_factory=dict)

class VaRResponse(BaseModel):
    success: bool
    job_id: Optional[str] = None
    var_result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    models_available: List[str]

# =============================================
# HEALTH CHECK
# =============================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0",
        models_available=["parametric", "historical", "monte_carlo", "portfolio_var"]
    )

# =============================================
# VAR CALCULATION ENDPOINTS
# =============================================

@app.post("/calc/var", response_model=VaRResponse)
async def calculate_var(
    request: VaRRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Calculate VaR using the specified method
    """
    try:
        # Verify user owns the portfolio
        portfolio = await get_supabase_service().get_portfolio(request.portfolio_id)
        if not portfolio or portfolio.get('user_id') != current_user['sub']:
            raise HTTPException(status_code=403, detail="Portfolio not found or access denied")
        
        # Create calculation job
        job_id = await get_supabase_service().create_calc_job(
            user_id=current_user['sub'],
            portfolio_id=request.portfolio_id,
            calc_type=f"var_{int(request.confidence*100)}",
            params=request.dict()
        )
        
        # Run calculation in background
        background_tasks.add_task(
            process_var_calculation,
            job_id=job_id,
            request=request
        )
        
        return VaRResponse(
            success=True,
            job_id=job_id,
            var_result={"message": "Calculation started", "job_id": job_id}
        )
        
    except Exception as e:
        logger.error(f"Error starting VaR calculation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calc/portfolio-var", response_model=VaRResponse)
async def calculate_portfolio_var(
    request: VaRRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Calculate VaR using the comprehensive portfolio_var.py script
    """
    try:
        # Verify user owns the portfolio
        portfolio = await get_supabase_service().get_portfolio(request.portfolio_id)
        if not portfolio or portfolio.get('user_id') != current_user['sub']:
            raise HTTPException(status_code=403, detail="Portfolio not found or access denied")
        
        # Create calculation job
        job_id = await get_supabase_service().create_calc_job(
            user_id=current_user['sub'],
            portfolio_id=request.portfolio_id,
            calc_type="portfolio_var",
            params=request.dict()
        )
        
        # Run calculation in background
        background_tasks.add_task(
            process_portfolio_var_calculation,
            job_id=job_id,
            request=request
        )
        
        return VaRResponse(
            success=True,
            job_id=job_id,
            var_result={"message": "Portfolio VaR calculation started", "job_id": job_id}
        )
        
    except Exception as e:
        logger.error(f"Error starting portfolio VaR calculation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================
# JOB STATUS ENDPOINTS
# =============================================

@app.get("/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get calculation job status"""
    try:
        job = await get_supabase_service().get_calc_job(job_id)
        if not job or job.get('user_id') != current_user['sub']:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return job
    except Exception as e:
        logger.error(f"Error fetching job status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/portfolios/{portfolio_id}/results")
async def get_portfolio_results(
    portfolio_id: str,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get recent calculation results for a portfolio"""
    try:
        # Verify user owns the portfolio
        portfolio = await get_supabase_service().get_portfolio(portfolio_id)
        if not portfolio or portfolio.get('user_id') != current_user['sub']:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        results = await get_supabase_service().get_portfolio_results(portfolio_id, limit)
        return results
    except Exception as e:
        logger.error(f"Error fetching results: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================
# BACKGROUND PROCESSING FUNCTIONS
# =============================================

async def process_var_calculation(job_id: str, request: VaRRequest):
    """Process VaR calculation using the original VaR_methods.py script"""
    try:
        # Update job status
        await get_supabase_service().update_calc_job(job_id, status="running", started_at=datetime.utcnow())
        
        # Get portfolio positions
        positions_df = await get_supabase_service().get_portfolio_positions_df(request.portfolio_id)
        if positions_df.empty:
            raise ValueError("No positions found in portfolio")
        
        # Prepare input data for VaR calculation
        portfolio_data = {
            "portfolio_id": request.portfolio_id,
            "positions": positions_df.to_dict('records'),
            "params": {
                "method": request.method,
                "confidence_level": request.confidence,
                "time_horizon": request.horizon_days,
                "num_simulations": request.num_simulations,
                "lookback_years": request.lookback_years
            }
        }
        
        # Create temporary files for input/output
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as input_file:
            json.dump(portfolio_data, input_file)
            input_path = input_file.name
        
        output_path = input_path.replace('.json', '_output.json')
        
        try:
            # Call the original VaR_methods.py script based on method
            script_path = os.path.join(os.path.dirname(__file__), 'var_models', 'VaR_methods.py')
            
            # Run the calculation using the original script
            # This preserves all the original calculation logic
            result = await run_var_script(script_path, input_path, output_path, request.method)
            
            # Save results to database
            await get_supabase_service().save_var_result(
                portfolio_id=request.portfolio_id,
                calc_job_id=job_id,
                calc_type=request.method,
                confidence=request.confidence,
                horizon_days=request.horizon_days,
                result=result
            )
            
            # Update job status
            await get_supabase_service().update_calc_job(
                job_id,
                status="completed",
                finished_at=datetime.utcnow(),
                progress=100
            )
            
            logger.info(f"VaR calculation {job_id} completed successfully")
            
        finally:
            # Cleanup temporary files
            for path in [input_path, output_path]:
                if os.path.exists(path):
                    os.unlink(path)
        
    except Exception as e:
        logger.error(f"Error in VaR calculation {job_id}: {e}")
        await get_supabase_service().update_calc_job(
            job_id,
            status="failed",
            error_message=str(e),
            finished_at=datetime.utcnow()
        )

async def process_portfolio_var_calculation(job_id: str, request: VaRRequest):
    """Process VaR calculation using the original portfolio_var.py script"""
    try:
        # Update job status
        await get_supabase_service().update_calc_job(job_id, status="running", started_at=datetime.utcnow())
        
        # Get portfolio with positions
        portfolio = await get_supabase_service().get_portfolio_with_positions(request.portfolio_id)
        if not portfolio or not portfolio.get('positions'):
            raise ValueError("No positions found in portfolio")
        
        # Prepare input data in the format expected by portfolio_var.py
        portfolio_data = {
            "portfolio": {
                "id": portfolio['id'],
                "name": portfolio['name'],
                "assets": [
                    {
                        "symbol": pos['symbol'],
                        "quantity": float(pos['quantity']),
                        "price": float(pos['last_price'] or 0)
                    }
                    for pos in portfolio['positions']
                ]
            },
            "params": {
                "confidenceLevel": request.confidence,
                "timeHorizon": request.horizon_days,
                "numSimulations": request.num_simulations,
                "lookbackPeriod": request.lookback_years
            }
        }
        
        # Create temporary files
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as input_file:
            json.dump(portfolio_data, input_file)
            input_path = input_file.name
        
        output_path = input_path.replace('.json', '_output.json')
        
        try:
            # Call the original portfolio_var.py script
            script_path = os.path.join(os.path.dirname(__file__), 'var_models', 'portfolio_var.py')
            
            # Run the portfolio_var.py script (preserves all original logic)
            process = await asyncio.create_subprocess_exec(
                'python3', script_path,
                '--input', input_path,
                '--output', output_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                raise RuntimeError(f"Portfolio VaR calculation failed: {error_msg}")
            
            # Read results
            with open(output_path, 'r') as f:
                result = json.load(f)
            
            # Save results to database
            await get_supabase_service().save_var_result(
                portfolio_id=request.portfolio_id,
                calc_job_id=job_id,
                calc_type="portfolio_var",
                confidence=request.confidence,
                horizon_days=request.horizon_days,
                result=result
            )
            
            # Update job status
            await get_supabase_service().update_calc_job(
                job_id,
                status="completed",
                finished_at=datetime.utcnow(),
                progress=100
            )
            
            logger.info(f"Portfolio VaR calculation {job_id} completed successfully")
            
        finally:
            # Cleanup
            for path in [input_path, output_path]:
                if os.path.exists(path):
                    os.unlink(path)
        
    except Exception as e:
        logger.error(f"Error in portfolio VaR calculation {job_id}: {e}")
        await get_supabase_service().update_calc_job(
            job_id,
            status="failed",
            error_message=str(e),
            finished_at=datetime.utcnow()
        )

async def run_var_script(script_path: str, input_path: str, output_path: str, method: str) -> dict:
    """
    Run the original VaR calculation script
    This function wraps the existing scripts without modifying their logic
    """
    # For VaR_methods.py, we need to import and call the functions directly
    # to avoid having to modify the original script structure
    
    # Read input data
    with open(input_path, 'r') as f:
        input_data = json.load(f)
    
    # Import the original VaR_methods module
    import importlib.util
    spec = importlib.util.spec_from_file_location("var_methods", script_path)
    var_methods = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(var_methods)
    
    # Extract parameters
    params = input_data['params']
    positions = input_data['positions']
    
    # Get market data
    symbols = [pos['symbol'] for pos in positions]
    data = var_methods.get_sp500_data(years=params.get('lookback_years', 3))
    
    # Calculate returns
    returns, price_col = var_methods.calculate_returns(data)
    current_price = data[price_col].iloc[-1]
    
    # Calculate portfolio value
    portfolio_value = sum(pos['quantity'] * pos['price'] for pos in positions)
    
    # Run the appropriate VaR calculation method
    if method == "parametric":
        var_value, losses, pf_value = var_methods.parametric_var(
            returns,
            current_price,
            params['confidence_level'],
            params['time_horizon'],
            contract_size=50,  # Can be parameterized
            num_contracts=int(portfolio_value / (current_price * 50))
        )
    elif method == "historical":
        var_value, losses, pf_value = var_methods.historical_var(
            returns,
            current_price,
            params['confidence_level'],
            params['time_horizon'],
            contract_size=50,
            num_contracts=int(portfolio_value / (current_price * 50))
        )
    elif method == "monte_carlo":
        var_value, losses, pf_value = var_methods.monte_carlo_var(
            returns,
            current_price,
            params['confidence_level'],
            params['time_horizon'],
            params['num_simulations'],
            contract_size=50,
            num_contracts=int(portfolio_value / (current_price * 50))
        )
    else:
        raise ValueError(f"Unknown VaR method: {method}")
    
    # Return results in a structured format
    return {
        "var": float(var_value),
        "portfolio_value": float(pf_value),
        "var_percentage": float(var_value / pf_value * 100),
        "method": method,
        "confidence": params['confidence_level'],
        "horizon_days": params['time_horizon']
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "VAR Calculation API",
        "version": "1.0.0",
        "description": "RESTful API wrapper for proven VAR calculation models",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "calculate_var": "/calc/var (POST)",
            "portfolio_var": "/calc/portfolio-var (POST)",
            "legacy_run_var": "/api/run-var (POST) - Legacy compatibility endpoint"
        },
        "status": "running"
    }

# =============================================
# LEGACY COMPATIBILITY ENDPOINT (No Auth Required)
# =============================================

@app.post("/api/run-var")
async def legacy_run_var(request: dict):
    """
    Legacy compatibility endpoint for the old Express server format.
    This endpoint does NOT require authentication and is for backward compatibility.
    """
    try:
        logger.info(f"Legacy /api/run-var called with request: {json.dumps(request, indent=2)}")
        
        # Extract params from either nested params object or top level
        params = request.get('params', request)
        portfolio_data = request.get('portfolio') or params.get('portfolio')
        
        # Extract VaR parameters with defaults
        confidence_level = float(params.get('confidenceLevel', 0.95))
        time_horizon = int(params.get('timeHorizon', 1))
        num_simulations = int(params.get('numSimulations', 50000))
        lookback_period = int(params.get('lookbackPeriod', 3))
        var_method = params.get('varMethod', 'monte-carlo')
        
        # Map method names
        method_map = {
            'monte-carlo': 'monte_carlo',
            'parametric': 'parametric',
            'historical': 'historical'
        }
        method = method_map.get(var_method, 'monte_carlo')
        
        logger.info(f"Extracted parameters: confidence={confidence_level}, horizon={time_horizon}, "
                   f"simulations={num_simulations}, lookback={lookback_period}, method={method}")
        
        # If we have portfolio data, use it to calculate VaR
        if portfolio_data:
            portfolio_assets = portfolio_data.get('assets', [])
            logger.info(f"Portfolio has {len(portfolio_assets)} assets")
            
            # Import the appropriate VaR model
            if method == 'parametric':
                from var_models.Parametric import calculate_var as calc_parametric
                result = calc_parametric(
                    portfolio_assets=portfolio_assets,
                    confidence=confidence_level,
                    horizon=time_horizon,
                    lookback_years=lookback_period
                )
            elif method == 'historical':
                from var_models.Historical import calculate_var as calc_historical  
                result = calc_historical(
                    portfolio_assets=portfolio_assets,
                    confidence=confidence_level,
                    horizon=time_horizon,
                    lookback_years=lookback_period
                )
            else:  # monte_carlo
                from var_models.MonteCarlo import calculate_var as calc_monte_carlo
                result = calc_monte_carlo(
                    portfolio_assets=portfolio_assets,
                    confidence=confidence_level,
                    horizon=time_horizon,
                    n_simulations=num_simulations,
                    lookback_years=lookback_period
                )
            
            logger.info(f"Calculation completed successfully with method: {method}")
            
            # Return in the old Express server format
            return {
                "success": True,
                "results": result.get('results', result),
                "chartUrl": result.get('chart_url', ''),
                "method": method,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            # No portfolio data - return mock/example response
            logger.warning("No portfolio data provided, returning example response")
            return {
                "success": True,
                "results": {
                    "var_95": 1245.67,
                    "confidence_level": confidence_level,
                    "time_horizon": time_horizon,
                    "method": method,
                    "message": "This is a test response - provide portfolio data for actual calculation"
                },
                "chartUrl": "",
                "method": method,
                "timestamp": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Error in legacy /api/run-var endpoint: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "details": "Error processing VaR calculation request"
        }

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting VAR API Wrapper...")
    logger.info("Using original proven VAR calculation models")
    
    # Only initialize services if env vars are set
    if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
        try:
            svc = get_supabase_service()
            await svc.initialize()
            logger.info("Supabase service initialized")
        except Exception as e:
            logger.warning(f"Supabase initialization failed (will work in limited mode): {e}")
    else:
        logger.warning("Supabase credentials not set - running in limited mode")
    
    logger.info("VAR API Wrapper started successfully")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app_wrapper:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )




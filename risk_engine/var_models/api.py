from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

app = FastAPI()

class Position(BaseModel):
    symbol: str
    quantity: float
    price: float

class Portfolio(BaseModel):
    id: str
    name: str
    positions: List[Position]

# Dummy data for illustration
PORTFOLIOS = {
    "1": Portfolio(
        id="1",
        name="Sample Portfolio",
        positions=[
            Position(symbol="AAPL", quantity=10, price=150),
            Position(symbol="MSFT", quantity=5, price=300),
        ]
    )
}

@app.get("/api/portfolio/{portfolio_id}", response_model=Portfolio)
def get_portfolio(portfolio_id: str):
    if portfolio_id not in PORTFOLIOS:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return PORTFOLIOS[portfolio_id]

@app.post("/api/portfolio/{portfolio_id}", response_model=Portfolio)
def update_portfolio(portfolio_id: str, portfolio: Portfolio):
    PORTFOLIOS[portfolio_id] = portfolio
    return portfolio
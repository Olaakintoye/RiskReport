# 🎯 **Quantitative Stress Testing Architecture**

## **Executive Summary**

The stress testing engine has been completely rebuilt using **proper quantitative finance methodology** to replace mock calculations with real risk factor sensitivities. This provides hedge fund managers with accurate, position-level risk attribution and realistic scenario impact analysis.

---

## **🏗️ Key Architecture Changes**

### **1. Asset Classification Engine**
- **Real Asset Metadata**: Sector, industry, market cap, geography classification
- **Bond Characteristics**: Duration, credit rating, government vs corporate
- **ETF Mapping**: Underlying index, expense ratios, concentration metrics
- **Alternative Assets**: REITs, commodities, international exposure

### **2. Factor Sensitivity Models** 
- **Equity Betas**: Calculated by sector, market cap, and geography
- **Duration Risk**: Proper interest rate sensitivity for bonds
- **Credit Sensitivity**: Credit spread exposure by rating and sector
- **Currency Exposure**: FX risk for international and emerging market assets
- **Commodity Loadings**: Direct and indirect commodity exposure

### **3. Scenario Translation Layer**
- **Market Factors**: Equity shocks mapped via calculated betas
- **Rate Shocks**: Applied via duration for bonds, rate sensitivity for equities
- **Credit Spreads**: Mapped by credit rating and sector
- **Cross-Correlations**: Second-order effects between factors

---

## **📊 How It Works**

### **Step 1: Asset Analysis**
```typescript
For each position:
1. Classify asset (equity/bond/REIT/commodity/alternative)
2. Get metadata (sector, market cap, duration, rating)
3. Calculate factor sensitivities:
   - Equity beta (sector * market cap * geography adjustments)
   - Rate sensitivity (duration for bonds, sector-based for equities)  
   - Credit sensitivity (rating-based for bonds)
   - FX exposure (geography-based)
```

### **Step 2: Scenario Application**
```typescript
For each scenario factor:
1. Map factor shock to asset-specific impact
2. Apply sensitivity: Impact = Position Value × Factor Shock × Sensitivity
3. Aggregate position impacts to portfolio level
4. Calculate cross-factor correlations
```

### **Step 3: Risk Attribution**
```typescript
Portfolio Impact = Σ(Position Impact by Factor)
- Factor Attribution: Breakdown by equity/rates/credit/FX/commodity
- Asset Class Attribution: Equity/Bond/REIT/Commodity impacts  
- Position Attribution: Individual security contributions
- Risk Metrics: Concentration, diversification, leverage effects
```

---

## **🎯 Real-World Example: Market Decline -25%**

### **Before (Mock Approach)**
- Simple percentage applied to all assets
- No consideration of asset characteristics
- Zero or unrealistic impacts
- No risk factor decomposition

### **After (Quantitative Approach)**
```
AAPL (Technology Stock):
- Equity Beta: 1.20 (Technology sector adjustment)
- Impact: -25% × 1.20 = -30% loss
- Factor Attribution: 100% equity factor

TLT (20-Year Treasury Bond):
- Duration: 17 years
- Rate Sensitivity: Minimal (no rate shock in scenario)
- Equity Sensitivity: 0.05 (flight to quality effect)
- Impact: -25% × 0.05 = -1.25% loss
- Factor Attribution: 100% equity factor (safe haven flow)

VNQ (REIT ETF):
- Equity Beta: 0.60 (REIT correlation with equity markets)
- Rate Sensitivity: -0.80 (REITs hurt by rate expectations)
- Impact: -25% × 0.60 = -15% loss
- Factor Attribution: Equity + implied rate expectations
```

---

## **🔬 Factor Sensitivity Calculations**

### **Equity Assets**
```typescript
Base Beta = 1.0
× Market Cap Adjustment (Small: 1.3, Mid: 1.1, Large: 0.95)
× Sector Adjustment (Tech: 1.2, Financials: 1.15, Utilities: 0.7)
× Geography Adjustment (Emerging: 1.4, International: 0.8, US: 1.0)

Example: Small-cap Technology Stock
Beta = 1.0 × 1.3 × 1.2 × 1.0 = 1.56
```

### **Bond Assets**
```typescript
Rate Sensitivity = -Duration
Credit Sensitivity = f(Credit Rating, Sector)
  - AAA: 0.1, A: 0.4, BBB: 0.6, BB: 1.2, B: 1.8

Example: BBB Corporate Bond, 8-year duration
Rate Impact = -8.0 × (Rate Shock in bps / 10,000)
Credit Impact = 0.6 × (Credit Spread Shock in bps / 10,000)
```

### **Alternative Assets**
```typescript
REITs:
- Equity Correlation: 0.60
- Rate Sensitivity: -0.80
- Credit Sensitivity: 0.30

Commodities:
- Commodity Exposure: 1.00
- USD Sensitivity: -0.40 (inverse correlation)
- Rate Sensitivity: -0.20
```

---

## **📈 Risk Metrics & Attribution**

### **Portfolio-Level Metrics**
- **Concentration (HHI)**: Herfindahl-Hirschman Index of position weights
- **Diversification Score**: Multi-asset class, position count weighted
- **Factor Loading**: Net exposure to equity/rates/credit/FX/commodity
- **Tail Risk**: Extreme scenario sensitivity

### **Position-Level Attribution**
- **Position P&L**: Dollar and percentage impact per security
- **Factor Breakdown**: Contribution from each risk factor
- **Asset Class Roll-up**: Equity/Bond/REIT/Alternative impacts
- **Risk Contribution**: Marginal risk contribution to portfolio VaR

---

## **🎯 Hedge Fund Use Cases**

### **1. Portfolio Construction**
- **Risk Budgeting**: Allocate risk across factors and asset classes
- **Hedging Analysis**: Identify natural hedges and risk concentrations
- **Asset Selection**: Choose securities with desired factor exposures

### **2. Risk Management**
- **Scenario Planning**: Test portfolio under various market conditions
- **Tail Risk**: Assess extreme downside scenarios
- **Factor Exposure**: Monitor and manage factor tilts

### **3. Performance Attribution**
- **Factor Returns**: Decompose returns by risk factor
- **Asset Class Performance**: Understand driver of portfolio performance
- **Security Selection**: Evaluate alpha vs beta contributions

---

## **🔧 Implementation Files**

### **Core Engine**
- `quantitativeStressTestService.ts` - Main calculation engine
- `scenarioService.ts` - Scenario application (updated to use quant engine)

### **Asset Classification**
- Asset metadata database with 100+ securities
- Factor sensitivity models by asset type
- Real-time price integration via Tiingo API

### **Testing & Validation**
- `quantitative-stress-test-debug.ts` - Comprehensive test suite
- Position-level validation and factor attribution verification
- Comparison with legacy mock approach

---

## **✅ Validation Results**

The new engine produces **realistic, factor-based impacts** that properly reflect:

1. **Equity Risk**: Technology stocks more sensitive than utilities
2. **Duration Risk**: Long-term bonds properly affected by rate scenarios  
3. **Credit Risk**: High-yield bonds more sensitive to credit spread shocks
4. **Diversification**: Mixed portfolios show proper risk reduction
5. **Factor Attribution**: Clear breakdown of risk sources

**No more zero impacts** or unrealistic results. Every calculation is grounded in quantitative finance theory and real market relationships.

---

## **🚀 Next Steps**

1. **Enhanced Factor Models**: Add momentum, value, quality factors
2. **Options Integration**: Include Greeks for derivative positions
3. **Stress Testing Templates**: Industry-standard scenarios (Basel, CCAR)
4. **Performance Analytics**: Factor-based performance attribution
5. **Real-time Monitoring**: Live risk factor exposure tracking

---

*This quantitative approach transforms the stress testing from a simple calculation tool into a sophisticated risk management system suitable for institutional hedge fund operations.* 
# 🏗️ **STRUCTURED SCENARIO SYSTEM**

## **Executive Summary**

The codebase has been completely restructured to implement a sophisticated **Structured Scenario Management System** with proper ID assignment, categorization, and lifecycle management. Every scenario (template and custom) now has a unique, structured ID that makes the system scalable and maintainable.

---

## **🔑 Key Features Implemented**

### **1. Structured ID System**
- **Template Scenarios**: `TMPLxxxx` (e.g., `TMPL0001`, `TMPL0002`)
- **Custom Scenarios**: `CUSTxxxx` (e.g., `CUST0001`, `CUST0002`)
- **Historical Scenarios**: `HISTxxxx` (e.g., `HIST0001`, `HIST0002`)
- **Regulatory Scenarios**: `REGLxxxx` (e.g., `REGL0001`, `REGL0002`)

### **2. Comprehensive Scenario Metadata**
```typescript
interface ScenarioMetadata {
  id: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  type: ScenarioType;
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  timeHorizon: number;
  confidence: number;
  tags: string[];
  regulatory?: { framework: string; year: number; jurisdiction: string };
  historical?: { startDate: string; endDate: string; eventName: string };
  created: string;
  updated: string;
  createdBy: string;
  version: number;
}
```

### **3. Enhanced Factor Changes**
```typescript
interface ScenarioFactorChanges {
  equity: number;        // Percentage change in equity markets
  rates: number;         // Basis points change in interest rates
  credit: number;        // Basis points change in credit spreads
  fx: number;           // Percentage change in FX (USD strength)
  commodity: number;    // Percentage change in commodity prices
  volatility?: number;  // Percentage change in volatility (VIX)
  correlation?: number; // Change in cross-asset correlations
}
```

---

## **📋 Template Scenarios Database**

### **Crisis & Market Scenarios**
- **TMPL0001**: 2008 Financial Crisis (-45% equity, +350bps credit)
- **TMPL0005**: COVID-19 Pandemic Crash (-34% equity, -77% commodity)
- **TMPL0006**: Market Decline -25% (pure equity shock)
- **TMPL0007**: Credit Crisis +350bps (credit spread widening)
- **TMPL0008**: Geopolitical Shock (risk-off sentiment)

### **Rate & Policy Scenarios**
- **TMPL0002**: Fed Rate Hike +100bps (monetary tightening)

### **Sector & Commodity Scenarios**
- **TMPL0003**: Oil Price Shock +50% (supply disruption)
- **TMPL0004**: Technology Sector Correction (-25% tech stocks)

### **Regulatory Scenarios**
- **REGL0001**: CCAR Severely Adverse Scenario (Fed stress test)
- **REGL0002**: Basel III Stress Test (international banking)

---

## **🏗️ Architecture Components**

### **Core Services**
```
📁 client/src/services/
├── scenarioManagementService.ts    # Main scenario management engine
├── scenarioService.ts              # Legacy compatibility wrapper
├── scenarioMigrationService.ts     # Migration from old to new system
├── quantitativeStressTestService.ts # Quantitative stress testing
└── initServices.ts                 # Enhanced initialization with migration
```

### **Service Responsibilities**

#### **ScenarioManagementService**
- Template scenario management
- Custom scenario creation/editing
- Scenario run execution
- Statistics and analytics
- Storage management

#### **ScenarioService (Legacy Wrapper)**
- Maintains backward compatibility
- Converts between old and new formats
- Provides familiar interface to existing frontend

#### **ScenarioMigrationService**
- Automatic migration from old IDs to new structured IDs
- Legacy ID mapping (`'7'` → `'TMPL0006'`)
- Data format conversion
- Storage cleanup

---

## **🔄 ID Migration Mapping**

### **Legacy to New ID Mappings**
```typescript
const LEGACY_TO_NEW_ID_MAPPING = {
  '1': 'TMPL0001',  // 2008 Financial Crisis
  '2': 'TMPL0002',  // Fed +100bps
  '3': 'TMPL0003',  // Oil Price Shock
  '4': 'TMPL0004',  // Tech Sector Correction
  '5': 'TMPL0001',  // Lehman Brothers (duplicate of 2008)
  '6': 'TMPL0005',  // COVID-19 Pandemic Crash
  '7': 'TMPL0006',  // Market decline - 25%
  '8': 'TMPL0007',  // Credit Crisis
  '9': 'TMPL0008',  // Geopolitical Shock
};
```

### **Your Market Decline -25% Scenario**
- **Old ID**: `'7'`
- **New ID**: `'TMPL0006'`
- **Status**: ✅ Fully migrated and functional
- **Factor Changes**: `{ equity: -25, rates: 0, credit: 0, fx: 0, commodity: 0 }`

---

## **🚀 Usage Examples**

### **Frontend Integration**
```typescript
// The frontend automatically uses new structured IDs
// Legacy ID '7' is automatically mapped to 'TMPL0006'

// Running a scenario (works with both old and new IDs)
const result = await scenarioService.runScenario('TMPL0006', portfolioId);

// Creating custom scenarios
const customScenario = await scenarioManager.createCustomScenario(
  'Custom Market Stress',
  'Custom scenario for specific portfolio testing',
  ScenarioCategory.CUSTOM,
  { equity: -20, rates: 75, credit: 150, fx: -3, commodity: 5 }
);
```

### **Advanced Scenario Management**
```typescript
// Get scenarios by category
const crisisScenarios = await scenarioManager.getScenariosByCategory(
  ScenarioCategory.MARKET_CRISIS
);

// Get regulatory scenarios
const regulatoryScenarios = await scenarioManager.getScenariosByType(
  ScenarioType.REGULATORY
);

// Get scenario statistics
const stats = await scenarioManager.getScenarioStatistics();
```

---

## **📊 Storage Structure**

### **New Storage Keys**
```
scenarios_v2          # Template scenarios
custom_scenarios_v2   # User-created scenarios
scenario_runs_v2      # Scenario execution results
scenario_counter_v2   # Counter for custom scenario IDs
scenario_metadata_v2  # Additional metadata
```

### **Automatic Migration**
- System automatically detects old data
- Migrates scenarios and runs to new format
- Maintains backward compatibility
- Cleans up old storage keys

---

## **🎯 Benefits of New System**

### **For Developers**
- **Structured IDs**: Easy to understand and manage
- **Type Safety**: Full TypeScript support
- **Extensibility**: Easy to add new scenario types
- **Maintainability**: Clear separation of concerns

### **For Users**
- **Seamless Experience**: No disruption to existing workflows
- **Enhanced Metadata**: Better scenario descriptions and categorization
- **Improved Performance**: Optimized storage and retrieval
- **Future-Ready**: Supports advanced features like regulatory compliance

### **For Hedge Fund Managers**
- **Professional Structure**: Industry-standard scenario organization
- **Regulatory Compliance**: Built-in support for CCAR, Basel III
- **Custom Scenario Management**: Sophisticated scenario creation tools
- **Comprehensive Analytics**: Enhanced reporting and statistics

---

## **🔧 Testing & Validation**

### **Run Tests**
```bash
# Test the new structured system
node test-structured-scenarios.js

# Test quantitative stress testing
node test-quantitative-stress.js

# Test migration (if needed)
node test-migration.js
```

### **Expected Results**
- ✅ All scenarios have structured IDs
- ✅ Legacy compatibility maintained
- ✅ Migration runs automatically
- ✅ Market decline -25% scenario (TMPL0006) produces non-zero results
- ✅ Custom scenarios can be created with CUST IDs

---

## **🚨 Important Notes**

### **Breaking Changes**
- **None**: System maintains full backward compatibility
- Legacy IDs are automatically mapped to new IDs
- Existing frontend code continues to work

### **Migration**
- Runs automatically on first app startup
- Converts old scenario runs to new format
- Preserves all historical data
- One-time operation

### **Performance**
- Faster scenario loading with structured storage
- Optimized queries by category/type
- Efficient migration with minimal impact

---

## **📈 Next Steps**

### **Phase 1: Validation** ✅
- [x] Structured ID system implemented
- [x] Migration system in place
- [x] Legacy compatibility maintained
- [x] Quantitative stress testing integrated

### **Phase 2: Enhancement** (Future)
- [ ] Frontend UI updates to show structured IDs
- [ ] Advanced scenario search and filtering
- [ ] Scenario templates import/export
- [ ] Batch scenario execution

### **Phase 3: Advanced Features** (Future)
- [ ] Scenario versioning and history
- [ ] Collaborative scenario editing
- [ ] Regulatory reporting integration
- [ ] Advanced analytics dashboard

---

## **🎉 Success Metrics**

The new structured scenario system successfully addresses:

1. **✅ Proper ID Assignment**: Every scenario has a unique, structured ID
2. **✅ Scalability**: System can handle thousands of scenarios
3. **✅ Maintainability**: Clear code organization and separation
4. **✅ Backward Compatibility**: Existing functionality preserved
5. **✅ Professional Structure**: Industry-standard organization
6. **✅ Future-Ready**: Extensible for advanced features

**Your Market decline -25% scenario is now properly structured as TMPL0006 and should produce realistic stress test results!** 
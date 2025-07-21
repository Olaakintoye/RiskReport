# Scenario Management System

## Overview

The scenario management system has been completely revamped to properly handle both predefined and custom scenarios with full CRUD operations. All scenarios are now properly persisted and available for selection in stress tests.

## Key Features

### 1. **Proper Scenario Lifecycle Management**
- ✅ **Create** - Custom scenarios can be created and saved
- ✅ **Read** - All scenarios are properly loaded and available
- ✅ **Update** - Scenarios can be modified and saved
- ✅ **Delete** - Scenarios can be removed from the system

### 2. **Predefined vs Custom Scenarios**
- **Predefined Scenarios**: System-defined scenarios that are automatically updated
- **Custom Scenarios**: User-created scenarios that persist across app sessions
- **Automatic Merging**: System merges predefined and custom scenarios seamlessly

### 3. **Version Tracking**
- Predefined scenarios are versioned (currently v1.1.0)
- System automatically updates predefined scenarios when version changes
- Custom scenarios are preserved during updates

### 4. **Available Predefined Scenarios**
1. **2008 Financial Crisis** - Severe market crash scenario
2. **Fed +100bps** - Interest rate increase scenario  
3. **Oil Price Shock** - Commodity price surge scenario
4. **Tech Sector Correction** - Technology sector decline
5. **Lehman Brothers Collapse** - Financial crisis scenario
6. **COVID-19 Pandemic Crash** - Pandemic-induced market crash
7. **Market decline - 25%** - Broad equity market decline ⭐ **(NEW)**

## Usage

### Getting All Scenarios
```typescript
import scenarioService from './services/scenarioService';

// Get all scenarios (predefined + custom)
const allScenarios = await scenarioService.getScenarios();

// Get only predefined scenarios
const predefinedScenarios = await scenarioService.getPredefinedScenarios();

// Get only custom scenarios
const customScenarios = await scenarioService.getCustomScenarios();
```

### Creating Custom Scenarios
```typescript
const customScenario = {
  name: 'My Custom Scenario',
  description: 'A custom stress test scenario',
  factorChanges: {
    equity: -15,
    rates: 50,
    credit: 25,
    fx: 0,
    commodity: 0
  }
};

const createdScenario = await scenarioService.createScenario(customScenario);
```

### Running Stress Tests
```typescript
// Run scenario on a portfolio
const scenarioRun = await scenarioService.runScenario(scenarioId, portfolio);

// Access stress test results
console.log('Impact:', scenarioRun.impact); // Percentage impact
console.log('Asset Class Impacts:', scenarioRun.assetClassImpacts);
console.log('Factor Attribution:', scenarioRun.factorAttribution);
```

### Scenario Management
```typescript
// Update a scenario
const updatedScenario = await scenarioService.updateScenario(modifiedScenario);

// Delete a scenario
await scenarioService.deleteScenario(scenarioId);

// Refresh predefined scenarios (useful for development)
await scenarioService.refreshPredefinedScenarios();

// Reset to default scenarios (removes all custom scenarios)
await scenarioService.resetToDefaultScenarios();
```

## Debug & Testing

### Quick Debug Functions
```typescript
import debugSuite from './debug/stress-test-debug';

// Check all scenarios
await debugSuite.debugScenarios();

// Fix missing Market decline scenario
await debugSuite.fixMissingMarketDeclineScenario();

// Test stress calculations
await debugSuite.debugStressCalculation();

// Run full test suite
await debugSuite.runFullDebugSuite();
```

### Comprehensive Testing
```typescript
import testSuite from './debug/scenario-management-test';

// Test full scenario management system
await testSuite.runScenarioManagementTest();

// Test specific Market decline scenario
await testSuite.testMarketDeclineScenario();
```

## Technical Implementation

### Storage Structure
```typescript
// AsyncStorage Keys
'scenarios' - All scenarios (predefined + custom)
'scenarios_version' - Version tracking for predefined scenarios
'scenarioRuns' - History of scenario executions
```

### Scenario Interface
```typescript
interface Scenario {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  factorChanges: {
    equity?: number;     // Percentage change
    rates?: number;      // Basis points change
    credit?: number;     // Basis points change
    fx?: number;         // Percentage change
    commodity?: number;  // Percentage change
  };
  isCustom?: boolean;    // true for custom scenarios
}
```

### Factor Application Logic
- **Equity Assets**: Respond to `equity` factor changes
- **Bond Assets**: Respond to `rates` and `credit` factor changes
- **Real Estate**: Responds to `rates` (inverse) and `equity` (partial)
- **Commodities**: Respond to `commodity` factor changes
- **Cash**: Minimal response to `fx` changes
- **Alternatives**: Respond to `equity` and `credit` (partial)

## Troubleshooting

### Common Issues & Solutions

1. **Scenario not found**: Run `scenarioService.refreshPredefinedScenarios()`
2. **Zero impact results**: Check if scenario has proper factor changes
3. **Custom scenarios missing**: Ensure proper creation and persistence
4. **Outdated scenarios**: System automatically updates on version change

### Console Logging
The system provides comprehensive logging:
- `🔍 STRESS TEST DEBUG:` - Shows calculation process
- `📋 Loaded X scenarios:` - Shows scenario loading
- `📊 ASSET CLASS BREAKDOWN:` - Shows impact calculations
- `💰 TOTAL IMPACT:` - Shows final results

## Migration & Updates

When predefined scenarios are updated:
1. System detects version change
2. Preserves existing custom scenarios
3. Updates predefined scenarios
4. Merges both sets seamlessly
5. No data loss occurs

## Best Practices

1. **Always use `getScenarios()`** for UI scenario lists
2. **Check scenario existence** before running stress tests
3. **Use debug functions** for troubleshooting
4. **Version your custom scenarios** for better tracking
5. **Test stress calculations** after major changes

## Future Enhancements

Planned improvements:
- [ ] Scenario categories and tagging
- [ ] Scenario sharing and export
- [ ] Historical scenario performance tracking
- [ ] Advanced factor correlation modeling
- [ ] Scenario templates and wizards 
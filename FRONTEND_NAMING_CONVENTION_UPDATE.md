# Frontend Naming Convention Update

## Overview

This document outlines the implementation of a new frontend naming convention system that displays human-readable names instead of technical IDs while keeping backend IDs unchanged.

## Problem Solved

**Before**: The frontend was sometimes displaying technical IDs like `'TMPL0001'` or `'c3d4e5f6-g7h8-9012-cdef-345678901234'` instead of user-friendly names.

**After**: The frontend now consistently displays human-readable names like `'2008 Financial Crisis'` and `'Income Portfolio'` while maintaining technical IDs in the backend.

## Architecture

### 1. **Display Name Service** (`client/src/services/displayNameService.ts`)

A centralized service that maps between technical IDs and display names:

```typescript
// Get portfolio display name
const portfolioName = await displayNameService.getPortfolioDisplayName(portfolioId);
// Returns: "Income Portfolio" instead of "c3d4e5f6-g7h8-9012-cdef-345678901234"

// Get scenario display name
const scenarioName = await displayNameService.getScenarioDisplayName(scenarioId);
// Returns: "2008 Financial Crisis" instead of "TMPL0001"
```

**Key Features:**
- **Caching**: Reduces redundant API calls
- **Batch operations**: Load multiple names efficiently
- **Fallback handling**: Shows ID if name lookup fails
- **Cache management**: Clear/refresh cached names

### 2. **React Hooks** (`client/src/hooks/useDisplayNames.tsx`)

Convenient hooks for components to use display names:

```typescript
// Single name hooks
const { name: portfolioName, loading } = usePortfolioDisplayName(portfolioId);
const { name: scenarioName, loading } = useScenarioDisplayName(scenarioId);

// Combined stress test name
const { name: stressTestName, loading } = useStressTestDisplayName(scenarioId, portfolioId);
// Returns: "2008 Financial Crisis on Income Portfolio"

// Bulk operations hook
const { getPortfolioName, getScenarioName, preloadNames } = useDisplayNames();
```

### 3. **Enhanced Stress Test Service** (`client/src/services/structuredStressTestService.ts`)

The structured stress test service now automatically enhances results with proper display names:

```typescript
// Before
const results = await structuredStressTestService.runStressTest(scenarioId, portfolioId);
// results.metadata.scenarioName might be "TMPL0001"

// After
const results = await structuredStressTestService.runStressTest(scenarioId, portfolioId);
// results.metadata.scenarioName is "2008 Financial Crisis"
```

### 4. **Updated Components**

#### Stress Test Results Popup (`client/src/components/stress-test/StressTestResultsPopup.tsx`)

- Now uses display names from the service
- Shows proper scenario and portfolio names
- Includes fallback handling for failed lookups

#### Example Scenario List Item (`client/src/components/scenarios/ScenarioListItem.tsx`)

- Demonstrates proper usage of display name hooks
- Shows loading states while fetching names
- Includes severity indicators and categories

## Implementation Details

### Backend ID Mapping

The system maintains these ID mappings:

**Portfolios:**
- Backend ID: `'c3d4e5f6-g7h8-9012-cdef-345678901234'`
- Display Name: `'Income Portfolio'`

**Scenarios:**
- Backend ID: `'TMPL0001'`
- Display Name: `'2008 Financial Crisis'`

**Stress Tests:**
- Backend IDs: `'TMPL0001'` + `'c3d4e5f6-g7h8-9012-cdef-345678901234'`
- Display Name: `'2008 Financial Crisis on Income Portfolio'`

### Data Flow

1. **API Calls**: Continue using technical IDs
2. **Display Name Resolution**: Convert IDs to names using the service
3. **Component Rendering**: Display human-readable names
4. **User Interactions**: Use technical IDs for backend operations

## Usage Examples

### Basic Component Usage

```typescript
import { useScenarioDisplayName } from '../hooks/useDisplayNames';

const MyComponent = ({ scenarioId }) => {
  const { name: scenarioName, loading } = useScenarioDisplayName(scenarioId);
  
  return (
    <Text>{loading ? 'Loading...' : scenarioName}</Text>
  );
};
```

### Bulk Name Loading

```typescript
import { useDisplayNames } from '../hooks/useDisplayNames';

const MyListComponent = ({ scenarioIds, portfolioIds }) => {
  const { preloadNames, scenarioNames, portfolioNames } = useDisplayNames();
  
  useEffect(() => {
    preloadNames(portfolioIds, scenarioIds);
  }, [scenarioIds, portfolioIds]);
  
  return (
    <FlatList
      data={scenarioIds}
      renderItem={({ item }) => (
        <Text>{scenarioNames[item] || item}</Text>
      )}
    />
  );
};
```

### Manual Service Usage

```typescript
import displayNameService from '../services/displayNameService';

const handleStressTest = async (scenarioId, portfolioId) => {
  // Get display names for UI
  const scenarioName = await displayNameService.getScenarioDisplayName(scenarioId);
  const portfolioName = await displayNameService.getPortfolioDisplayName(portfolioId);
  
  // Show user-friendly confirmation
  Alert.alert(
    'Confirm Stress Test',
    `Run "${scenarioName}" on "${portfolioName}"?`,
    [
      { text: 'Cancel' },
      { text: 'Run', onPress: () => runStressTest(scenarioId, portfolioId) }
    ]
  );
};
```

## Benefits

1. **User Experience**: Users see meaningful names instead of technical IDs
2. **Consistency**: Centralized name resolution across the app
3. **Performance**: Caching reduces redundant API calls
4. **Maintainability**: Easy to update naming logic in one place
5. **Backward Compatibility**: Backend APIs remain unchanged

## Migration Guide

### For New Components

1. Import the appropriate hook:
```typescript
import { useScenarioDisplayName } from '../hooks/useDisplayNames';
```

2. Use the hook in your component:
```typescript
const { name, loading } = useScenarioDisplayName(scenarioId);
```

3. Display the name:
```typescript
<Text>{loading ? 'Loading...' : name}</Text>
```

### For Existing Components

1. Replace direct ID display with name resolution:
```typescript
// Before
<Text>{scenarioId}</Text>

// After  
const { name } = useScenarioDisplayName(scenarioId);
<Text>{name}</Text>
```

2. For complex scenarios, use the service directly:
```typescript
// Before
const displayText = `${scenarioId} on ${portfolioId}`;

// After
const displayText = await displayNameService.formatStressTestDisplayName(scenarioId, portfolioId);
```

## Testing

The system includes comprehensive error handling:

- **Network failures**: Falls back to showing IDs
- **Invalid IDs**: Returns the original ID as fallback
- **Cache misses**: Automatically fetches and caches names
- **Service unavailable**: Gracefully degrades to ID display

## Future Enhancements

1. **Internationalization**: Support for multiple languages
2. **Custom naming**: Allow users to set custom display names
3. **Name validation**: Prevent duplicate or invalid names
4. **Advanced caching**: Implement TTL and cache invalidation
5. **Name history**: Track name changes over time

## Conclusion

The frontend naming convention update ensures users always see meaningful, human-readable names throughout the application while maintaining the integrity of backend systems. The implementation is robust, performant, and easy to maintain. 
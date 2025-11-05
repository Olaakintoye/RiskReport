# Infinite Loop Fix - useEffect Maximum Update Depth Error

## Problem
The app was experiencing a "Maximum update depth exceeded" error caused by infinite re-render loops in React hooks, specifically in `useLiveMarketData.ts` and `useAutoRefresh.ts`.

## Root Cause
The infinite loops were caused by circular dependencies in `useEffect` hooks:

1. **useLiveMarketData.ts**: The `startLiveUpdates` and `toggleLiveUpdates` callbacks depended on `state.isLive`, and the effects that called these functions also watched `state.isLive`, creating a feedback loop.

2. **useAutoRefresh.ts**: The callbacks (`startRefresh`, `stopRefresh`, `handleAppStateChange`) were included in the useEffect dependency arrays, causing them to recreate on every render and trigger the effects repeatedly.

## Solution

### 1. Fixed `useLiveMarketData.ts`

**Changes:**
- Removed `state.isLive` dependency from `startLiveUpdates` - now uses `intervalRef.current` to check if already running
- Changed `toggleLiveUpdates` to check `intervalRef.current` instead of `state.isLive` 
- Fixed useEffect dependency arrays to prevent circular updates
- Used `useRef` to track the last interval value to avoid unnecessary restarts
- Added guard checks to prevent multiple intervals from running simultaneously

**Key fixes:**
```typescript
// Before: Depended on state.isLive (causes loop)
const startLiveUpdates = useCallback(() => {
  if (state.isLive) return;
  // ...
}, [state.isLive]);

// After: Uses ref to check if running
const startLiveUpdates = useCallback(() => {
  if (intervalRef.current) {
    console.log('🔄 Updates already running');
    return;
  }
  // ...
}, [refreshInterval, fetchMarketData]);
```

### 2. Fixed `useAutoRefresh.ts`

**Changes:**
- Used refs to store callback dependencies (`onRefreshRef`, `intervalRefValue`, `respectMarketHoursRef`)
- Updated refs in a separate useEffect when props change
- Made `startRefresh`, `stopRefresh`, and `handleAppStateChange` stable callbacks with empty dependency arrays
- Accessed latest values through refs instead of closures
- Simplified useEffect dependency array to only include stable dependencies

**Key fixes:**
```typescript
// Store callbacks and values in refs
const onRefreshRef = useRef(onRefresh);
const intervalRefValue = useRef(interval);
const respectMarketHoursRef = useRef(respectMarketHours);

// Update refs when props change
useEffect(() => {
  onRefreshRef.current = onRefresh;
  intervalRefValue.current = interval;
  respectMarketHoursRef.current = respectMarketHours;
}, [onRefresh, interval, respectMarketHours]);

// Use refs instead of closures
const startRefresh = useCallback(() => {
  intervalRef.current = setInterval(() => {
    onRefreshRef.current(); // Use ref instead of closure
  }, intervalRefValue.current);
}, []); // Empty deps - stable callback
```

## Benefits

✅ No more infinite render loops  
✅ Callbacks remain stable across renders  
✅ Latest values always used through refs  
✅ Performance improved (less unnecessary re-renders)  
✅ Proper cleanup on unmount  

## Testing

After this fix:
- App should load without crashes
- No "Maximum update depth exceeded" errors
- Auto-refresh functionality should work correctly
- Components should not re-render excessively

## Technical Details

The fix follows the React pattern of using `useRef` to store mutable values that should persist across renders but don't need to trigger re-renders when they change. This breaks the circular dependency chain that was causing the infinite loops.


# Testing Instructions - Portfolio User Mapping Fix

## Issue Found

The problem was in the `getPortfolios()` function logic:
- **Old behavior**: If Supabase returned empty array (new user with no portfolios), it fell back to AsyncStorage
- **New behavior**: If user is authenticated, ALWAYS use Supabase (even if empty)

## Changes Made

### File: `client/src/services/portfolioService.ts`

1. **Fixed `getPortfolios()` function** (line 419-446)
   - Now checks if user is authenticated FIRST
   - If authenticated: Returns Supabase data (even if empty array)
   - If not authenticated: Falls back to AsyncStorage (offline mode)

2. **Added `clearPortfolioCache()` function** (line 404-411)
   - Clears AsyncStorage cache
   - Useful when switching users or testing

## Testing Steps

### Option 1: Quick Test (Recommended)

1. **Reload the app** (close completely and restart)
2. **Log out** of the "test3" user
3. **Log back in** as "test3"
4. **Check portfolios** - should now be empty

The fix ensures authenticated users always get data from Supabase, not cached AsyncStorage.

### Option 2: Manual Cache Clear (If Option 1 doesn't work)

If you still see other users' portfolios, you need to clear the AsyncStorage cache:

#### For React Native (Mobile):

Add this temporary code to clear cache:

```typescript
// Add to your login screen or auth service after successful login
import portfolioService from './services/portfolioService';

// After user logs in
await portfolioService.clearPortfolioCache();
```

#### For Web:

Open browser console and run:
```javascript
localStorage.removeItem('portfolios');
```

Then refresh the app.

### Option 3: Clear All App Data

#### iOS Simulator:
```bash
# Fully reset the app
xcrun simctl uninstall booted <your-bundle-id>
# Then reinstall the app
```

#### Android Emulator:
```bash
# Clear app data
adb shell pm clear <your-package-name>
```

#### Web:
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
```

## Verification Checklist

After applying the fix and restarting:

### Test 1: New User (test3)
- [ ] Log in as "test3"
- [ ] Portfolio list should be **EMPTY**
- [ ] No sample portfolios visible
- [ ] Can create new portfolio
- [ ] Created portfolio only visible to test3

### Test 2: Existing User
- [ ] Log out and log in as original user
- [ ] Should see only THEIR portfolios
- [ ] Should NOT see test3's portfolios

### Test 3: User Isolation
- [ ] Create portfolio as User A
- [ ] Log out and log in as User B
- [ ] User B should NOT see User A's portfolio
- [ ] Each user sees only their own data

## Console Logs to Watch For

When the fix is working correctly, you'll see these logs:

```
[PortfolioService] Authenticated user detected, loading from Supabase
[PortfolioService] Loading portfolios for user: <user-id>
[PortfolioService] Loaded 0 portfolios from Supabase  // For new user
```

NOT:
```
[PortfolioService] No authenticated user, falling back to AsyncStorage
```

## If Still Seeing Issues

1. **Check Authentication**:
   - Ensure user is actually logged in
   - Verify JWT token is valid
   - Check Supabase auth status

2. **Check RLS Policies**:
   - Run `analyze-portfolio-data.sql` again
   - Verify RLS is enabled
   - Check policies are active

3. **Check Console Logs**:
   - Look for auth errors
   - Look for Supabase query errors
   - Check which branch of code is executing

4. **Force Clear Cache**:
   - Use `clearPortfolioCache()` function
   - Or manually clear AsyncStorage/localStorage

## Expected Behavior After Fix

### Authenticated User Flow:
```
User logs in
  ↓
getPortfolios() called
  ↓
Checks auth: User IS authenticated
  ↓
Calls loadPortfoliosFromSupabase()
  ↓
Queries Supabase with user_id filter
  ↓
RLS policies apply: WHERE user_id = auth.uid()
  ↓
Returns user's portfolios ONLY (or empty array)
  ↓
Caches in AsyncStorage
  ↓
Displays to user
```

### Not Authenticated Flow:
```
User not logged in (offline mode)
  ↓
getPortfolios() called
  ↓
Checks auth: User NOT authenticated
  ↓
Falls back to AsyncStorage
  ↓
Returns cached portfolios
  ↓
Displays to user
```

## Summary

The key fix was changing the logic from:
```typescript
// OLD - WRONG
const supabasePortfolios = await loadPortfoliosFromSupabase();
if (supabasePortfolios.length > 0) {  // ❌ Problem: empty array = false
  return supabasePortfolios;
}
// Falls back to AsyncStorage even for authenticated users with no portfolios
```

To:
```typescript
// NEW - CORRECT
if (!userError && user) {  // ✅ Check authentication first
  const supabasePortfolios = await loadPortfoliosFromSupabase();
  return supabasePortfolios;  // ✅ Return even if empty array
}
// Only falls back to AsyncStorage for non-authenticated users
```

This ensures new authenticated users see an empty list instead of cached sample data!


# Real-time Enhancement - Quick Start

## 🚀 Deploy in 3 Commands

### 1. Apply Database Changes

```bash
./apply-realtime-migration.sh
```

**Or manually**: Copy `supabase/migrations/20250928000003_realtime_enhancements.sql` into Supabase SQL Editor and run.

### 2. Rebuild App

```bash
cd client && npm install && npx expo start --clear
```

### 3. Test Market Data

```bash
./sync-market-data.sh test
```

## ✅ Verify It's Working

### Check Database

```sql
-- Should show your portfolios with sync info
SELECT * FROM portfolio_sync_status;

-- Should show market data coverage
SELECT * FROM market_data_coverage;
```

### Check App

1. Create portfolio in app
2. Verify in Supabase: `SELECT * FROM portfolio_sync_status WHERE name = 'Your Portfolio';`
3. Should show `last_sync_time` and position_count

## 🎯 What You Get

**Automatic Price Updates**:
- Update market_data_cache → All positions auto-update
- No manual sync needed
- Real-time UI updates

**Sync Tracking**:
- Know when each portfolio was last synced
- See which prices are stale
- Monitor data freshness

**Helper Functions**:
- `get_stale_symbols()` - Find outdated prices
- `refresh_portfolio_prices()` - Refresh from cache
- `batch_update_market_data()` - Bulk updates

## 📚 Full Documentation

- **Implementation Details**: `REALTIME_IMPLEMENTATION_COMPLETE.md`
- **Usage Guide**: `REALTIME_SYNC_GUIDE.md`
- **Migration SQL**: `supabase/migrations/20250928000003_realtime_enhancements.sql`

## 🔧 Common Commands

```bash
# Sync all symbols from portfolios
./sync-market-data.sh all

# Sync specific symbols
./sync-market-data.sh symbols AAPL MSFT GOOGL

# Show current market data
./sync-market-data.sh show

# Get help
./sync-market-data.sh help
```

## 💡 Key Points

1. **Migration First**: Apply database changes before rebuilding app
2. **Rebuild Required**: App needs rebuild to include timestamp tracking
3. **Automatic**: Once set up, everything syncs automatically
4. **Monitoring**: Use `portfolio_sync_status` view to monitor

## ⏱️ Time: ~13 minutes total

That's it! Your portfolios now auto-sync with real-time market data.


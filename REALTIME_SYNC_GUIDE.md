# Real-time Data Sync Guide

## Overview

This guide explains how the real-time data synchronization system works for your VaR calculation platform. The system automatically keeps portfolio positions updated with the latest market prices.

## Architecture

```
Market Data Source (yfinance/Tiingo)
           ↓
    market_data_cache table (Supabase)
           ↓
    Automatic Trigger (update_positions_from_market_data)
           ↓
    positions table updated
           ↓
    portfolio total_value recalculated
           ↓
    Real-time UI updates via Supabase Realtime
```

## Key Components

### 1. Database Schema Enhancements

**portfolios table** - New columns:
- `last_sync_time` - When portfolio was last synced from mobile app
- `is_realtime_enabled` - Enable/disable automatic price updates
- `last_price_update` - Most recent price update for any position

**positions table** - New columns:
- `last_price_update` - When this position's price was last fetched
- `price_source` - Source of price (manual, yfinance, tiingo, api, sync)

### 2. Automatic Price Updates

When market data is updated in `market_data_cache`:
1. Trigger `sync_position_prices` fires
2. Updates all matching positions' `last_price` and `last_price_update`
3. Sets `price_source` to 'api'
4. Cascades to update portfolio `total_value` (existing trigger)

### 3. Helper Functions

**`get_stale_symbols(portfolio_id, max_age_minutes)`**
- Returns positions with outdated prices
- Default: prices older than 5 minutes

**`refresh_portfolio_prices(portfolio_id)`**
- Updates all position prices from market_data_cache
- Returns list of updated positions with old/new prices

**`batch_update_market_data(symbols[], prices[], ...)`**
- Efficiently updates multiple symbols at once
- Used by backend services

**`get_user_symbols(user_id)`**
- Returns all unique symbols across user's portfolios
- Useful for bulk market data fetching

### 4. Monitoring Views

**`portfolio_sync_status`**
- Shows last sync time for each portfolio
- Indicates if prices need refresh
- Provides sync status: 'current', 'outdated', 'stale', 'never_synced'

**`market_data_coverage`**
- Shows which symbols have cached market data
- Indicates cache freshness: 'fresh', 'outdated', 'stale', 'no_cache'

## Setup Instructions

### Step 1: Apply Database Migration

```bash
chmod +x apply-realtime-migration.sh
./apply-realtime-migration.sh
```

**Or manually:**
1. Open: https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp/sql/new
2. Copy contents of `supabase/migrations/20250928000003_realtime_enhancements.sql`
3. Paste and click "Run"

### Step 2: Verify Migration

```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'portfolios' 
  AND column_name IN ('last_sync_time', 'is_realtime_enabled', 'last_price_update');

-- Check views exist
SELECT * FROM portfolio_sync_status LIMIT 5;
SELECT * FROM market_data_coverage LIMIT 5;
```

### Step 3: Rebuild Mobile App

The sync service now tracks timestamps automatically:

```bash
cd client
npm install
npx expo start --clear
```

## Usage

### Syncing Market Data

**Option 1: Using the Script**

```bash
chmod +x sync-market-data.sh

# Sync all symbols from portfolios
./sync-market-data.sh all

# Sync specific symbols
./sync-market-data.sh symbols AAPL MSFT GOOGL

# Test with sample symbols
./sync-market-data.sh test

# Show current market data
./sync-market-data.sh show
```

**Option 2: Direct API Call**

```bash
# Update single symbol
curl -X POST \
  "https://qlyqxlzlxdqboxpxpdjp.supabase.co/rest/v1/market_data_cache" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "symbol": "AAPL",
    "last_price": 175.50,
    "price_change": 2.30,
    "price_change_pct": 1.33,
    "volume": 50000000,
    "currency": "USD"
  }'
```

### Checking Sync Status

**In SQL:**

```sql
-- Portfolio sync status
SELECT * FROM portfolio_sync_status
WHERE user_id = 'your-user-id'
ORDER BY needs_price_refresh DESC, last_sync_time ASC;

-- Find portfolios needing price refresh
SELECT id, name, oldest_price_update, sync_status
FROM portfolio_sync_status
WHERE needs_price_refresh = TRUE;

-- Market data coverage
SELECT * FROM market_data_coverage
WHERE cache_status IN ('stale', 'no_cache');
```

**Via API:**

```bash
# Get sync status
curl "https://qlyqxlzlxdqboxpxpdjp.supabase.co/rest/v1/portfolio_sync_status?select=*" \
  -H "apikey: YOUR_KEY" \
  -H "Authorization: Bearer YOUR_KEY"
```

### Refreshing Portfolio Prices

**SQL Function:**

```sql
-- Get symbols that need refresh
SELECT * FROM get_stale_symbols('portfolio-id', 5);

-- Refresh portfolio prices from cache
SELECT * FROM refresh_portfolio_prices('portfolio-id');
```

**Python (Risk Engine):**

```python
from services.supabase_io import SupabaseService

supabase = SupabaseService()

# Get stale symbols
stale = await supabase.get_stale_symbols(
    portfolio_id='abc-123',
    max_age_minutes=5
)

# Refresh prices
result = await supabase.refresh_portfolio_prices(
    portfolio_id='abc-123'
)
print(f"Updated {result['updated_count']} positions")
```

**TypeScript (Client):**

```typescript
import { supabase } from '@/lib/supabase';

// Get stale symbols
const { data: staleSymbols } = await supabase.rpc('get_stale_symbols', {
  p_portfolio_id: portfolioId,
  p_max_age_minutes: 5
});

// Refresh prices
const { data: refreshed } = await supabase.rpc('refresh_portfolio_prices', {
  p_portfolio_id: portfolioId
});
```

## Automatic Updates Flow

### When User Syncs Portfolio from App

```
1. User creates/updates portfolio in app
2. portfolioService.createPortfolio() called
3. supabaseSync.syncPortfolioToSupabase() called
4. Upsert portfolio with last_sync_time = NOW()
5. Insert positions with last_price_update = NOW(), price_source = 'sync'
6. Trigger updates portfolio total_value
7. Done! ✅
```

### When Market Data is Updated

```
1. Market data script runs: ./sync-market-data.sh all
2. Fetches prices from yfinance/Tiingo
3. Upserts into market_data_cache
4. Trigger sync_position_prices fires automatically
5. Updates matching positions' last_price, last_price_update
6. Cascade trigger updates portfolio total_value
7. Supabase Realtime pushes updates to connected clients
8. UI shows updated prices in real-time! ✅
```

## Monitoring & Debugging

### Check Position Price Sources

```sql
SELECT 
  symbol,
  price_source,
  COUNT(*) as count,
  MIN(last_price_update) as oldest,
  MAX(last_price_update) as newest
FROM positions
GROUP BY symbol, price_source
ORDER BY symbol;
```

### Find Outdated Positions

```sql
SELECT 
  p.name as portfolio,
  pos.symbol,
  pos.last_price,
  pos.last_price_update,
  NOW() - pos.last_price_update as age
FROM positions pos
JOIN portfolios p ON p.id = pos.portfolio_id
WHERE pos.last_price_update < NOW() - INTERVAL '5 minutes'
ORDER BY pos.last_price_update ASC;
```

### Market Data Cache Status

```sql
SELECT 
  symbol,
  last_price,
  last_updated,
  NOW() - last_updated as age,
  CASE
    WHEN last_updated > NOW() - INTERVAL '1 minute' THEN 'fresh'
    WHEN last_updated > NOW() - INTERVAL '5 minutes' THEN 'ok'
    WHEN last_updated > NOW() - INTERVAL '15 minutes' THEN 'stale'
    ELSE 'very_stale'
  END as status
FROM market_data_cache
ORDER BY last_updated DESC;
```

### Trigger Execution Log

```sql
-- Count position updates from triggers today
SELECT 
  DATE_TRUNC('hour', updated_at) as hour,
  price_source,
  COUNT(*) as updates
FROM positions
WHERE updated_at > CURRENT_DATE
  AND price_source = 'api'
GROUP BY DATE_TRUNC('hour', updated_at), price_source
ORDER BY hour DESC;
```

## Performance Optimization

### Batch Updates

For best performance, update market data in batches:

```python
# Good: Batch update
market_data = [
    {"symbol": "AAPL", "last_price": 175.50},
    {"symbol": "MSFT", "last_price": 380.00},
    {"symbol": "GOOGL", "last_price": 140.50}
]
await supabase.batch_update_market_data(market_data)

# Less efficient: Individual updates
for data in market_data:
    await supabase.update_market_data(data["symbol"], data)
```

### Scheduled Updates

Set up cron job or scheduled task:

```bash
# Every 5 minutes during market hours (9:30 AM - 4:00 PM ET)
*/5 9-16 * * 1-5 /path/to/sync-market-data.sh all >> /var/log/market-sync.log 2>&1
```

### Rate Limiting

The sync script includes rate limiting:

```bash
# Sleeps 0.5s between each symbol
# For 100 symbols = ~50 seconds total
```

## Troubleshooting

### Issue: Positions not updating automatically

**Check:**
1. Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'sync_position_prices';`
2. Check market_data_cache has recent data: `SELECT * FROM market_data_cache ORDER BY last_updated DESC LIMIT 10;`
3. Verify symbol matching: positions.symbol must exactly match market_data_cache.symbol

**Fix:**
```sql
-- Manually trigger update
UPDATE positions 
SET last_price = (SELECT last_price FROM market_data_cache WHERE symbol = positions.symbol LIMIT 1)
WHERE symbol IN (SELECT symbol FROM market_data_cache);
```

### Issue: Sync script failing

**Check:**
1. Python3 installed: `python3 --version`
2. yfinance installed: `pip3 install yfinance`
3. jq installed: `brew install jq` (Mac) or `apt install jq` (Linux)

**Fix:**
```bash
# Install dependencies
pip3 install yfinance pandas
brew install jq  # or apt install jq
```

### Issue: Timestamps not updating

**Check:**
1. Client sync service updated: grep for 'last_sync_time' in `client/src/services/supabaseSync.ts`
2. Columns exist: Check Step 2 verification queries above

**Fix:**
```bash
# Rebuild client app
cd client
npm install
npx expo start --clear
```

## Best Practices

1. **Enable real-time selectively**: Set `is_realtime_enabled = FALSE` for archived portfolios
2. **Monitor cache coverage**: Regularly check `market_data_coverage` view
3. **Batch updates**: Use batch functions for multiple symbols
4. **Rate limit external APIs**: Respect yfinance/Tiingo rate limits
5. **Log sync operations**: Monitor sync frequency and success rates
6. **Handle market closures**: Different logic for pre-market, market hours, after-hours
7. **Cache historical data**: Store intraday prices for analysis

## API Endpoints

The following endpoints are now available:

### Get Portfolio Sync Status

```
GET /rest/v1/portfolio_sync_status?user_id=eq.{user-id}
```

### Get Stale Symbols

```
POST /rest/v1/rpc/get_stale_symbols
Body: {"p_portfolio_id": "uuid", "p_max_age_minutes": 5}
```

### Refresh Portfolio Prices

```
POST /rest/v1/rpc/refresh_portfolio_prices
Body: {"p_portfolio_id": "uuid"}
```

### Batch Update Market Data

```
POST /rest/v1/rpc/batch_update_market_data
Body: {
  "p_symbols": ["AAPL", "MSFT"],
  "p_prices": [175.50, 380.00],
  "p_price_changes": [2.30, -1.50],
  "p_price_change_pcts": [1.33, -0.39]
}
```

## Support

For issues or questions:
1. Check logs: `railway logs` for backend, React Native debugger for frontend
2. Verify database state: Use SQL queries above
3. Review migration: Check `supabase/migrations/20250928000003_realtime_enhancements.sql`
4. Test manually: Use `./sync-market-data.sh test`

## Next Steps

1. Apply the migration: `./apply-realtime-migration.sh`
2. Rebuild the app: `cd client && npm install && npx expo start --clear`
3. Test sync: Create portfolio, check `portfolio_sync_status` view
4. Sync market data: `./sync-market-data.sh test`
5. Verify auto-update: Check position prices updated automatically
6. Set up cron: Schedule regular market data updates

---

**Status**: ✅ Real-time sync system ready for production use!


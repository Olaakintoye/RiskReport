# VaR Charts Display and Database Storage - Implementation Complete

## Overview

This implementation adds chart image storage in Supabase Storage, saves VaR results to the database, and provides history tracking with a frontend display showing the last 5 analyses.

## What Was Implemented

### Part 1: Backend - Chart Generation with Base64 Encoding

**Files Modified:**
- `risk_engine/var_models/Parametric.py`
- `risk_engine/var_models/Historical.py`
- `risk_engine/var_models/MonteCarlo.py`

**Changes:**
- Added `base64` and `BytesIO` imports
- Modified `calculate_var()` functions to:
  - Generate matplotlib charts
  - Save charts to BytesIO buffer
  - Encode as base64 string
  - Return `chart_base64` in results
  - Keep file saving for Railway filesystem backup
  - Added `cvar_percentage` to results

### Part 2: Backend - Storage Upload and Result Saving

**Files Modified:**
- `risk_engine/services/supabase_io.py`
- `risk_engine/app_wrapper.py`

**New Methods in supabase_io.py:**
- `upload_chart_to_storage()`: Uploads base64 chart to Supabase Storage bucket `var-charts/`
- `save_var_result()`: Saves VaR analysis results to `results` table
- `get_var_history()`: Retrieves last N VaR results for a portfolio

**Changes in app_wrapper.py:**
- Added `/images/{filename}` endpoint to serve PNG files from filesystem
- Updated `/api/run-var` endpoint to:
  - Extract `chart_base64` from calculation results
  - Upload chart to Supabase Storage
  - Save result to database
  - Return both `chartUrl` (Supabase) and `chartBase64` (immediate display)

### Part 3: Database Schema

**New Files:**
- `supabase/migrations/20250928000005_enhance_results_table.sql`
- `supabase/create-var-charts-bucket.sql`

**Database Changes:**
- Added columns to `results` table:
  - `var_percentage NUMERIC`
  - `cvar_percentage NUMERIC`
  - `portfolio_value NUMERIC`
  - `chart_storage_url TEXT`
  - `chart_base64 TEXT`
  - `parameters JSONB`
- Created indexes for efficient history queries
- Created `var_results_with_portfolio` view
- Set up RLS policies for secure access
- Created `var-charts` storage bucket with RLS policies

### Part 4: Frontend - Chart Display

**Files Modified:**
- `client/src/pages/risk-report/redesigned/RiskReportScreen.tsx`

**Changes:**
- Updated chart URL handling to prioritize base64 for immediate display
- Falls back to Supabase Storage URL
- Format: `data:image/png;base64,${response.chartBase64}`

**New File:**
- `client/src/services/varHistoryService.ts`

**Functions:**
- `getVarHistory()`: Fetch last N results from Supabase
- `getVarResult()`: Fetch single result by ID
- `getVarHistoryWithPortfolio()`: Fetch with portfolio info
- `cleanupOldResults()`: Delete old results (keep last N)

### Part 5: Deployment Scripts

**New Files:**
- `apply-var-storage-migration.sh`: Interactive script to apply migrations

## How It Works

### 1. VaR Calculation Flow

```
User triggers VaR analysis
  ↓
Frontend calls /api/run-var with portfolio data
  ↓
Backend calculates VaR using Python models
  ↓
Chart generated and encoded as base64
  ↓
Chart saved to filesystem (parametric_var.png, etc.)
  ↓
Base64 chart uploaded to Supabase Storage (var-charts/user_id/portfolio_id/method_timestamp.png)
  ↓
Result saved to database (results table)
  ↓
Response returns:
  - chartBase64: for immediate display
  - chartUrl: Supabase Storage URL for persistence
  - results: VaR calculations
  ↓
Frontend displays chart immediately using base64
```

### 2. Chart Storage Structure

**Supabase Storage Path:**
```
var-charts/
  └── {user_id}/
      └── {portfolio_id}/
          ├── parametric_20250110_143022.png
          ├── historical_20250110_143045.png
          └── monte_carlo_20250110_143108.png
```

### 3. Database Storage

**Results Table Schema:**
```sql
results (
  id UUID PRIMARY KEY,
  portfolio_id UUID,
  calc_type TEXT,              -- 'parametric', 'historical', 'monte_carlo'
  confidence NUMERIC,
  horizon_days INTEGER,
  var_amount NUMERIC,
  var_percentage NUMERIC,      -- NEW
  es_amount NUMERIC,            -- CVaR
  cvar_percentage NUMERIC,     -- NEW
  portfolio_value NUMERIC,     -- NEW
  chart_storage_url TEXT,      -- NEW: Supabase Storage URL
  chart_base64 TEXT,           -- NEW: Temporary base64 (can be NULL)
  parameters JSONB,            -- NEW: Full analysis parameters
  created_at TIMESTAMPTZ
)
```

## Setup Instructions

### 1. Apply Database Migration

```bash
./apply-var-storage-migration.sh
```

Or manually run SQL in Supabase SQL Editor:
- `supabase/migrations/20250928000005_enhance_results_table.sql`
- `supabase/create-var-charts-bucket.sql`

### 2. Create Storage Bucket

**Option A: Supabase Dashboard (Recommended)**
1. Go to Storage → Buckets
2. Click "New bucket"
3. Name: `var-charts`
4. Make it public: ✓
5. Create bucket

**Option B: SQL**
Run the SQL from `supabase/create-var-charts-bucket.sql`

### 3. Verify Environment Variables

Backend (`risk_engine/.env`):
```bash
SUPABASE_URL=https://qlyqxlzlxdqboxpxpdjp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Frontend (`client/.env`):
```bash
EXPO_PUBLIC_SUPABASE_URL=https://qlyqxlzlxdqboxpxpdjp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Redeploy Backend

```bash
cd risk_engine
railway up
```

Or use the existing Railway deployment (it will auto-deploy from git).

### 5. Rebuild Mobile App

```bash
cd client
npm install
npx expo start --clear
```

## Testing Checklist

- [ ] Run VaR analysis in mobile app
- [ ] Verify chart displays immediately (base64)
- [ ] Check Supabase Storage for uploaded chart image
- [ ] Verify result saved to `results` table with all fields
- [ ] Query: `SELECT * FROM results ORDER BY created_at DESC LIMIT 5;`
- [ ] Run multiple analyses
- [ ] Confirm history shows last 5 results
- [ ] Test with different VaR methods (parametric, historical, monte_carlo)
- [ ] Verify chart URLs work from Supabase Storage
- [ ] Test `/images/{filename}` endpoint as fallback

## API Response Format

**Before:**
```json
{
  "success": true,
  "results": {
    "var": 5667.27,
    "cvar": 6532.12,
    "var_percentage": 8.31,
    "portfolio_value": 68219.21
  },
  "chartUrl": "",
  "method": "monte_carlo"
}
```

**After:**
```json
{
  "success": true,
  "results": {
    "var": 5667.27,
    "cvar": 6532.12,
    "var_percentage": 8.31,
    "cvar_percentage": 9.57,
    "portfolio_value": 68219.21
  },
  "chartUrl": "https://qlyqxlzlxdqboxpxpdjp.supabase.co/storage/v1/object/public/var-charts/user123/portfolio456/monte_carlo_20250110_143108.png",
  "chartBase64": "iVBORw0KGgoAAAANSUhEUgAAAlgAAAH...",
  "method": "monte_carlo"
}
```

## Frontend Usage

### Get VaR History

```typescript
import { getVarHistory } from '@/services/varHistoryService';

const history = await getVarHistory(portfolioId, 5);
// Returns last 5 VaR analyses for the portfolio
```

### Display Chart

```typescript
// Chart displays immediately using base64
<Image source={{ uri: `data:image/png;base64,${chartBase64}` }} />

// Or use Supabase Storage URL for persistence
<Image source={{ uri: chartStorageUrl }} />
```

## Benefits

1. **Immediate Display**: Charts show instantly using base64
2. **Persistence**: Charts stored in Supabase for long-term access
3. **History Tracking**: All VaR analyses saved to database
4. **Efficient Queries**: Indexed for fast history retrieval
5. **User Organization**: Charts organized by user_id/portfolio_id
6. **Fallback Options**: Multiple ways to access charts
7. **Security**: RLS policies ensure users only access their own data

## File Structure

```
risk_engine/
├── var_models/
│   ├── Parametric.py (✓ base64 encoding)
│   ├── Historical.py (✓ base64 encoding)
│   └── MonteCarlo.py (✓ base64 encoding)
├── services/
│   └── supabase_io.py (✓ storage + results)
└── app_wrapper.py (✓ /images/ endpoint, storage integration)

client/
└── src/
    ├── pages/risk-report/redesigned/
    │   └── RiskReportScreen.tsx (✓ base64 display)
    └── services/
        └── varHistoryService.ts (✓ NEW)

supabase/
├── migrations/
│   └── 20250928000005_enhance_results_table.sql (✓ NEW)
└── create-var-charts-bucket.sql (✓ NEW)
```

## Next Steps (Future Enhancements)

1. **VaR History Component**: Create UI to display past analyses
2. **Trend Visualization**: Chart showing VaR trends over time
3. **Comparison Tool**: Compare multiple VaR analyses side-by-side
4. **Export**: Download VaR results and charts as PDF
5. **Notifications**: Alert when VaR exceeds threshold
6. **Scheduled Analysis**: Automatic VaR calculations at intervals

## Troubleshooting

**Charts not displaying:**
- Check if `chart_base64` is in API response
- Verify Supabase Storage bucket exists and is public
- Check browser console for image load errors

**Results not saving:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in backend
- Check backend logs for upload/save errors
- Verify RLS policies allow service role to insert

**Storage upload fails:**
- Ensure `var-charts` bucket exists
- Verify bucket is public
- Check RLS policies for storage objects

## Support

For issues or questions:
1. Check backend logs: `railway logs`
2. Check frontend console: React Native debugger
3. Query database: `SELECT * FROM results ORDER BY created_at DESC;`
4. Check storage: Supabase Dashboard → Storage → var-charts


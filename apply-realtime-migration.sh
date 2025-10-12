#!/bin/bash
# Apply Real-time Enhancement Migration to Supabase
# This script applies the real-time enhancement migration using the Supabase REST API

set -e

echo "🚀 Applying Real-time Enhancement Migration to Supabase"
echo "========================================================"
echo ""

# Configuration
SUPABASE_URL="https://qlyqxlzlxdqboxpxpdjp.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDExOTA3MywiZXhwIjoyMDY1Njk1MDczfQ.Q5DzOuNAUu9591plbbtITiCfHulbg4-QYwS0uBvimuk"

MIGRATION_FILE="supabase/migrations/20250928000003_realtime_enhancements.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"
echo ""

# Read the migration SQL
MIGRATION_SQL=$(<"$MIGRATION_FILE")

echo "📊 Migration contains:"
echo "  • Schema enhancements (columns, indexes)"
echo "  • Automatic price update triggers"
echo "  • Helper functions for price refresh"
echo "  • Sync status views"
echo ""

# Ask for confirmation
read -p "Apply this migration to Supabase? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Migration cancelled"
  exit 0
fi

echo ""
echo "🔧 Applying migration via Supabase SQL API..."
echo ""

# Apply migration using Supabase REST API
# Note: We use the /rest/v1/rpc endpoint to execute SQL
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$MIGRATION_SQL" | jq -Rs .)}" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Alternative approach: Use psql if available
if command -v psql &> /dev/null; then
  echo "📝 Using psql to apply migration..."
  echo ""
  
  # Extract connection details from Supabase URL
  DB_HOST="db.qlyqxlzlxdqboxpxpdjp.supabase.co"
  DB_PORT="5432"
  DB_NAME="postgres"
  DB_USER="postgres"
  
  echo "ℹ️  To apply via psql, you need the database password."
  echo "   Get it from: https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp/settings/database"
  echo ""
  read -p "Enter database password (or press Enter to skip): " -s DB_PASSWORD
  echo ""
  echo ""
  
  if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD="$DB_PASSWORD"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
      echo ""
      echo "✅ Migration applied successfully via psql!"
      echo ""
      echo "📊 New Features Available:"
      echo "  • Portfolios now track last_sync_time"
      echo "  • Positions auto-update from market_data_cache"
      echo "  • portfolio_sync_status view for monitoring"
      echo "  • Helper functions: get_stale_symbols(), refresh_portfolio_prices()"
      echo ""
      echo "🔍 Verify with:"
      echo "  SELECT * FROM portfolio_sync_status;"
      echo "  SELECT * FROM market_data_coverage;"
      exit 0
    else
      echo "❌ Failed to apply migration via psql"
      exit 1
    fi
  fi
else
  echo "ℹ️  psql not found. Please apply migration manually."
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "📝 MANUAL APPLICATION INSTRUCTIONS"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Since automatic application isn't available, please:"
echo ""
echo "1. Open Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp/sql/new"
echo ""
echo "2. Copy the contents of:"
echo "   ${MIGRATION_FILE}"
echo ""
echo "3. Paste into SQL Editor and click 'Run'"
echo ""
echo "4. Verify with these queries:"
echo "   SELECT * FROM portfolio_sync_status;"
echo "   SELECT * FROM market_data_coverage;"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Or use this command:"
echo ""
echo "  psql 'postgresql://postgres:[YOUR-PASSWORD]@db.qlyqxlzlxdqboxpxpdjp.supabase.co:5432/postgres' -f $MIGRATION_FILE"
echo ""
echo "Get password from:"
echo "  https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp/settings/database"
echo ""


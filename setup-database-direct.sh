#!/bin/bash
# Apply migrations directly via Supabase SQL API

SUPABASE_URL="https://qlyqxlzlxdqboxpxpdjp.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDExOTA3MywiZXhwIjoyMDY1Njk1MDczfQ.Q5DzOuNAUu9591plbbtITiCfHulbg4-QYwS0uBvimuk"

echo "🔧 Setting up Supabase Database for VaR calculations"
echo "=================================================="
echo ""

# Check if tables already exist
echo "1️⃣  Checking if tables exist..."
CHECK_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/portfolios?limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

if echo "$CHECK_RESPONSE" | grep -q "relation.*does not exist"; then
  echo "   ⚠️  Tables don't exist yet - need to run migrations"
  echo ""
  echo "📝 To create tables, you have two options:"
  echo ""
  echo "Option 1: Use Supabase Dashboard (Recommended)"
  echo "   1. Go to https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp/editor/sql"
  echo "   2. Click 'New Query'"
  echo "   3. Copy the contents of: supabase/migrations/20250928000000_risk_portfolio_schema.sql"
  echo "   4. Paste and click 'Run'"
  echo "   5. Repeat for: supabase/migrations/20250928000001_row_level_security.sql"
  echo ""
  echo "Option 2: Use psql (if you have PostgreSQL client)"
  echo "   1. Get your database password from Supabase Dashboard → Settings → Database"
  echo "   2. Run: psql 'postgresql://postgres.qlyqxlzlxdqboxpxpdjp:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres' -f supabase/migrations/20250928000000_risk_portfolio_schema.sql"
  echo ""
  echo "After running migrations, run this script again to create test data."
  exit 1
elif echo "$CHECK_RESPONSE" | grep -q "apikey"; then
  echo "   ❌ Authentication error"
  exit 1
else
  echo "   ✅ Tables exist!"
  echo ""
  echo "🎯 Ready to create test portfolio!"
  echo ""
  echo "Next steps:"
  echo "   1. Run: chmod +x setup-test-portfolio.sh"
  echo "   2. Run: ./setup-test-portfolio.sh"
  echo "   3. Run: ./test-var-calculation.sh"
  echo ""
  echo "📚 See get-supabase-auth-info.md for how to get your User ID and JWT token"
fi


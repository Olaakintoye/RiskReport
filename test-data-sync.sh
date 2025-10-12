#!/bin/bash
# Test script to verify portfolio data is properly synced to Supabase

echo "🧪 Portfolio Data Sync Test"
echo "============================"
echo ""

# Load environment variables
source .env 2>/dev/null || echo "⚠️  No .env file found, using Railway environment"

SUPABASE_URL="https://qlyqxlzlxdqboxpxpdjp.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.7sOq6iXmmsjAy9XHxcJT7EqUuADSRKyDu3z7gGAC5dQ"

echo "1️⃣  Checking portfolios table..."
echo ""

PORTFOLIOS_RESPONSE=$(curl -s \
  "${SUPABASE_URL}/rest/v1/portfolios?select=id,name,total_value,updated_at" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

PORTFOLIO_COUNT=$(echo "$PORTFOLIOS_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')

if [ "$PORTFOLIO_COUNT" -gt 0 ]; then
  echo "✅ Found $PORTFOLIO_COUNT portfolio(s) in Supabase"
  echo ""
  echo "Portfolios:"
  echo "$PORTFOLIOS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PORTFOLIOS_RESPONSE"
else
  echo "❌ No portfolios found in Supabase"
  echo ""
  echo "📱 This means:"
  echo "  - You haven't created any portfolios yet, OR"
  echo "  - Portfolios exist in AsyncStorage but aren't synced, OR"
  echo "  - You're not authenticated (RLS policies blocking access)"
  echo ""
  echo "🔧 To fix:"
  echo "  1. Open your React Native app"
  echo "  2. Create a portfolio with some assets"
  echo "  3. It will auto-sync to Supabase"
  echo "  4. Run this test again"
fi

echo ""
echo "2️⃣  Checking positions table..."
echo ""

POSITIONS_RESPONSE=$(curl -s \
  "${SUPABASE_URL}/rest/v1/positions?select=id,symbol,quantity,last_price,portfolio_id" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

POSITION_COUNT=$(echo "$POSITIONS_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')

if [ "$POSITION_COUNT" -gt 0 ]; then
  echo "✅ Found $POSITION_COUNT position(s) in Supabase"
  echo ""
  echo "Positions (sample):"
  echo "$POSITIONS_RESPONSE" | python3 -m json.tool 2>/dev/null | head -50 || echo "$POSITIONS_RESPONSE" | head -50
else
  echo "❌ No positions found in Supabase"
  echo ""
  echo "📱 This means your portfolios have no assets"
  echo ""
  echo "🔧 To fix:"
  echo "  1. Add assets to your portfolio"
  echo "  2. Update the portfolio (auto-syncs)"
  echo "  3. Run this test again"
fi

echo ""
echo "3️⃣  Summary"
echo "─────────────────────────────────"
echo "Portfolios: $PORTFOLIO_COUNT"
echo "Positions:  $POSITION_COUNT"
echo ""

if [ "$PORTFOLIO_COUNT" -gt 0 ] && [ "$POSITION_COUNT" -gt 0 ]; then
  echo "✅ ✅ ✅  DATA IS READY FOR VAR CALCULATIONS! ✅ ✅ ✅"
  echo ""
  echo "🎯 Next Steps:"
  echo "  1. Open your app"
  echo "  2. Go to Risk Analysis screen"
  echo "  3. Select a portfolio"
  echo "  4. Run VaR analysis"
  echo "  5. You should see REAL values (not 0.00%)!"
  echo ""
  echo "🔗 Verify in Supabase:"
  echo "  https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp/editor"
else
  echo "⚠️  DATA NOT READY"
  echo ""
  echo "📱 Action Required:"
  echo "  1. Open your React Native app"
  echo "  2. Create a portfolio with real assets (AAPL, MSFT, etc.)"
  echo "  3. The app will automatically sync to Supabase"
  echo "  4. Run this test again to verify"
  echo ""
  echo "📖 See DATA_SYNC_FIX.md for detailed instructions"
fi

echo ""


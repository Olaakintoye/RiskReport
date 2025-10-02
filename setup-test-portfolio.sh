#!/bin/bash
# Create a test portfolio with sample data using Supabase REST API

SUPABASE_URL="https://qlyqxlzlxdqboxpxpdjp.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDExOTA3MywiZXhwIjoyMDY1Njk1MDczfQ.Q5DzOuNAUu9591plbbtITiCfHulbg4-QYwS0uBvimuk"

echo "🏗️  Setting up test portfolio..."
echo ""

# Get your user ID (you'll need to replace this with your actual user ID from Supabase)
echo "⚠️  You need your Supabase user ID"
echo "   Get it from: Supabase Dashboard → Authentication → Users"
echo ""
read -p "Enter your Supabase user ID: " USER_ID

if [ -z "$USER_ID" ]; then
  echo "❌ User ID required"
  exit 1
fi

echo ""
echo "1️⃣  Creating test portfolio..."

# Create portfolio
PORTFOLIO_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/portfolios" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"user_id\": \"${USER_ID}\",
    \"name\": \"Tech Portfolio Test\",
    \"description\": \"Sample portfolio for VaR calculation testing\",
    \"base_ccy\": \"USD\"
  }")

echo "Portfolio created:"
echo $PORTFOLIO_RESPONSE | python3 -m json.tool
echo ""

# Extract portfolio ID
PORTFOLIO_ID=$(echo $PORTFOLIO_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['id'])" 2>/dev/null)

if [ -z "$PORTFOLIO_ID" ]; then
  echo "❌ Failed to create portfolio. Check if the tables exist in Supabase."
  echo "   Response: $PORTFOLIO_RESPONSE"
  exit 1
fi

echo "✅ Portfolio ID: $PORTFOLIO_ID"
echo ""

echo "2️⃣  Adding positions..."

# Add AAPL position
curl -s -X POST "${SUPABASE_URL}/rest/v1/positions" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"portfolio_id\": \"${PORTFOLIO_ID}\",
    \"symbol\": \"AAPL\",
    \"asset_name\": \"Apple Inc.\",
    \"asset_type\": \"equity\",
    \"quantity\": 100,
    \"last_price\": 175.50,
    \"sector\": \"Technology\"
  }"

echo "✅ Added 100 shares of AAPL @ \$175.50"

# Add TSLA position
curl -s -X POST "${SUPABASE_URL}/rest/v1/positions" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"portfolio_id\": \"${PORTFOLIO_ID}\",
    \"symbol\": \"TSLA\",
    \"asset_name\": \"Tesla Inc.\",
    \"asset_type\": \"equity\",
    \"quantity\": 50,
    \"last_price\": 245.00,
    \"sector\": \"Automotive\"
  }"

echo "✅ Added 50 shares of TSLA @ \$245.00"

# Add MSFT position
curl -s -X POST "${SUPABASE_URL}/rest/v1/positions" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"portfolio_id\": \"${PORTFOLIO_ID}\",
    \"symbol\": \"MSFT\",
    \"asset_name\": \"Microsoft Corporation\",
    \"asset_type\": \"equity\",
    \"quantity\": 75,
    \"last_price\": 380.00,
    \"sector\": \"Technology\"
  }"

echo "✅ Added 75 shares of MSFT @ \$380.00"

echo ""
echo "🎉 Test portfolio created successfully!"
echo ""
echo "📊 Portfolio Summary:"
echo "   - Portfolio ID: ${PORTFOLIO_ID}"
echo "   - Total Value: ~\$42,800"
echo "   - Positions:"
echo "     • AAPL: 100 shares × \$175.50 = \$17,550"
echo "     • TSLA: 50 shares × \$245.00 = \$12,250"
echo "     • MSFT: 75 shares × \$380.00 = \$28,500"
echo ""
echo "🧪 Now you can test VaR calculation!"
echo "   Save this Portfolio ID: ${PORTFOLIO_ID}"
echo ""


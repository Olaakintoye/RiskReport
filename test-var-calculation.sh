#!/bin/bash
# Test VaR calculation with the Railway API

API_URL="https://risktest1-production.up.railway.app"

echo "🧪 Testing VaR Calculation API"
echo ""

# Get user token and portfolio ID
echo "You need:"
echo "  1. Your Supabase JWT token (from your app's auth session)"
echo "  2. Your Portfolio ID (from setup-test-portfolio.sh)"
echo ""
read -p "Enter your JWT token: " JWT_TOKEN
read -p "Enter Portfolio ID: " PORTFOLIO_ID

if [ -z "$JWT_TOKEN" ] || [ -z "$PORTFOLIO_ID" ]; then
  echo "❌ Both JWT token and Portfolio ID required"
  exit 1
fi

echo ""
echo "📊 Starting VaR calculation..."
echo "   Method: Monte Carlo"
echo "   Confidence: 95%"
echo "   Simulations: 50,000"
echo ""

# Start calculation
RESPONSE=$(curl -s -X POST "${API_URL}/calc/var" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"portfolio_id\": \"${PORTFOLIO_ID}\",
    \"method\": \"monte_carlo\",
    \"confidence\": 0.95,
    \"horizon_days\": 1,
    \"num_simulations\": 50000,
    \"lookback_years\": 3
  }")

echo "Response:"
echo $RESPONSE | python3 -m json.tool
echo ""

# Extract job ID
JOB_ID=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('job_id', ''))" 2>/dev/null)

if [ -z "$JOB_ID" ]; then
  echo "❌ Failed to start calculation"
  exit 1
fi

echo "✅ Calculation started!"
echo "   Job ID: ${JOB_ID}"
echo ""
echo "⏳ Polling for results (this may take 30-60 seconds)..."
echo ""

# Poll for results
for i in {1..30}; do
  sleep 2
  
  STATUS_RESPONSE=$(curl -s -X GET "${API_URL}/jobs/${JOB_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}")
  
  STATUS=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', 'unknown'))" 2>/dev/null)
  
  echo "   [$i] Status: $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo ""
    echo "🎉 Calculation completed!"
    echo ""
    echo "📊 Full Results:"
    echo $STATUS_RESPONSE | python3 -m json.tool
    echo ""
    
    # Extract VaR value
    VAR_95=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; r=json.load(sys.stdin).get('result',{}).get('var_result',{}); print(r.get('var_95', 'N/A'))" 2>/dev/null)
    
    if [ "$VAR_95" != "N/A" ]; then
      echo "💰 1-Day VaR (95%): \$${VAR_95}"
      echo ""
      echo "📈 This means there's a 5% chance of losing more than \$${VAR_95} in one day"
    fi
    
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo ""
    echo "❌ Calculation failed!"
    echo $STATUS_RESPONSE | python3 -m json.tool
    exit 1
  fi
done

echo ""
echo "⏱️  Calculation is still running. Check manually at:"
echo "   ${API_URL}/jobs/${JOB_ID}"
echo ""


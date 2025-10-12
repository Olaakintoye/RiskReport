#!/bin/bash
# Sync Market Data to Supabase
# Updates market_data_cache table with current prices

set -e

echo "📈 Market Data Sync Tool"
echo "========================"
echo ""

# Configuration
SUPABASE_URL="https://qlyqxlzlxdqboxpxpdjp.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDExOTA3MywiZXhwIjoyMDY1Njk1MDczfQ.Q5DzOuNAUu9591plbbtITiCfHulbg4-QYwS0uBvimuk"

# Function to get all unique symbols from portfolios
get_active_symbols() {
  echo "🔍 Fetching active symbols from portfolios..."
  
  SYMBOLS_RESPONSE=$(curl -s \
    "${SUPABASE_URL}/rest/v1/positions?select=symbol" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")
  
  # Extract unique symbols
  SYMBOLS=$(echo "$SYMBOLS_RESPONSE" | jq -r '.[].symbol' | sort -u)
  
  if [ -z "$SYMBOLS" ]; then
    echo "⚠️  No symbols found in positions table"
    return 1
  fi
  
  SYMBOL_COUNT=$(echo "$SYMBOLS" | wc -l | tr -d ' ')
  echo "✅ Found $SYMBOL_COUNT unique symbols"
  echo ""
  
  echo "$SYMBOLS"
}

# Function to fetch price from yfinance (using Python)
fetch_price_python() {
  local symbol=$1
  
  python3 -c "
import yfinance as yf
import sys
import json

try:
    ticker = yf.Ticker('$symbol')
    info = ticker.info
    history = ticker.history(period='2d')
    
    if not history.empty:
        current_price = history['Close'].iloc[-1]
        if len(history) > 1:
            prev_price = history['Close'].iloc[-2]
            price_change = current_price - prev_price
            price_change_pct = (price_change / prev_price) * 100
        else:
            price_change = 0
            price_change_pct = 0
        
        result = {
            'symbol': '$symbol',
            'price': float(current_price),
            'change': float(price_change),
            'change_pct': float(price_change_pct),
            'volume': int(history['Volume'].iloc[-1]) if 'Volume' in history else 0
        }
        print(json.dumps(result))
        sys.exit(0)
    else:
        sys.exit(1)
except Exception as e:
    sys.stderr.write(f'Error: {e}\n')
    sys.exit(1)
" 2>/dev/null
}

# Function to update market data cache
update_market_data() {
  local symbol=$1
  local price=$2
  local change=$3
  local change_pct=$4
  local volume=$5
  
  curl -s \
    -X POST \
    "${SUPABASE_URL}/rest/v1/market_data_cache" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "{
      \"symbol\": \"$symbol\",
      \"last_price\": $price,
      \"price_change\": $change,
      \"price_change_pct\": $change_pct,
      \"volume\": $volume,
      \"currency\": \"USD\",
      \"last_updated\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
    }" > /dev/null
}

# Function to sync single symbol
sync_symbol() {
  local symbol=$1
  
  echo -n "  $symbol ... "
  
  # Check if Python is available
  if ! command -v python3 &> /dev/null; then
    echo "⚠️  Python3 not found, skipping"
    return 1
  fi
  
  # Check if yfinance is available
  if ! python3 -c "import yfinance" 2>/dev/null; then
    echo "⚠️  yfinance not installed (pip install yfinance)"
    return 1
  fi
  
  # Fetch price data
  PRICE_DATA=$(fetch_price_python "$symbol")
  
  if [ $? -eq 0 ] && [ -n "$PRICE_DATA" ]; then
    PRICE=$(echo "$PRICE_DATA" | jq -r '.price')
    CHANGE=$(echo "$PRICE_DATA" | jq -r '.change')
    CHANGE_PCT=$(echo "$PRICE_DATA" | jq -r '.change_pct')
    VOLUME=$(echo "$PRICE_DATA" | jq -r '.volume')
    
    # Update Supabase
    update_market_data "$symbol" "$PRICE" "$CHANGE" "$CHANGE_PCT" "$VOLUME"
    
    echo "✅ $PRICE (${CHANGE_PCT:0:5}%)"
    return 0
  else
    echo "❌ Failed to fetch"
    return 1
  fi
}

# Function to sync all symbols
sync_all_symbols() {
  SYMBOLS=$(get_active_symbols)
  
  if [ $? -ne 0 ]; then
    exit 1
  fi
  
  echo "📊 Syncing market data..."
  echo ""
  
  SUCCESS_COUNT=0
  FAIL_COUNT=0
  
  while IFS= read -r symbol; do
    if sync_symbol "$symbol"; then
      ((SUCCESS_COUNT++))
    else
      ((FAIL_COUNT++))
    fi
    
    # Rate limit: sleep briefly between requests
    sleep 0.5
  done <<< "$SYMBOLS"
  
  echo ""
  echo "════════════════════════════════════════"
  echo "📊 Sync Complete"
  echo "════════════════════════════════════════"
  echo "✅ Success: $SUCCESS_COUNT"
  echo "❌ Failed:  $FAIL_COUNT"
  echo ""
  
  if [ $SUCCESS_COUNT -gt 0 ]; then
    echo "🔄 Position prices will auto-update via triggers!"
    echo ""
    echo "🔍 Verify with:"
    echo "  ./test-data-sync.sh"
    echo ""
    echo "Or check market_data_cache:"
    echo "  https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp/editor"
  fi
}

# Function to sync specific symbols
sync_specific_symbols() {
  echo "📊 Syncing specific symbols: $@"
  echo ""
  
  SUCCESS_COUNT=0
  FAIL_COUNT=0
  
  for symbol in "$@"; do
    if sync_symbol "$symbol"; then
      ((SUCCESS_COUNT++))
    else
      ((FAIL_COUNT++))
    fi
    sleep 0.5
  done
  
  echo ""
  echo "════════════════════════════════════════"
  echo "✅ Success: $SUCCESS_COUNT"
  echo "❌ Failed:  $FAIL_COUNT"
  echo ""
}

# Function to show current market data
show_market_data() {
  echo "📊 Current Market Data Cache"
  echo "════════════════════════════════════════"
  echo ""
  
  MARKET_DATA=$(curl -s \
    "${SUPABASE_URL}/rest/v1/market_data_cache?select=symbol,last_price,price_change_pct,last_updated&order=symbol.asc" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")
  
  if [ -z "$MARKET_DATA" ] || [ "$MARKET_DATA" == "[]" ]; then
    echo "⚠️  No market data in cache"
    return
  fi
  
  echo "$MARKET_DATA" | jq -r '.[] | "\(.symbol): $\(.last_price) (\(.price_change_pct)%) - \(.last_updated)"'
  echo ""
  
  COUNT=$(echo "$MARKET_DATA" | jq '. | length')
  echo "Total symbols: $COUNT"
}

# Main menu
case "${1:-menu}" in
  all)
    sync_all_symbols
    ;;
  
  symbols)
    shift
    if [ $# -eq 0 ]; then
      echo "Usage: $0 symbols AAPL MSFT GOOGL ..."
      exit 1
    fi
    sync_specific_symbols "$@"
    ;;
  
  show)
    show_market_data
    ;;
  
  test)
    echo "🧪 Testing with sample symbols..."
    echo ""
    sync_specific_symbols "AAPL" "MSFT" "GOOGL"
    ;;
  
  help|--help|-h)
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  all              Sync all symbols from portfolios"
    echo "  symbols SYMBOLS  Sync specific symbols (e.g., AAPL MSFT)"
    echo "  show             Show current market data cache"
    echo "  test             Test sync with AAPL, MSFT, GOOGL"
    echo "  help             Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 all"
    echo "  $0 symbols AAPL MSFT GOOGL"
    echo "  $0 test"
    echo "  $0 show"
    ;;
  
  *)
    echo "Select an option:"
    echo "  1) Sync all symbols from portfolios"
    echo "  2) Sync specific symbols"
    echo "  3) Show current market data"
    echo "  4) Test with sample symbols"
    echo "  5) Help"
    echo ""
    read -p "Choice (1-5): " choice
    
    case $choice in
      1) sync_all_symbols ;;
      2) 
        read -p "Enter symbols (space-separated): " symbols
        sync_specific_symbols $symbols
        ;;
      3) show_market_data ;;
      4) 
        echo ""
        sync_specific_symbols "AAPL" "MSFT" "GOOGL"
        ;;
      5) $0 help ;;
      *) echo "Invalid choice" ;;
    esac
    ;;
esac


#!/bin/bash

echo "📊 ADDING POSITION_CODE COLUMN TO POSITIONS TABLE"
echo "=================================================="
echo ""

# Read the migration file
MIGRATION_FILE="supabase/migrations/20250928000004_add_position_code.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "Migration file: $MIGRATION_FILE"
echo ""
echo "This will add:"
echo "  • position_code column (VARCHAR(50), UNIQUE)"
echo "  • Format: TICKER-XXXXX (e.g., AAPL-12345)"
echo "  • Index for fast lookups"
echo ""

# Run the migration in Supabase SQL Editor
echo "Please run this SQL in your Supabase SQL Editor:"
echo "https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp/database/sql"
echo ""
echo "=================================================="
cat "$MIGRATION_FILE"
echo "=================================================="
echo ""
echo "After running the SQL:"
echo "1. Go back to your app"
echo "2. Navigate to your portfolio"
echo "3. The sync will now include position codes!"
echo ""
echo "Example position codes:"
echo "  • AAPL-12345 (User 1 adds Apple)"
echo "  • AAPL-67890 (User 2 adds Apple)"
echo "  • TSLA-24680 (User 1 adds Tesla)"
echo ""


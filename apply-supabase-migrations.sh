#!/bin/bash
# Script to apply Supabase migrations and test data

echo "🔧 Applying Supabase Migrations..."
echo ""

# Your Supabase connection details
SUPABASE_URL="https://qlyqxlzlxdqboxpxpdjp.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDExOTA3MywiZXhwIjoyMDY1Njk1MDczfQ.Q5DzOuNAUu9591plbbtITiCfHulbg4-QYwS0uBvimuk"

# Extract database connection string
DB_URL=$(echo $SUPABASE_URL | sed 's/https:\/\///')
DB_HOST="db.${DB_URL#*.}"

echo "📊 Applying schema migration..."
psql "postgresql://postgres.qlyqxlzlxdqboxpxpdjp:[YOUR-DB-PASSWORD]@$DB_HOST:5432/postgres" \
  -f supabase/migrations/20250928000000_risk_portfolio_schema.sql

echo ""
echo "🔒 Applying RLS policies..."
psql "postgresql://postgres.qlyqxlzlxdqboxpxpdjp:[YOUR-DB-PASSWORD]@$DB_HOST:5432/postgres" \
  -f supabase/migrations/20250928000001_row_level_security.sql

echo ""
echo "✅ Migrations applied!"
echo ""
echo "📝 Note: You need to replace [YOUR-DB-PASSWORD] with your actual Supabase database password"
echo "    Find it in: Supabase Dashboard → Project Settings → Database → Connection string"


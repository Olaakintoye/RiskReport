#!/bin/bash
# One-command script to start testing your VaR API

echo "🚀 VaR API Testing Setup"
echo "========================"
echo ""

# Make all scripts executable
echo "📝 Making scripts executable..."
chmod +x setup-database-direct.sh 2>/dev/null
chmod +x setup-test-portfolio.sh 2>/dev/null
chmod +x test-var-calculation.sh 2>/dev/null
chmod +x apply-supabase-migrations.sh 2>/dev/null
chmod +x make-scripts-executable.sh 2>/dev/null
chmod +x risk_engine/entrypoint.sh 2>/dev/null

echo "✅ Scripts are now executable!"
echo ""

# Run database check
echo "🔍 Checking database setup..."
echo ""
./setup-database-direct.sh




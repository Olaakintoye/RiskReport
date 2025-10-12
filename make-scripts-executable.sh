#!/bin/bash
# Make all testing scripts executable

echo "🔧 Making scripts executable..."

chmod +x setup-database-direct.sh
chmod +x setup-test-portfolio.sh
chmod +x test-var-calculation.sh
chmod +x apply-supabase-migrations.sh

echo "✅ All scripts are now executable!"
echo ""
echo "You can now run:"
echo "  ./setup-database-direct.sh"
echo "  ./setup-test-portfolio.sh"
echo "  ./test-var-calculation.sh"




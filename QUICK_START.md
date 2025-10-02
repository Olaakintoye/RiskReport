# 🚀 Quick Start - Test Your VaR API in 5 Minutes

## ✅ Your API is LIVE!
**URL**: https://risktest1-production.up.railway.app/health

---

## ⚡ Super Quick Start (One Command)

```bash
bash start-testing.sh
```

This will:
- Make all scripts executable
- Check if database is set up
- Guide you through next steps

---

## 📝 3 Simple Steps (Manual)

### Step 1: Set Up Database (2 minutes)

1. Open: https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp/sql
2. Click **"New query"**
3. Copy ALL text from: `supabase/migrations/20250928000000_risk_portfolio_schema.sql`
4. Paste and click **"Run"**
5. Repeat for: `supabase/migrations/20250928000001_row_level_security.sql`

✅ Done! Tables created.

---

### Step 2: Create Test User (1 minute)

**Option A - Dashboard** (easier):
1. Go to: https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp/auth/users
2. Click **"Add user"** → **"Create new user"**
3. Email: `test@example.com`
4. Password: `Test123456!`
5. **Copy the User UID** (looks like: `abc123-def456-...`)

**Option B - Command line**:
```bash
curl -X POST 'https://qlyqxlzlxdqboxpxpdjp.supabase.co/auth/v1/signup' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.lHXOj3_co_4GPLqPyFKr64jfz3V7qPYc6St7-SiNbaM" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test123456!"}'
```

Save the `access_token` and `user.id` from the response.

---

### Step 3: Test VaR Calculation (2 minutes)

```bash
# Make scripts executable
chmod +x setup-test-portfolio.sh test-var-calculation.sh

# Create test portfolio with AAPL, TSLA, MSFT
./setup-test-portfolio.sh
# Enter your User ID when prompted

# Run VaR calculation
./test-var-calculation.sh
# Enter your JWT token and Portfolio ID when prompted
```

**Expected result:**
```
🎉 Calculation completed!
💰 1-Day VaR (95%): $1,245.67
📈 This means there's a 5% chance of losing more than $1,245.67 in one day
```

---

## 🎯 What You Just Did

1. ✅ Created database tables for portfolios, positions, and risk calculations
2. ✅ Created a test user account
3. ✅ Created a $58K portfolio with tech stocks (AAPL, TSLA, MSFT)
4. ✅ Ran a real Monte Carlo VaR calculation (50,000 simulations)
5. ✅ Got professional risk metrics and asset breakdown

---

## 📚 Full Documentation

- **Complete Guide**: `TESTING_GUIDE.md`
- **Setup Summary**: `SETUP_SUMMARY.md`
- **API Docs**: https://risktest1-production.up.railway.app/docs

---

## 🔗 Your Credentials

**Supabase Project**: qlyqxlzlxdqboxpxpdjp

**Supabase URL**: https://qlyqxlzlxdqboxpxpdjp.supabase.co

**API URL**: https://risktest1-production.up.railway.app

**Anon Key** (for frontend):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.lHXOj3_co_4GPLqPyFKr64jfz3V7qPYc6St7-SiNbaM
```

---

## 🆘 Troubleshooting

**"Relation does not exist"** → Run Step 1 (database setup)

**"Unauthorized"** → Get fresh JWT token from signup/login

**"Portfolio not found"** → Make sure User ID matches between portfolio and JWT token

**Need help?** → Read `TESTING_GUIDE.md` for detailed instructions

---

**Ready?** Start with Step 1 above! 🚀

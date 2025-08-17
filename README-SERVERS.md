# Risk Analysis Backend Servers Setup

## ⚠️ IMPORTANT: When You Rebuild Your App

**Every time you rebuild your React Native app, the backend servers stop running!**

This causes the dreaded "Network Error" in VaR analysis. Here's how to fix it:

## 🚀 Quick Fix (Run this after every rebuild)

```bash
./start-all-servers.sh
```

This single command will:
- ✅ Stop any existing servers
- ✅ Start VaR Analysis Server (Port 3001)
- ✅ Start Stress Test Server (Port 3000)
- ✅ Verify both are running correctly

## 🔧 Manual Commands (if needed)

### Start Individual Servers:
```bash
# VaR Analysis Server (Port 3001)
./start-backend.sh

# Stress Test Server (Port 3000)
cd server && node server.js &
```

### Check Server Status:
```bash
lsof -i :3001  # VaR Analysis Server
lsof -i :3000  # Stress Test Server
```

### Stop All Servers:
```bash
pkill -f 'node.*server'
```

## 📊 Server Architecture

| Server | Port | Purpose | Endpoints |
|--------|------|---------|-----------|
| **VaR Analysis** | 3001 | Python VaR calculations | `/api/run-var` |
| **Stress Test** | 3000 | Scenario stress testing | `/api/stress-test/*` |

## 🐛 Troubleshooting

### Problem: "Network Error" in VaR Analysis
**Solution:** Run `./start-all-servers.sh` and restart your React Native app

### Problem: Servers won't start
**Solution:** 
1. Kill existing servers: `pkill -f 'node.*server'`
2. Wait 5 seconds
3. Run `./start-all-servers.sh` again

### Problem: Python environment issues
**Solution:** Check that your virtual environment is activated:
```bash
source venv/bin/activate
# or
source .venv/bin/activate
```

## 🎯 Success Indicators

When everything is working, you should see:
- ✅ VaR Analysis Server running on http://localhost:3001
- ✅ Stress Test Server running on http://localhost:3000
- ✅ No "Network Error" messages in your app
- ✅ All three VaR methods working (Parametric, Historical, Monte Carlo)

## 💡 Pro Tip

Add this to your development workflow:
1. Rebuild React Native app
2. **IMMEDIATELY run:** `./start-all-servers.sh`
3. Refresh your app to clear cache
4. VaR analysis will work perfectly!



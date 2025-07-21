# Supabase Integration Setup Guide for Risk Report

This guide will help you set up the complete Supabase backend for your Risk Report portfolio management application.

## 🚀 Quick Setup

### 1. Database Migration

Run the SQL migration in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/001_risk_report_schema.sql`
4. Click **Run** to execute the migration

This will create all the necessary tables, indexes, RLS policies, and functions.

### 2. Authentication Configuration

Your Supabase auth is already configured in `client/src/lib/supabase.ts`:

```typescript
const supabaseUrl = 'https://qlyqxlzlxdqboxpxpdjp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## 📊 Database Schema Overview

### Core Tables

1. **profiles** - User profiles extending Supabase auth
2. **portfolios** - User investment portfolios
3. **assets** - Master list of securities/assets
4. **holdings** - Portfolio positions
5. **transactions** - Trading history
6. **price_history** - Historical price data
7. **risk_metrics** - VaR, CVaR, and other risk calculations
8. **scenario_analyses** - Stress testing and scenario results
9. **portfolio_performance** - Daily performance tracking
10. **watchlists** - User watchlists
11. **alerts** - Price and risk alerts
12. **user_settings** - User preferences

### Key Features

- **Row Level Security (RLS)** - Users can only access their own data
- **Automatic Profile Creation** - Profiles are created automatically on signup
- **Real-time Updates** - Portfolio values update automatically
- **Comprehensive Risk Analytics** - Support for multiple VaR methodologies
- **Performance Tracking** - Daily portfolio performance metrics

## 🔧 API Integration Examples

### 1. Create a Portfolio

```typescript
import { supabase } from '@/lib/supabase';

const createPortfolio = async (name: string, description?: string) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('portfolios')
    .insert({
      user_id: user.user.id,
      name,
      description,
      base_currency: 'USD',
      initial_value: 0,
      current_value: 0,
      cash_balance: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

### 2. Add Holdings to Portfolio

```typescript
const addHolding = async (portfolioId: string, symbol: string, quantity: number, price: number) => {
  // First, ensure the asset exists
  let { data: asset } = await supabase
    .from('assets')
    .select('id')
    .eq('symbol', symbol)
    .single();

  if (!asset) {
    // Create asset if it doesn't exist
    const { data: newAsset, error: assetError } = await supabase
      .from('assets')
      .insert({
        symbol,
        name: symbol, // You'd typically get this from a market data API
        asset_type: 'stock',
        currency: 'USD',
      })
      .select()
      .single();

    if (assetError) throw assetError;
    asset = newAsset;
  }

  // Add the holding
  const { data, error } = await supabase
    .from('holdings')
    .insert({
      portfolio_id: portfolioId,
      asset_id: asset.id,
      quantity,
      average_cost: price,
      current_price: price,
      market_value: quantity * price,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

### 3. Record a Transaction

```typescript
const recordTransaction = async (
  portfolioId: string,
  assetId: string,
  type: 'buy' | 'sell',
  quantity: number,
  price: number,
  fees: number = 0
) => {
  const totalAmount = quantity * price + (type === 'buy' ? fees : -fees);

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      portfolio_id: portfolioId,
      asset_id: assetId,
      transaction_type: type,
      quantity,
      price,
      total_amount: totalAmount,
      fees,
      transaction_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

### 4. Store Risk Metrics

```typescript
const storeRiskMetrics = async (
  portfolioId: string,
  varValue: number,
  cvarValue: number,
  confidenceLevel: number = 0.95
) => {
  const today = new Date().toISOString().split('T')[0];

  const metrics = [
    {
      portfolio_id: portfolioId,
      metric_type: 'var' as const,
      value: varValue,
      confidence_level: confidenceLevel,
      time_horizon: 1,
      calculation_date: today,
      methodology: 'parametric',
    },
    {
      portfolio_id: portfolioId,
      metric_type: 'cvar' as const,
      value: cvarValue,
      confidence_level: confidenceLevel,
      time_horizon: 1,
      calculation_date: today,
      methodology: 'parametric',
    },
  ];

  const { data, error } = await supabase
    .from('risk_metrics')
    .upsert(metrics, {
      onConflict: 'portfolio_id,metric_type,confidence_level,time_horizon,calculation_date',
    })
    .select();

  if (error) throw error;
  return data;
};
```

### 5. Get Portfolio Performance

```typescript
const getPortfolioPerformance = async (portfolioId: string, days: number = 30) => {
  const { data, error } = await supabase
    .from('portfolio_performance')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('date', { ascending: false })
    .limit(days);

  if (error) throw error;
  return data;
};
```

## 🔐 Security Features

### Row Level Security (RLS)

All user data is protected by RLS policies:

- Users can only see their own portfolios, holdings, and transactions
- Market data (assets, price_history) is publicly readable for authenticated users
- All operations are automatically scoped to the authenticated user

### Authentication Flow

```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      fullName: 'John Doe',
    },
  },
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

## 📈 Real-time Features

### Portfolio Value Updates

The database automatically updates portfolio values when holdings change:

```sql
-- This trigger runs automatically when holdings are modified
CREATE TRIGGER update_portfolio_value_on_holdings_change
    AFTER INSERT OR UPDATE OR DELETE ON holdings
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_value();
```

### Real-time Subscriptions

```typescript
// Subscribe to portfolio changes
const subscription = supabase
  .channel('portfolio-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'portfolios',
      filter: `user_id=eq.${user.id}`,
    },
    (payload) => {
      console.log('Portfolio updated:', payload);
      // Update your UI
    }
  )
  .subscribe();
```

## 🛠 Development Workflow

### 1. Local Development

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Initialize Supabase in your project
supabase init

# Start local Supabase
supabase start

# Apply migrations
supabase db push
```

### 2. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qlyqxlzlxdqboxpxpdjp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.lHXOj3_co_4GPLqPyFKr64jfz3V7qPYc6St7-SiNbaM
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. Type Safety

The database types are automatically generated in `client/src/types/database.ts`. Update them whenever you modify the schema:

```bash
supabase gen types typescript --project-id qlyqxlzlxdqboxpxpdjp > client/src/types/database.ts
```

## 📊 Sample Data

### Seed Script

Create sample data for testing:

```sql
-- Insert sample assets
INSERT INTO assets (symbol, name, asset_type, exchange, currency, sector) VALUES
('AAPL', 'Apple Inc.', 'stock', 'NASDAQ', 'USD', 'Technology'),
('MSFT', 'Microsoft Corporation', 'stock', 'NASDAQ', 'USD', 'Technology'),
('GOOGL', 'Alphabet Inc.', 'stock', 'NASDAQ', 'USD', 'Technology'),
('SPY', 'SPDR S&P 500 ETF Trust', 'etf', 'NYSE', 'USD', 'Diversified');

-- Insert sample price history (you'd typically get this from a market data API)
INSERT INTO price_history (asset_id, date, close_price) 
SELECT id, CURRENT_DATE, 150.00 FROM assets WHERE symbol = 'AAPL';
```

## 🚨 Important Notes

1. **API Keys**: Your Supabase URL and anon key are already configured
2. **RLS**: All policies are set up to ensure data security
3. **Triggers**: Automatic portfolio value calculation is enabled
4. **Indexes**: Performance indexes are created for common queries
5. **Types**: TypeScript types are generated for type safety

## 🔄 Next Steps

1. Run the SQL migration in your Supabase dashboard
2. Test authentication with the onboarding flow
3. Create sample portfolios and holdings
4. Integrate with market data APIs for real-time prices
5. Set up real-time subscriptions for live updates

Your Risk Report app is now ready with a comprehensive, secure, and scalable Supabase backend! 🎉 
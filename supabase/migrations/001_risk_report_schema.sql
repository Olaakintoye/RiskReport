-- Risk Report Database Schema
-- This schema supports portfolio management, risk analysis, and user data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE portfolio_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE asset_type AS ENUM ('stock', 'bond', 'etf', 'mutual_fund', 'crypto', 'commodity', 'real_estate', 'cash', 'other');
CREATE TYPE transaction_type AS ENUM ('buy', 'sell', 'dividend', 'split', 'merger', 'spinoff', 'other');
CREATE TYPE risk_metric_type AS ENUM ('var', 'cvar', 'sharpe_ratio', 'beta', 'volatility', 'max_drawdown');
CREATE TYPE scenario_type AS ENUM ('historical', 'monte_carlo', 'stress_test', 'custom');

-- Users/Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
    risk_tolerance TEXT DEFAULT 'moderate' CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    investment_experience TEXT DEFAULT 'intermediate' CHECK (investment_experience IN ('beginner', 'intermediate', 'advanced', 'expert')),
    preferred_currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'UTC',
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "risk_alerts": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status portfolio_status DEFAULT 'active',
    base_currency TEXT DEFAULT 'USD',
    initial_value DECIMAL(15,2) DEFAULT 0,
    current_value DECIMAL(15,2) DEFAULT 0,
    cash_balance DECIMAL(15,2) DEFAULT 0,
    target_allocation JSONB, -- {"stocks": 60, "bonds": 30, "cash": 10}
    risk_profile JSONB, -- {"var_95": 0.05, "target_return": 0.08, "max_drawdown": 0.15}
    benchmark_symbol TEXT DEFAULT 'SPY',
    rebalance_frequency TEXT DEFAULT 'quarterly' CHECK (rebalance_frequency IN ('never', 'monthly', 'quarterly', 'semi_annual', 'annual')),
    last_rebalanced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets/Securities master table
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    asset_type asset_type NOT NULL,
    exchange TEXT,
    currency TEXT DEFAULT 'USD',
    sector TEXT,
    industry TEXT,
    country TEXT,
    market_cap BIGINT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB, -- Additional asset-specific data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio holdings
CREATE TABLE IF NOT EXISTS holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    quantity DECIMAL(15,6) NOT NULL DEFAULT 0,
    average_cost DECIMAL(10,4) NOT NULL DEFAULT 0,
    current_price DECIMAL(10,4),
    market_value DECIMAL(15,2),
    unrealized_pnl DECIMAL(15,2),
    weight_percent DECIMAL(5,2), -- Portfolio weight percentage
    target_weight_percent DECIMAL(5,2), -- Target allocation percentage
    last_price_update TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portfolio_id, asset_id)
);

-- Transactions history
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    quantity DECIMAL(15,6) NOT NULL,
    price DECIMAL(10,4) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    fees DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    transaction_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history for assets
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    open_price DECIMAL(10,4),
    high_price DECIMAL(10,4),
    low_price DECIMAL(10,4),
    close_price DECIMAL(10,4) NOT NULL,
    volume BIGINT,
    adjusted_close DECIMAL(10,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(asset_id, date)
);

-- Risk metrics and analytics
CREATE TABLE IF NOT EXISTS risk_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    metric_type risk_metric_type NOT NULL,
    value DECIMAL(10,6) NOT NULL,
    confidence_level DECIMAL(3,2), -- For VaR/CVaR (e.g., 0.95 for 95%)
    time_horizon INTEGER, -- Days
    calculation_date DATE NOT NULL,
    methodology TEXT, -- 'historical', 'parametric', 'monte_carlo'
    parameters JSONB, -- Method-specific parameters
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portfolio_id, metric_type, confidence_level, time_horizon, calculation_date)
);

-- Scenario analysis results
CREATE TABLE IF NOT EXISTS scenario_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scenario_type scenario_type NOT NULL,
    description TEXT,
    parameters JSONB NOT NULL, -- Scenario-specific parameters
    results JSONB NOT NULL, -- Analysis results
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio performance tracking
CREATE TABLE IF NOT EXISTS portfolio_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    daily_return DECIMAL(8,6),
    cumulative_return DECIMAL(8,6),
    benchmark_return DECIMAL(8,6),
    alpha DECIMAL(8,6),
    beta DECIMAL(8,6),
    sharpe_ratio DECIMAL(8,6),
    volatility DECIMAL(8,6),
    max_drawdown DECIMAL(8,6),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portfolio_id, date)
);

-- User watchlists
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist items
CREATE TABLE IF NOT EXISTS watchlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    notes TEXT,
    target_price DECIMAL(10,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(watchlist_id, asset_id)
);

-- Alerts and notifications
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL, -- 'price', 'var_breach', 'rebalance', 'performance'
    condition_type TEXT NOT NULL, -- 'above', 'below', 'equals', 'percentage_change'
    threshold_value DECIMAL(15,6),
    current_value DECIMAL(15,6),
    message TEXT,
    is_triggered BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences and settings
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, setting_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_id ON holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_holdings_asset_id ON holdings(asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_price_history_asset_id ON price_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(date);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_portfolio_id ON risk_metrics(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_portfolio_id ON portfolio_performance(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_date ON portfolio_performance(date);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered ON alerts(is_triggered, is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for portfolios
CREATE POLICY "Users can view own portfolios" ON portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own portfolios" ON portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios" ON portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios" ON portfolios FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for holdings
CREATE POLICY "Users can view own holdings" ON holdings FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);
CREATE POLICY "Users can manage own holdings" ON holdings FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);
CREATE POLICY "Users can manage own transactions" ON transactions FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

-- RLS Policies for risk_metrics
CREATE POLICY "Users can view own risk metrics" ON risk_metrics FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);
CREATE POLICY "Users can manage own risk metrics" ON risk_metrics FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

-- RLS Policies for scenario_analyses
CREATE POLICY "Users can view own scenarios" ON scenario_analyses FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);
CREATE POLICY "Users can manage own scenarios" ON scenario_analyses FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

-- RLS Policies for portfolio_performance
CREATE POLICY "Users can view own performance" ON portfolio_performance FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);
CREATE POLICY "Users can manage own performance" ON portfolio_performance FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

-- RLS Policies for watchlists
CREATE POLICY "Users can view own watchlists" ON watchlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own watchlists" ON watchlists FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for watchlist_items
CREATE POLICY "Users can view own watchlist items" ON watchlist_items FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM watchlists WHERE id = watchlist_id)
);
CREATE POLICY "Users can manage own watchlist items" ON watchlist_items FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM watchlists WHERE id = watchlist_id)
);

-- RLS Policies for alerts
CREATE POLICY "Users can view own alerts" ON alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own alerts" ON alerts FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- Assets and price_history are public read (no RLS needed for market data)
-- But we'll add basic policies for completeness
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets are publicly readable" ON assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Price history is publicly readable" ON price_history FOR SELECT TO authenticated USING (true);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate portfolio metrics
CREATE OR REPLACE FUNCTION calculate_portfolio_value(portfolio_uuid UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    total_value DECIMAL(15,2) := 0;
BEGIN
    SELECT COALESCE(SUM(market_value), 0) INTO total_value
    FROM holdings
    WHERE portfolio_id = portfolio_uuid;
    
    RETURN total_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update portfolio current value
CREATE OR REPLACE FUNCTION update_portfolio_value()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE portfolios
    SET current_value = calculate_portfolio_value(NEW.portfolio_id),
        updated_at = NOW()
    WHERE id = NEW.portfolio_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update portfolio value when holdings change
CREATE TRIGGER update_portfolio_value_on_holdings_change
    AFTER INSERT OR UPDATE OR DELETE ON holdings
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_value(); 
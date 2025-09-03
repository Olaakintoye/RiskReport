export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          username: string | null
          avatar_url: string | null
          subscription_tier: 'free' | 'premium' | 'enterprise'
          risk_tolerance: 'conservative' | 'moderate' | 'aggressive'
          investment_experience: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          preferred_currency: string
          timezone: string
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          username?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'premium' | 'enterprise'
          risk_tolerance?: 'conservative' | 'moderate' | 'aggressive'
          investment_experience?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          preferred_currency?: string
          timezone?: string
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          username?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'premium' | 'enterprise'
          risk_tolerance?: 'conservative' | 'moderate' | 'aggressive'
          investment_experience?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          preferred_currency?: string
          timezone?: string
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      portfolios: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          status: 'active' | 'inactive' | 'archived'
          base_currency: string
          initial_value: number
          current_value: number
          cash_balance: number
          target_allocation: Json | null
          risk_profile: Json | null
          benchmark_symbol: string
          rebalance_frequency: 'never' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
          last_rebalanced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          status?: 'active' | 'inactive' | 'archived'
          base_currency?: string
          initial_value?: number
          current_value?: number
          cash_balance?: number
          target_allocation?: Json | null
          risk_profile?: Json | null
          benchmark_symbol?: string
          rebalance_frequency?: 'never' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
          last_rebalanced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          status?: 'active' | 'inactive' | 'archived'
          base_currency?: string
          initial_value?: number
          current_value?: number
          cash_balance?: number
          target_allocation?: Json | null
          risk_profile?: Json | null
          benchmark_symbol?: string
          rebalance_frequency?: 'never' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
          last_rebalanced_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      assets: {
        Row: {
          id: string
          symbol: string
          name: string
          asset_type: 'stock' | 'bond' | 'etf' | 'mutual_fund' | 'crypto' | 'commodity' | 'real_estate' | 'cash' | 'other'
          exchange: string | null
          currency: string
          sector: string | null
          industry: string | null
          country: string | null
          market_cap: number | null
          is_active: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          symbol: string
          name: string
          asset_type: 'stock' | 'bond' | 'etf' | 'mutual_fund' | 'crypto' | 'commodity' | 'real_estate' | 'cash' | 'other'
          exchange?: string | null
          currency?: string
          sector?: string | null
          industry?: string | null
          country?: string | null
          market_cap?: number | null
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          name?: string
          asset_type?: 'stock' | 'bond' | 'etf' | 'mutual_fund' | 'crypto' | 'commodity' | 'real_estate' | 'cash' | 'other'
          exchange?: string | null
          currency?: string
          sector?: string | null
          industry?: string | null
          country?: string | null
          market_cap?: number | null
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      holdings: {
        Row: {
          id: string
          portfolio_id: string
          asset_id: string
          quantity: number
          average_cost: number
          current_price: number | null
          market_value: number | null
          unrealized_pnl: number | null
          weight_percent: number | null
          target_weight_percent: number | null
          last_price_update: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          asset_id: string
          quantity?: number
          average_cost?: number
          current_price?: number | null
          market_value?: number | null
          unrealized_pnl?: number | null
          weight_percent?: number | null
          target_weight_percent?: number | null
          last_price_update?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          asset_id?: string
          quantity?: number
          average_cost?: number
          current_price?: number | null
          market_value?: number | null
          unrealized_pnl?: number | null
          weight_percent?: number | null
          target_weight_percent?: number | null
          last_price_update?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          portfolio_id: string
          asset_id: string
          transaction_type: 'buy' | 'sell' | 'dividend' | 'split' | 'merger' | 'spinoff' | 'other'
          quantity: number
          price: number
          total_amount: number
          fees: number
          tax: number
          notes: string | null
          transaction_date: string
          created_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          asset_id: string
          transaction_type: 'buy' | 'sell' | 'dividend' | 'split' | 'merger' | 'spinoff' | 'other'
          quantity: number
          price: number
          total_amount: number
          fees?: number
          tax?: number
          notes?: string | null
          transaction_date: string
          created_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          asset_id?: string
          transaction_type?: 'buy' | 'sell' | 'dividend' | 'split' | 'merger' | 'spinoff' | 'other'
          quantity?: number
          price?: number
          total_amount?: number
          fees?: number
          tax?: number
          notes?: string | null
          transaction_date?: string
          created_at?: string
        }
      }
      price_history: {
        Row: {
          id: string
          asset_id: string
          date: string
          open_price: number | null
          high_price: number | null
          low_price: number | null
          close_price: number
          volume: number | null
          adjusted_close: number | null
          created_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          date: string
          open_price?: number | null
          high_price?: number | null
          low_price?: number | null
          close_price: number
          volume?: number | null
          adjusted_close?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          asset_id?: string
          date?: string
          open_price?: number | null
          high_price?: number | null
          low_price?: number | null
          close_price?: number
          volume?: number | null
          adjusted_close?: number | null
          created_at?: string
        }
      }
      risk_metrics: {
        Row: {
          id: string
          portfolio_id: string
          metric_type: 'var' | 'cvar' | 'sharpe_ratio' | 'beta' | 'volatility' | 'max_drawdown'
          value: number
          confidence_level: number | null
          time_horizon: number | null
          calculation_date: string
          methodology: string | null
          parameters: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          metric_type: 'var' | 'cvar' | 'sharpe_ratio' | 'beta' | 'volatility' | 'max_drawdown'
          value: number
          confidence_level?: number | null
          time_horizon?: number | null
          calculation_date: string
          methodology?: string | null
          parameters?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          metric_type?: 'var' | 'cvar' | 'sharpe_ratio' | 'beta' | 'volatility' | 'max_drawdown'
          value?: number
          confidence_level?: number | null
          time_horizon?: number | null
          calculation_date?: string
          methodology?: string | null
          parameters?: Json | null
          created_at?: string
        }
      }
      scenario_analyses: {
        Row: {
          id: string
          portfolio_id: string
          name: string
          scenario_type: 'historical' | 'monte_carlo' | 'stress_test' | 'custom'
          description: string | null
          parameters: Json
          results: Json
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          name: string
          scenario_type: 'historical' | 'monte_carlo' | 'stress_test' | 'custom'
          description?: string | null
          parameters: Json
          results: Json
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          name?: string
          scenario_type?: 'historical' | 'monte_carlo' | 'stress_test' | 'custom'
          description?: string | null
          parameters?: Json
          results?: Json
          created_by?: string
          created_at?: string
        }
      }
      portfolio_performance: {
        Row: {
          id: string
          portfolio_id: string
          date: string
          total_value: number
          daily_return: number | null
          cumulative_return: number | null
          benchmark_return: number | null
          alpha: number | null
          beta: number | null
          sharpe_ratio: number | null
          volatility: number | null
          max_drawdown: number | null
          created_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          date: string
          total_value: number
          daily_return?: number | null
          cumulative_return?: number | null
          benchmark_return?: number | null
          alpha?: number | null
          beta?: number | null
          sharpe_ratio?: number | null
          volatility?: number | null
          max_drawdown?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          date?: string
          total_value?: number
          daily_return?: number | null
          cumulative_return?: number | null
          benchmark_return?: number | null
          alpha?: number | null
          beta?: number | null
          sharpe_ratio?: number | null
          volatility?: number | null
          max_drawdown?: number | null
          created_at?: string
        }
      }
      watchlists: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      watchlist_items: {
        Row: {
          id: string
          watchlist_id: string
          asset_id: string
          notes: string | null
          target_price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          watchlist_id: string
          asset_id: string
          notes?: string | null
          target_price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          watchlist_id?: string
          asset_id?: string
          notes?: string | null
          target_price?: number | null
          created_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          portfolio_id: string | null
          asset_id: string | null
          alert_type: string
          condition_type: string
          threshold_value: number | null
          current_value: number | null
          message: string | null
          is_triggered: boolean
          is_active: boolean
          triggered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          portfolio_id?: string | null
          asset_id?: string | null
          alert_type: string
          condition_type: string
          threshold_value?: number | null
          current_value?: number | null
          message?: string | null
          is_triggered?: boolean
          is_active?: boolean
          triggered_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          portfolio_id?: string | null
          asset_id?: string | null
          alert_type?: string
          condition_type?: string
          threshold_value?: number | null
          current_value?: number | null
          message?: string | null
          is_triggered?: boolean
          is_active?: boolean
          triggered_at?: string | null
          created_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          setting_key: string
          setting_value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          setting_key: string
          setting_value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          setting_key?: string
          setting_value?: Json
          created_at?: string
          updated_at?: string
        }
      }
      investments: {
        Row: {
          id: string
          user_id: string
          bank_name: string
          amount: number
          interest_rate: number
          term_months: number
          start_date: string
          maturity_date: string
          status: string
          interest_earned: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bank_name: string
          amount: number
          interest_rate: number
          term_months: number
          start_date: string
          maturity_date: string
          status?: string
          interest_earned?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bank_name?: string
          amount?: number
          interest_rate?: number
          term_months?: number
          start_date?: string
          maturity_date?: string
          status?: string
          interest_earned?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_portfolio_value: {
        Args: {
          portfolio_uuid: string
        }
        Returns: number
      }
      get_user_display_name: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      validate_username: {
        Args: {
          new_username: string
          user_id: string
        }
        Returns: boolean
      }
      update_username: {
        Args: {
          new_username: string
        }
        Returns: void
      }
    }
    Enums: {
      portfolio_status: 'active' | 'inactive' | 'archived'
      asset_type: 'stock' | 'bond' | 'etf' | 'mutual_fund' | 'crypto' | 'commodity' | 'real_estate' | 'cash' | 'other'
      transaction_type: 'buy' | 'sell' | 'dividend' | 'split' | 'merger' | 'spinoff' | 'other'
      risk_metric_type: 'var' | 'cvar' | 'sharpe_ratio' | 'beta' | 'volatility' | 'max_drawdown'
      scenario_type: 'historical' | 'monte_carlo' | 'stress_test' | 'custom'
    }
  }
} 
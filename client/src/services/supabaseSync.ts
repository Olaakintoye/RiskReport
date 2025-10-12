/**
 * Supabase Sync Service
 * 
 * Syncs portfolio data from AsyncStorage to Supabase database
 * This bridges the gap between local storage and the VaR calculation API
 */

import { supabase } from '@/lib/supabase';
import { Portfolio, Asset } from './portfolioService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Generate UUID v4 compatible with React Native (fallback for portfolios)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate unique position ID: TICKER-XXXXX (e.g., AAPL-12345)
// Each asset gets a unique 5-digit number, even if multiple users select the same ticker
function generatePositionId(ticker: string): string {
  // Generate a random 5-digit number (10000-99999)
  const uniqueNumber = Math.floor(10000 + Math.random() * 90000);
  // Combine ticker with unique number
  return `${ticker.toUpperCase()}-${uniqueNumber}`;
}

interface SyncResult {
  success: boolean;
  portfolioId?: string;
  error?: string;
}

/**
 * Sync a single portfolio to Supabase
 */
export async function syncPortfolioToSupabase(portfolio: Portfolio): Promise<SyncResult> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return {
        success: false,
        error: 'User not authenticated. Please log in.'
      };
    }

    console.log(`[SupabaseSync] Syncing portfolio: ${portfolio.name} (${portfolio.id})`);

    // Calculate total portfolio value
    const totalValue = portfolio.assets.reduce(
      (sum, asset) => sum + (asset.quantity * asset.price),
      0
    );

    // 1. Upsert portfolio with sync timestamps
    const now = new Date().toISOString();
    const { data: portfolioData, error: portfolioError } = await supabase
      .from('portfolios')
      .upsert({
        id: portfolio.id,
        user_id: user.id,
        name: portfolio.name,
        description: portfolio.description || '',
        base_ccy: 'USD',
        total_value: totalValue,
        last_sync_time: now,
        last_price_update: now,
        updated_at: now
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (portfolioError) {
      console.error('Error upserting portfolio:', portfolioError);
      return {
        success: false,
        error: `Failed to sync portfolio: ${portfolioError.message}`
      };
    }

    console.log(`[SupabaseSync] Portfolio upserted successfully`);

    // 2. Delete existing positions for this portfolio (we'll recreate them)
    const { error: deleteError } = await supabase
      .from('positions')
      .delete()
      .eq('portfolio_id', portfolio.id);

    if (deleteError) {
      console.warn('Warning: Could not delete old positions:', deleteError);
    }

    // 3. Insert all positions with price tracking
    if (portfolio.assets.length > 0) {
      const now = new Date().toISOString();
      const positionsToInsert = portfolio.assets.map(asset => ({
        id: generateUUID(), // Generate proper UUID for database
        portfolio_id: portfolio.id,
        symbol: asset.symbol,
        asset_name: asset.name,
        asset_type: mapAssetClass(asset.assetClass), // Maps the actual asset class
        quantity: asset.quantity,
        last_price: asset.price,
        last_price_update: now,
        price_source: 'sync',
        currency: 'USD',
        asof_date: new Date().toISOString().split('T')[0],
        created_at: now,
        updated_at: now,
        // Add human-readable position code: TICKER-12345
        position_code: generatePositionId(asset.symbol)
      }));

      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .insert(positionsToInsert)
        .select();

      if (positionsError) {
        console.error('Error inserting positions:', positionsError);
        return {
          success: false,
          error: `Failed to sync positions: ${positionsError.message}`
        };
      }

      console.log(`[SupabaseSync] ${positionsData?.length || 0} positions synced`);
    }

    console.log(`[SupabaseSync] ✅ Portfolio sync complete: ${portfolio.name}`);

    return {
      success: true,
      portfolioId: portfolio.id
    };

  } catch (error: any) {
    console.error('Unexpected error syncing portfolio:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Sync all portfolios from AsyncStorage to Supabase
 */
export async function syncAllPortfoliosToSupabase(): Promise<{
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}> {
  try {
    // Get portfolios from AsyncStorage
    const portfoliosJson = await AsyncStorage.getItem('portfolios');
    const portfolios: Portfolio[] = portfoliosJson ? JSON.parse(portfoliosJson) : [];

    console.log(`[SupabaseSync] Found ${portfolios.length} portfolios to sync`);

    const results = {
      total: portfolios.length,
      synced: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Sync each portfolio
    for (const portfolio of portfolios) {
      const result = await syncPortfolioToSupabase(portfolio);
      
      if (result.success) {
        results.synced++;
      } else {
        results.failed++;
        results.errors.push(`${portfolio.name}: ${result.error}`);
      }
    }

    console.log(`[SupabaseSync] Sync complete: ${results.synced}/${results.total} successful`);

    return results;

  } catch (error: any) {
    console.error('Error in syncAllPortfolios:', error);
    return {
      total: 0,
      synced: 0,
      failed: 0,
      errors: [error.message || 'Unknown error']
    };
  }
}

/**
 * Delete a portfolio from Supabase
 */
export async function deletePortfolioFromSupabase(portfolioId: string): Promise<SyncResult> {
  try {
    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', portfolioId);

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    console.log(`[SupabaseSync] Portfolio ${portfolioId} deleted from Supabase`);

    return {
      success: true,
      portfolioId
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Check if a portfolio exists in Supabase and is in sync
 */
export async function checkPortfolioSync(portfolioId: string): Promise<{
  existsInSupabase: boolean;
  positionsCount: number;
  lastSyncTime?: string;
}> {
  try {
    // Check if portfolio exists
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('id, updated_at')
      .eq('id', portfolioId)
      .single();

    if (portfolioError || !portfolio) {
      return {
        existsInSupabase: false,
        positionsCount: 0
      };
    }

    // Count positions
    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .select('id')
      .eq('portfolio_id', portfolioId);

    return {
      existsInSupabase: true,
      positionsCount: positions?.length || 0,
      lastSyncTime: portfolio.updated_at
    };

  } catch (error) {
    console.error('Error checking portfolio sync:', error);
    return {
      existsInSupabase: false,
      positionsCount: 0
    };
  }
}

/**
 * Helper: Map asset class from app format to Supabase format
 */
function mapAssetClass(assetClass: string): string {
  if (!assetClass) return 'equity';
  
  const normalized = assetClass.toLowerCase().trim();
  
  const mapping: Record<string, string> = {
    'equity': 'equity',
    'stock': 'equity',
    'stocks': 'equity',
    'bond': 'bond',
    'bonds': 'bond',
    'fixed income': 'bond',
    'commodity': 'commodity',
    'commodities': 'commodity',
    'crypto': 'commodity',
    'cryptocurrency': 'commodity',
    'cash': 'equity',
    'money market': 'equity',
    'alternative': 'equity',
    'alternatives': 'equity',
    'real estate': 'equity',
    'real_estate': 'equity',
    'reit': 'equity'
  };

  return mapping[normalized] || 'equity';
}

/**
 * Ensure portfolio is synced before running VaR analysis
 */
export async function ensurePortfolioSynced(portfolio: Portfolio): Promise<boolean> {
  console.log(`[SupabaseSync] Ensuring portfolio ${portfolio.name} is synced...`);
  
  const syncStatus = await checkPortfolioSync(portfolio.id);
  
  // If portfolio doesn't exist or has no positions, sync it
  if (!syncStatus.existsInSupabase || syncStatus.positionsCount === 0) {
    console.log(`[SupabaseSync] Portfolio not synced, syncing now...`);
    const result = await syncPortfolioToSupabase(portfolio);
    return result.success;
  }
  
  // Portfolio exists with positions
  console.log(`[SupabaseSync] Portfolio already synced (${syncStatus.positionsCount} positions)`);
  return true;
}


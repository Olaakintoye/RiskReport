/**
 * VaR History Service
 * 
 * Service for retrieving historical VaR analysis results from Supabase
 */

import { supabase } from '@/lib/supabase';

export interface VarHistoryItem {
  id: string;
  portfolio_id: string;
  calc_type: string;
  confidence: number;
  horizon_days: number;
  var_amount: number;
  var_percentage: number;
  es_amount: number; // CVaR
  cvar_percentage: number;
  portfolio_value: number;
  chart_storage_url?: string;
  parameters: any;
  created_at: string;
}

/**
 * Get VaR analysis history for a portfolio
 * @param portfolioId Portfolio ID
 * @param limit Maximum number of results (default: 5)
 * @param calcType Optional filter by calculation type
 * @returns List of VaR results, most recent first
 */
export async function getVarHistory(
  portfolioId: string,
  limit: number = 5,
  calcType?: string
): Promise<VarHistoryItem[]> {
  try {
    let query = supabase
      .from('results')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (calcType) {
      query = query.eq('calc_type', calcType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching VaR history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error in getVarHistory:', error);
    return [];
  }
}

/**
 * Get a single VaR result by ID
 * @param resultId Result ID
 * @returns VaR result or null
 */
export async function getVarResult(resultId: string): Promise<VarHistoryItem | null> {
  try {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('id', resultId)
      .single();

    if (error) {
      console.error('Error fetching VaR result:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in getVarResult:', error);
    return null;
  }
}

/**
 * Get VaR history with portfolio info (using view)
 * @param portfolioId Portfolio ID
 * @param limit Maximum number of results
 * @returns List of VaR results with portfolio information
 */
export async function getVarHistoryWithPortfolio(
  portfolioId: string,
  limit: number = 5
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('var_results_with_portfolio')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .limit(limit);

    if (error) {
      console.error('Error fetching VaR history with portfolio:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error in getVarHistoryWithPortfolio:', error);
    return [];
  }
}

/**
 * Delete old VaR results (keep only last N)
 * @param portfolioId Portfolio ID
 * @param keepLast Number of results to keep (default: 10)
 */
export async function cleanupOldResults(
  portfolioId: string,
  keepLast: number = 10
): Promise<void> {
  try {
    // Get all results for the portfolio
    const { data: allResults } = await supabase
      .from('results')
      .select('id, created_at')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false });

    if (!allResults || allResults.length <= keepLast) {
      return; // Nothing to clean up
    }

    // Get IDs of results to delete (everything after keepLast)
    const resultsToDelete = allResults
      .slice(keepLast)
      .map(r => r.id);

    if (resultsToDelete.length > 0) {
      const { error } = await supabase
        .from('results')
        .delete()
        .in('id', resultsToDelete);

      if (error) {
        console.error('Error cleaning up old results:', error);
      } else {
        console.log(`Cleaned up ${resultsToDelete.length} old VaR results`);
      }
    }
  } catch (error) {
    console.error('Unexpected error in cleanupOldResults:', error);
  }
}


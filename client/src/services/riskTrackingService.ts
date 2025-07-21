import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type RiskMetric = Database['public']['Tables']['risk_metrics']['Row'];
type PortfolioPerformance = Database['public']['Tables']['portfolio_performance']['Row'];

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface RiskTrackingData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: () => string;
  }[];
}

export interface RiskThresholdAlert {
  id: string;
  type: 'var_breach' | 'volatility_high' | 'sharpe_low' | 'performance';
  message: string;
  severity: 'low' | 'medium' | 'high';
  triggeredAt: string;
  isActive: boolean;
}

/**
 * Risk Tracking Service
 * 
 * Fetches historical risk metrics and performance data from Supabase
 * for display in the Risk Tracking charts and monitoring dashboards
 */
class RiskTrackingService {
  
  /**
   * Get historical risk metrics for a specific metric type
   */
  async getRiskMetricHistory(
    portfolioId: string,
    metricType: 'var' | 'volatility' | 'sharpe_ratio' | 'beta' | 'max_drawdown',
    confidenceLevel?: number,
    timeHorizon?: number,
    daysBack: number = 90
  ): Promise<TimeSeriesDataPoint[]> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(portfolioId)) {
        console.warn(`Invalid portfolio ID format: ${portfolioId}. Using fallback to mock data.`);
        return [];
      }

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysBack);

      let query = supabase
        .from('risk_metrics')
        .select('calculation_date, value, confidence_level, time_horizon')
        .eq('portfolio_id', portfolioId)
        .eq('metric_type', metricType)
        .gte('calculation_date', fromDate.toISOString().split('T')[0])
        .order('calculation_date', { ascending: true });

      // Add confidence level filter for VaR/CVaR
      if (confidenceLevel !== undefined) {
        query = query.eq('confidence_level', confidenceLevel);
      }

      // Add time horizon filter
      if (timeHorizon !== undefined) {
        query = query.eq('time_horizon', timeHorizon);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map(metric => ({
        date: metric.calculation_date,
        value: parseFloat(metric.value.toString()),
        label: this.formatMetricLabel(metricType, metric.value, confidenceLevel)
      }));

    } catch (error) {
      console.error('Error fetching risk metric history:', error);
      throw error;
    }
  }

  /**
   * Get portfolio performance history
   */
  async getPortfolioPerformanceHistory(
    portfolioId: string,
    daysBack: number = 90
  ): Promise<PortfolioPerformance[]> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('portfolio_performance')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .gte('date', fromDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('Error fetching portfolio performance history:', error);
      throw error;
    }
  }

  /**
   * Get formatted time series data for charts
   */
  async getTimeSeriesData(
    portfolioId: string,
    metricType: 'var' | 'volatility' | 'sharpe_ratio' | 'beta',
    timeFrame: '1m' | '3m' | '6m' | '1y' | 'all'
  ): Promise<RiskTrackingData> {
    try {
      const daysBack = this.getTimeFrameDays(timeFrame);
      
      let data: TimeSeriesDataPoint[] = [];
      let color = '#007AFF';
      let label = metricType;

      if (metricType === 'var') {
        // Get VaR data with 95% confidence level
        data = await this.getRiskMetricHistory(portfolioId, 'var', 0.95, 1, daysBack);
        color = '#FF3B30';
        label = 'Value at Risk (95%)';
      } else if (metricType === 'volatility') {
        data = await this.getRiskMetricHistory(portfolioId, 'volatility', undefined, 252, daysBack);
        color = '#FF9500';
        label = 'Annualized Volatility';
      } else if (metricType === 'sharpe_ratio') {
        data = await this.getRiskMetricHistory(portfolioId, 'sharpe_ratio', undefined, 252, daysBack);
        color = '#34C759';
        label = 'Sharpe Ratio';
      } else if (metricType === 'beta') {
        data = await this.getRiskMetricHistory(portfolioId, 'beta', undefined, 252, daysBack);
        color = '#007AFF';
        label = 'Beta';
      }

      // If no historical data, return mock data for now
      if (data.length === 0) {
        return this.getMockTimeSeriesData(metricType, timeFrame);
      }

      // Format for chart
      const labels = data.map(point => this.formatDateLabel(point.date, timeFrame));
      const values = data.map(point => metricType === 'var' || metricType === 'volatility' 
        ? point.value * 100 // Convert to percentage
        : point.value
      );

             return {
         labels,
         datasets: [{
           label: label,
           data: values,
           color: () => color
         }]
       };

    } catch (error) {
      console.error('Error getting time series data:', error);
      // Return mock data on error
      return this.getMockTimeSeriesData(metricType, timeFrame);
    }
  }

  /**
   * Get current risk alerts for a portfolio
   */
  async getRiskAlerts(portfolioId: string): Promise<RiskThresholdAlert[]> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('is_active', true)
        .order('triggered_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(alert => ({
        id: alert.id,
        type: alert.alert_type as any,
        message: alert.message || '',
        severity: this.getAlertSeverity(alert.alert_type, alert.current_value, alert.threshold_value),
        triggeredAt: alert.triggered_at || alert.created_at,
        isActive: alert.is_active
      }));

    } catch (error) {
      console.error('Error fetching risk alerts:', error);
      return [];
    }
  }

  /**
   * Get latest risk metrics for a portfolio
   */
  async getLatestRiskMetrics(portfolioId: string) {
    try {
      const { data, error } = await supabase
        .from('risk_metrics')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('calculation_date', { ascending: false })
        .limit(10); // Get latest for each metric type

      if (error) {
        throw error;
      }

      // Group by metric type and get the latest for each
      const latestMetrics: Record<string, any> = {};
      
      (data || []).forEach(metric => {
        const key = `${metric.metric_type}_${metric.confidence_level || 'default'}_${metric.time_horizon || 'default'}`;
        if (!latestMetrics[key] || latestMetrics[key].calculation_date < metric.calculation_date) {
          latestMetrics[key] = metric;
        }
      });

      return {
        var95: latestMetrics['var_0.95_1']?.value ? latestMetrics['var_0.95_1'].value * 100 : null,
        volatility: latestMetrics['volatility_default_252']?.value ? latestMetrics['volatility_default_252'].value * 100 : null,
        sharpeRatio: latestMetrics['sharpe_ratio_default_252']?.value || null,
        beta: latestMetrics['beta_default_252']?.value || null,
        maxDrawdown: latestMetrics['max_drawdown_default_default']?.value ? latestMetrics['max_drawdown_default_default'].value * 100 : null,
        lastUpdated: data?.[0]?.calculation_date || null
      };

    } catch (error) {
      console.error('Error fetching latest risk metrics:', error);
      return null;
    }
  }

  /**
   * Store risk calculation request (for tracking which calculations are in progress)
   */
  async recordRiskCalculationRequest(portfolioId: string, methodology: string) {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          setting_key: 'last_risk_calculation',
          setting_value: {
            portfolio_id: portfolioId,
            methodology,
            requested_at: new Date().toISOString(),
            status: 'in_progress'
          }
        }, {
          onConflict: 'user_id,setting_key'
        });

      if (error) {
        console.error('Error recording calculation request:', error);
      }
    } catch (error) {
      console.error('Error recording calculation request:', error);
    }
  }

  // Helper methods

  private getTimeFrameDays(timeFrame: string): number {
    switch (timeFrame) {
      case '1m': return 30;
      case '3m': return 90;
      case '6m': return 180;
      case '1y': return 365;
      case 'all': return 365 * 3; // 3 years max
      default: return 180;
    }
  }

  private formatDateLabel(date: string, timeFrame: string): string {
    const d = new Date(date);
    
    switch (timeFrame) {
      case '1m':
        return d.getDate().toString();
      case '3m':
        return `${d.getMonth() + 1}/${d.getDate()}`;
      case '6m':
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case '1y':
        return d.toLocaleDateString('en-US', { month: 'short' });
      case 'all':
        return d.getFullYear().toString();
      default:
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  private formatMetricLabel(metricType: string, value: number, confidenceLevel?: number): string {
    const formattedValue = (metricType === 'var' || metricType === 'volatility') 
      ? `${(value * 100).toFixed(2)}%`
      : value.toFixed(2);

    if (metricType === 'var' && confidenceLevel) {
      return `VaR (${(confidenceLevel * 100)}%): ${formattedValue}`;
    }

    return `${metricType}: ${formattedValue}`;
  }

  private getAlertSeverity(alertType: string, currentValue: number | null, thresholdValue: number | null): 'low' | 'medium' | 'high' {
    if (!currentValue || !thresholdValue) return 'medium';

    const ratio = Math.abs(currentValue) / Math.abs(thresholdValue);

    if (alertType.includes('var') || alertType.includes('volatility')) {
      if (ratio > 2) return 'high';
      if (ratio > 1.5) return 'medium';
      return 'low';
    }

    return 'medium';
  }

  private getMockTimeSeriesData(metricType: string, timeFrame: string): RiskTrackingData {
    // Fallback mock data when no historical data is available
    const getLabels = () => {
      switch (timeFrame) {
        case '1m': return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        case '3m': return ['Month 1', 'Month 2', 'Month 3'];
        case '6m': return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        case '1y': return ['Q1', 'Q2', 'Q3', 'Q4'];
        case 'all': return ['2022', '2023', '2024'];
        default: return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      }
    };

    const getData = () => {
      switch (metricType) {
        case 'var': return [3.2, 3.5, 3.1, 3.7, 3.3, 1.8];
        case 'volatility': return [18.4, 17.9, 18.8, 19.2, 18.7, 16.2];
        case 'sharpe_ratio': return [0.95, 1.02, 0.98, 1.05, 1.12, 1.28];
        case 'beta': return [0.92, 0.89, 0.91, 0.94, 0.88, 0.82];
        default: return [1, 2, 3, 4, 5, 6];
      }
    };

    const getColor = () => {
      switch (metricType) {
        case 'var': return '#FF3B30';
        case 'volatility': return '#FF9500';
        case 'sharpe_ratio': return '#34C759';
        case 'beta': return '#007AFF';
        default: return '#007AFF';
      }
    };

    return {
      labels: getLabels(),
      datasets: [{
        label: metricType,
        data: getData(),
        color: () => getColor()
      }]
    };
  }
}

export const riskTrackingService = new RiskTrackingService();
export default riskTrackingService; 
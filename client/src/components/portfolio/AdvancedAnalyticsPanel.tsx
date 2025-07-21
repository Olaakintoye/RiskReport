import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface AdvancedAnalytics {
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
    vanna: number;
    charm: number;
  };
  factorExposure: {
    value: number;
    growth: number;
    momentum: number;
    quality: number;
    volatility: number;
    size: number;
  };
  efficiency: {
    sharpeRatio: number;
    informationRatio: number;
    treynorRatio: number;
    calmarRatio: number;
    trackingError: number;
    activeReturn: number;
  };
  attribution: {
    assetAllocation: number;
    stockSelection: number;
    timing: number;
    interaction: number;
  };
}

interface AdvancedAnalyticsPanelProps {
  portfolioIds: string[];
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const AdvancedAnalyticsPanel: React.FC<AdvancedAnalyticsPanelProps> = ({
  portfolioIds,
  isVisible,
  onToggleVisibility
}) => {
  const [analytics, setAnalytics] = useState<AdvancedAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'greeks' | 'factors' | 'efficiency' | 'attribution'>('greeks');

  useEffect(() => {
    if (isVisible && portfolioIds.length > 0) {
      loadAnalytics();
    }
  }, [isVisible, portfolioIds]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Mock data - in real app, this would come from advanced analytics service
      const mockAnalytics: AdvancedAnalytics = {
        greeks: {
          delta: 0.67,
          gamma: 0.12,
          theta: -0.08,
          vega: 0.25,
          rho: 0.15,
          vanna: 0.032,
          charm: -0.014
        },
        factorExposure: {
          value: -0.15,
          growth: 0.35,
          momentum: 0.12,
          quality: 0.08,
          volatility: -0.22,
          size: 0.05
        },
        efficiency: {
          sharpeRatio: 1.32,
          informationRatio: 0.85,
          treynorRatio: 0.078,
          calmarRatio: 0.92,
          trackingError: 3.2,
          activeReturn: 2.8
        },
        attribution: {
          assetAllocation: 1.2,
          stockSelection: 0.8,
          timing: -0.3,
          interaction: 0.1
        }
      };
      
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading advanced analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFactorChart = (factors: Record<string, number>) => {
    const size = 120;
    const center = size / 2;
    const radius = 40;
    
    const factorEntries = Object.entries(factors);
    const angleStep = (2 * Math.PI) / factorEntries.length;
    
    const points = factorEntries.map(([key, value], index) => {
      const angle = index * angleStep - Math.PI / 2;
      const normalizedValue = Math.max(0, Math.min(1, (value + 1) / 2)); // Normalize to 0-1
      const x = center + Math.cos(angle) * radius * normalizedValue;
      const y = center + Math.sin(angle) * radius * normalizedValue;
      return { x, y, key, value };
    });
    
    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ') + ' Z';
    
    return (
      <View style={styles.factorChart}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="factorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </LinearGradient>
          </Defs>
          
          {/* Background circles */}
          {[0.25, 0.5, 0.75, 1].map((scale, index) => (
            <Circle
              key={index}
              cx={center}
              cy={center}
              r={radius * scale}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          ))}
          
          {/* Factor area */}
          <Path
            d={pathData}
            fill="url(#factorGradient)"
            stroke="#3b82f6"
            strokeWidth={2}
          />
          
          {/* Factor labels */}
          {factorEntries.map(([key, value], index) => {
            const angle = index * angleStep - Math.PI / 2;
            const labelX = center + Math.cos(angle) * (radius + 15);
            const labelY = center + Math.sin(angle) * (radius + 15);
            
            return (
              <text
                key={key}
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill="#64748b"
              >
                {key}
              </text>
            );
          })}
        </Svg>
      </View>
    );
  };

  const renderGreeks = () => {
    if (!analytics) return null;
    
    return (
      <View style={styles.greeksContainer}>
        {Object.entries(analytics.greeks).map(([key, value]) => (
          <View key={key} style={styles.greekItem}>
            <Text style={styles.greekLabel}>{key.toUpperCase()}</Text>
            <Text style={[
              styles.greekValue,
              value >= 0 ? styles.positiveValue : styles.negativeValue
            ]}>
              {value >= 0 ? '+' : ''}{value.toFixed(3)}
            </Text>
            <View style={styles.greekBar}>
              <View style={[
                styles.greekBarFill,
                { 
                  width: `${Math.abs(value) * 100}%`,
                  backgroundColor: value >= 0 ? '#10b981' : '#ef4444'
                }
              ]} />
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderFactorExposure = () => {
    if (!analytics) return null;
    
    return (
      <View style={styles.factorContainer}>
        {renderFactorChart(analytics.factorExposure)}
        <View style={styles.factorLegend}>
          {Object.entries(analytics.factorExposure).map(([key, value]) => (
            <View key={key} style={styles.factorLegendItem}>
              <View style={[
                styles.factorLegendColor,
                { backgroundColor: value >= 0 ? '#10b981' : '#ef4444' }
              ]} />
              <Text style={styles.factorLegendText}>{key}</Text>
              <Text style={[
                styles.factorLegendValue,
                value >= 0 ? styles.positiveValue : styles.negativeValue
              ]}>
                {value >= 0 ? '+' : ''}{value.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderEfficiency = () => {
    if (!analytics) return null;
    
    return (
      <View style={styles.efficiencyContainer}>
        <View style={styles.efficiencyGrid}>
          {Object.entries(analytics.efficiency).map(([key, value]) => (
            <View key={key} style={styles.efficiencyItem}>
              <Text style={styles.efficiencyLabel}>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </Text>
              <Text style={styles.efficiencyValue}>
                {typeof value === 'number' ? 
                  (key.includes('Ratio') ? value.toFixed(2) : `${value.toFixed(2)}%`) : 
                  value
                }
              </Text>
              <View style={styles.efficiencyIndicator}>
                <View style={[
                  styles.efficiencyIndicatorFill,
                  { 
                    width: `${Math.min(100, Math.abs(value) * 10)}%`,
                    backgroundColor: value >= 0 ? '#10b981' : '#ef4444'
                  }
                ]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderAttribution = () => {
    if (!analytics) return null;
    
    const total = Object.values(analytics.attribution).reduce((sum, val) => sum + val, 0);
    
    return (
      <View style={styles.attributionContainer}>
        <View style={styles.attributionChart}>
          <Text style={styles.attributionTitle}>Performance Attribution</Text>
          <Text style={styles.attributionTotal}>
            Total: {total >= 0 ? '+' : ''}{total.toFixed(2)}%
          </Text>
          
          <View style={styles.attributionBars}>
            {Object.entries(analytics.attribution).map(([key, value]) => (
              <View key={key} style={styles.attributionItem}>
                <View style={styles.attributionItemHeader}>
                  <Text style={styles.attributionItemLabel}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Text>
                  <Text style={[
                    styles.attributionItemValue,
                    value >= 0 ? styles.positiveValue : styles.negativeValue
                  ]}>
                    {value >= 0 ? '+' : ''}{value.toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.attributionBar}>
                  <View style={[
                    styles.attributionBarFill,
                    { 
                      width: `${Math.abs(value) * 20}%`,
                      backgroundColor: value >= 0 ? '#10b981' : '#ef4444'
                    }
                  ]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (!isVisible) {
    return (
      <TouchableOpacity style={styles.toggleButton} onPress={onToggleVisibility}>
        <MaterialCommunityIcons name="chart-line-variant" size={16} color="#3b82f6" />
        <Text style={styles.toggleButtonText}>Advanced Analytics</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Advanced Analytics</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onToggleVisibility}>
          <MaterialCommunityIcons name="close" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {['greeks', 'factors', 'efficiency', 'attribution'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selectedTab === tab && styles.selectedTab
            ]}
            onPress={() => setSelectedTab(tab as any)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab && styles.selectedTabText
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {selectedTab === 'greeks' && renderGreeks()}
          {selectedTab === 'factors' && renderFactorExposure()}
          {selectedTab === 'efficiency' && renderEfficiency()}
          {selectedTab === 'attribution' && renderAttribution()}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  selectedTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    color: '#64748b',
  },
  selectedTabText: {
    color: '#1e293b',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
  },
  content: {
    maxHeight: 300,
  },
  greeksContainer: {
    gap: 12,
  },
  greekItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  greekLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  greekValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  positiveValue: {
    color: '#10b981',
  },
  negativeValue: {
    color: '#ef4444',
  },
  greekBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  greekBarFill: {
    height: '100%',
  },
  factorContainer: {
    alignItems: 'center',
  },
  factorChart: {
    marginBottom: 20,
  },
  factorLegend: {
    width: '100%',
    gap: 8,
  },
  factorLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  factorLegendText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  factorLegendValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  efficiencyContainer: {
    padding: 8,
  },
  efficiencyGrid: {
    gap: 12,
  },
  efficiencyItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  efficiencyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  efficiencyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  efficiencyIndicator: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  efficiencyIndicatorFill: {
    height: '100%',
  },
  attributionContainer: {
    padding: 8,
  },
  attributionChart: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  attributionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  attributionTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  attributionBars: {
    gap: 12,
  },
  attributionItem: {
    marginBottom: 8,
  },
  attributionItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  attributionItemLabel: {
    fontSize: 14,
    color: '#374151',
  },
  attributionItemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  attributionBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  attributionBarFill: {
    height: '100%',
  },
});

export default AdvancedAnalyticsPanel; 
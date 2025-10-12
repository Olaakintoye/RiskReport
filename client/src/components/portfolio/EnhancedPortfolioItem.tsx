import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import Svg, { Path, Circle } from 'react-native-svg';
import { PortfolioSummary } from '../../services/portfolioService';

interface EnhancedPortfolioItemProps {
  portfolio: PortfolioSummary;
  onPress: (portfolio: PortfolioSummary) => void;
  onDelete: (id: string) => void;
  onEdit: (portfolio: PortfolioSummary) => void;
  onQuickAction: (portfolio: PortfolioSummary, action: string) => void;
  showAdvancedMetrics?: boolean;
}

const EnhancedPortfolioItem: React.FC<EnhancedPortfolioItemProps> = ({
  portfolio,
  onPress,
  onDelete,
  onEdit,
  onQuickAction,
  showAdvancedMetrics = true
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const generateSparklinePath = (data: number[], width: number, height: number): string => {
    if (data.length === 0) return '';
    
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const range = maxValue - minValue || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - minValue) / range) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  const renderSparkline = (data: number[], isPositive: boolean) => {
    const width = 80;
    const height = 20;
    const path = generateSparklinePath(data, width, height);
    
    return (
      <Svg width={width} height={height}>
        <Path
          d={path}
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>
    );
  };

  const renderInteractiveAllocation = () => {
    const allocationEntries = Object.entries(portfolio.allocation);
    const radius = 30;
    const strokeWidth = 6;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    
    let cumulativePercent = 0;
    
    return (
      <View style={styles.allocationContainer}>
        <Svg width={radius * 2} height={radius * 2}>
          {allocationEntries.map(([key, value], index) => {
            const strokeDasharray = `${value * circumference / 100} ${circumference}`;
            const strokeDashoffset = -cumulativePercent * circumference / 100;
            cumulativePercent += value;
            
            return (
              <Circle
                key={key}
                cx={radius}
                cy={radius}
                r={normalizedRadius}
                fill="none"
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
        <View style={styles.allocationCenter}>
          <Text style={styles.allocationText}>
            {Object.keys(portfolio.allocation).length}
          </Text>
          <Text style={styles.allocationLabel}>Assets</Text>
        </View>
      </View>
    );
  };

  const renderQuickActions = () => {
    const quickActions = [
      { key: 'rebalance', icon: 'scale-balance', label: 'Rebalance' },
      { key: 'analyze', icon: 'chart-line', label: 'Analyze' },
      { key: 'stress_test', icon: 'flash', label: 'Stress Test' },
      { key: 'export', icon: 'download', label: 'Export' }
    ];

    return (
      <View style={styles.quickActionsContainer}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={styles.quickAction}
            onPress={() => onQuickAction(portfolio, action.key)}
          >
            <MaterialCommunityIcons
              name={action.icon as any}
              size={14}
              color="#000000"
            />
            <Text style={styles.quickActionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderAdvancedMetrics = () => {
    if (!showAdvanced) return null;
    
    // Mock advanced metrics - in real app, these would come from the portfolio
    const metrics = {
      sharpeRatio: 1.32,
      beta: 0.85,
      alpha: 2.1,
      maxDrawdown: 12.5,
      volatility: 18.2,
      var95: 4.2
    };

    return (
      <View style={styles.advancedMetricsContainer}>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Sharpe</Text>
            <Text style={styles.metricValue}>{metrics.sharpeRatio.toFixed(2)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Beta</Text>
            <Text style={styles.metricValue}>{metrics.beta.toFixed(2)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Alpha</Text>
            <Text style={[styles.metricValue, styles.positiveValue]}>
                              +{metrics.alpha.toFixed(2)}%
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>VaR</Text>
                          <Text style={styles.metricValue}>{metrics.var95.toFixed(2)}%</Text>
          </View>
        </View>
        
        <View style={styles.riskIndicators}>
          <View style={styles.riskIndicator}>
            <Text style={styles.riskLabel}>Volatility</Text>
            <View style={styles.riskBar}>
              <View style={[
                styles.riskBarFill,
                { width: `${metrics.volatility}%`, backgroundColor: '#f59e0b' }
              ]} />
            </View>
            <Text style={styles.riskValue}>{metrics.volatility}%</Text>
          </View>
          <View style={styles.riskIndicator}>
            <Text style={styles.riskLabel}>Max Drawdown</Text>
            <View style={styles.riskBar}>
              <View style={[
                styles.riskBarFill,
                { width: `${metrics.maxDrawdown * 2}%`, backgroundColor: '#ef4444' }
              ]} />
            </View>
            <Text style={styles.riskValue}>{metrics.maxDrawdown}%</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity 
          style={[styles.swipeAction, styles.editAction]}
          onPress={() => onEdit(portfolio)}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Edit</Text>
          </Animated.View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => {
            Alert.alert(
              "Delete Portfolio",
              `Are you sure you want to delete "${portfolio.name}"?`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => onDelete(portfolio.id) }
              ]
            );
          }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <MaterialCommunityIcons name="trash-can" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Delete</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const toggleFavorite = () => {
    setFavorited(!favorited);
    // In real app, this would update the portfolio favorite status
  };

  const mockSparklineData = [98, 100, 102, 99, 101, 103, 100, 105, 102, 104];

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity 
        style={[styles.portfolioCard, favorited && styles.favoritedCard]}
        onPress={() => onPress(portfolio)}
        activeOpacity={0.9}
      >
        <View style={styles.cardContainer}>
          {/* Header */}
          <View style={styles.portfolioHeader}>
            <View style={styles.portfolioTitleContainer}>
              <Text style={styles.portfolioName}>{portfolio.name}</Text>
              <View style={styles.portfolioBadge}>
                <Text style={styles.portfolioBadgeText}>
                  {Object.keys(portfolio.allocation)[0]?.toUpperCase() || 'MIXED'}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.favoriteButton}
                onPress={toggleFavorite}
              >
                <MaterialCommunityIcons
                  name={favorited ? 'heart' : 'heart-outline'}
                  size={18}
                  color={favorited ? '#ef4444' : '#94a3b8'}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuButton} 
                onPress={() => setShowMenu(!showMenu)}
              >
                <MaterialCommunityIcons name="dots-vertical" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Performance Overview */}
          <View style={styles.performanceContainer}>
            <View style={styles.performanceMain}>
              <Text style={styles.portfolioValue}>
                {formatCurrency(portfolio.totalValue)}
              </Text>
              <View style={styles.performanceChange}>
                <Text style={[
                  styles.change,
                  portfolio.oneDayPL >= 0 ? styles.positiveChange : styles.negativeChange
                ]}>
                  {portfolio.oneDayPL >= 0 ? '▴' : '▾'} {formatPercentage(portfolio.oneDayPL / portfolio.totalValue * 100)}
                </Text>
                <Text style={styles.changeLabel}>Today</Text>
              </View>
            </View>
            <View style={styles.performanceChart}>
              {renderSparkline(mockSparklineData, portfolio.oneDayPL >= 0)}
            </View>
          </View>

          {/* Allocation and Risk */}
          <View style={styles.allocationSection}>
            {renderInteractiveAllocation()}
            <View style={styles.allocationDetails}>
              <View style={styles.allocationLegend}>
                {Object.entries(portfolio.allocation).slice(0, 3).map(([key, value], index) => (
                  <View key={key} style={styles.legendItem}>
                    <View 
                      style={[
                        styles.legendColor, 
                        { backgroundColor: COLORS[index % COLORS.length] }
                      ]} 
                    />
                    <Text style={styles.legendText}>
                      {key.charAt(0).toUpperCase() + key.slice(1)} {value.toFixed(2)}%
                    </Text>
                  </View>
                ))}
                {Object.keys(portfolio.allocation).length > 3 && (
                  <Text style={styles.moreLegendText}>+{Object.keys(portfolio.allocation).length - 3} more</Text>
                )}
              </View>
              
              <View style={styles.riskSummary}>
                <View style={styles.riskItem}>
                  <Text style={styles.riskLabel}>VaR</Text>
                  <Text style={styles.riskValue}>{portfolio.lastVaR?.toFixed(2) || '4.20'}%</Text>
                </View>
                <View style={styles.riskItem}>
                  <Text style={styles.riskLabel}>Risk</Text>
                  <View style={[
                    styles.riskIndicatorDot,
                    { backgroundColor: (portfolio.lastVaR || 4.2) > 5 ? '#ef4444' : '#10b981' }
                  ]} />
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          {renderQuickActions()}

          {/* Advanced Metrics Toggle */}
          {showAdvancedMetrics && (
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <MaterialCommunityIcons
                name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#64748b"
              />
              <Text style={styles.advancedToggleText}>
                {showAdvanced ? 'Hide' : 'Show'} Advanced Metrics
              </Text>
            </TouchableOpacity>
          )}

          {/* Advanced Metrics */}
          {renderAdvancedMetrics()}

          {/* Dropdown Menu */}
          {showMenu && (
            <View style={styles.menuContainer}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onPress(portfolio);
                }}
              >
                <MaterialCommunityIcons name="eye" size={16} color="#64748b" />
                <Text style={styles.menuItemText}>View Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onQuickAction(portfolio, 'update_prices');
                }}
              >
                <MaterialCommunityIcons name="refresh" size={16} color="#10b981" />
                <Text style={styles.menuItemText}>Update Prices</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onEdit(portfolio);
                }}
              >
                <MaterialCommunityIcons name="pencil" size={16} color="#64748b" />
                <Text style={styles.menuItemText}>Edit Portfolio</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onQuickAction(portfolio, 'duplicate');
                }}
              >
                <MaterialCommunityIcons name="content-copy" size={16} color="#3b82f6" />
                <Text style={styles.menuItemText}>Duplicate</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.menuItem, styles.deleteMenuItem]}
                onPress={() => {
                  setShowMenu(false);
                  onDelete(portfolio.id);
                }}
              >
                <MaterialCommunityIcons name="delete" size={16} color="#ef4444" />
                <Text style={styles.deleteMenuItemText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  portfolioCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
    overflow: 'hidden',
  },
  favoritedCard: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  cardContainer: {
    padding: 16,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portfolioTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginRight: 8,
  },
  portfolioBadge: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  portfolioBadgeText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 8,
    marginRight: 4,
  },
  menuButton: {
    padding: 8,
  },
  performanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  performanceMain: {
    flex: 1,
  },
  portfolioValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  performanceChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  change: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  positiveChange: {
    color: '#10b981',
  },
  negativeChange: {
    color: '#ef4444',
  },
  changeLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  performanceChart: {
    alignItems: 'center',
  },
  allocationSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  allocationContainer: {
    position: 'relative',
    marginRight: 16,
  },
  allocationCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allocationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  allocationLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  allocationDetails: {
    flex: 1,
  },
  allocationLegend: {
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  moreLegendText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  riskSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskLabel: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 6,
  },
  riskValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  riskIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  quickActionText: {
    fontSize: 10,
    color: '#000000',
    fontWeight: '600',
    marginLeft: 4,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  advancedToggleText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  advancedMetricsContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metricItem: {
    width: '50%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  positiveValue: {
    color: '#10b981',
  },
  riskIndicators: {
    gap: 8,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  riskBarFill: {
    height: '100%',
  },
  menuContainer: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
    minWidth: 160,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  deleteMenuItem: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  deleteMenuItemText: {
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 8,
  },
  swipeActions: {
    flexDirection: 'row',
    width: 160,
  },
  swipeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAction: {
    backgroundColor: '#3b82f6',
  },
  deleteAction: {
    backgroundColor: '#ef4444',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default EnhancedPortfolioItem; 
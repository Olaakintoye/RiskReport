import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';

// Import services
import { getRiskBreakdown } from '../../../../services/riskService';
import portfolioService, { Portfolio, Asset } from '../../../../services/portfolioService';

// Interface for position risk data
interface PositionRiskData {
  symbol: string;
  name: string;
  allocation: number;
  riskContribution: number;
  color: string;
}

interface PositionRiskCardProps {
  portfolioId: string;
  onViewMore?: () => void;
  onDrillDown: (symbol: string) => void;
  detailed?: boolean;
}

const PositionRiskCard: React.FC<PositionRiskCardProps> = ({
  portfolioId,
  onViewMore,
  onDrillDown,
  detailed = false
}) => {
  const [loading, setLoading] = useState(true);
  const [positionRiskData, setPositionRiskData] = useState<{
    totalRisk: number;
    positions: PositionRiskData[];
  } | null>(null);
  const [chartView, setChartView] = useState('risk'); // 'risk' or 'allocation'
  
  // Screen width for responsive chart
  const screenWidth = Dimensions.get('window').width - (detailed ? 32 : 64);

  // Colors for different positions
  const positionColors = [
    '#FF3B30', // Red
    '#FF9500', // Orange
    '#FFCC00', // Yellow
    '#34C759', // Green
    '#007AFF', // Blue
    '#5856D6', // Purple
    '#AF52DE', // Pink
    '#8E8E93'  // Gray (for "Others")
  ];
  
  useEffect(() => {
    const loadPositionRiskData = async () => {
      setLoading(true);
      try {
        // Get portfolio details to calculate allocations
        const portfolio = await portfolioService.getPortfolioById(portfolioId);
        if (!portfolio) {
          throw new Error(`Portfolio with ID ${portfolioId} not found`);
        }

        // Get risk breakdown for the portfolio
        const riskBreakdown = await getRiskBreakdown(portfolioId);
        
        // Calculate total portfolio value and position allocations
        const portfolioValue = portfolio.assets.reduce(
          (sum: number, asset: Asset) => sum + asset.price * asset.quantity, 0
        );
        
        // Create position data with allocations, risk contributions, and colors
        const positionData: PositionRiskData[] = [];
        
        // Map risk breakdown positions to our data structure
        riskBreakdown.positions.forEach((position: { symbol: string; name: string; contribution: number }, index: number) => {
          // Find matching asset in portfolio for allocation
          const matchingAsset = portfolio.assets.find((asset: Asset) => asset.symbol === position.symbol);
          
          if (matchingAsset) {
            const allocation = (matchingAsset.price * matchingAsset.quantity / portfolioValue) * 100;
            
            positionData.push({
              symbol: position.symbol,
              name: position.name,
              allocation: parseFloat(allocation.toFixed(1)),
              riskContribution: position.contribution,
              color: positionColors[index % positionColors.length]
            });
          }
        });
        
        // Handle "Others" category if we have more than 6 positions
        if (positionData.length > 6) {
          const topPositions = positionData.slice(0, 6);
          const otherPositions = positionData.slice(6);
          
          const otherAllocation = otherPositions.reduce((sum, pos) => sum + pos.allocation, 0);
          const otherRiskContribution = otherPositions.reduce((sum, pos) => sum + pos.riskContribution, 0);
          
          topPositions.push({
            symbol: 'OTHERS',
            name: 'Other Positions',
            allocation: parseFloat(otherAllocation.toFixed(1)),
            riskContribution: parseFloat(otherRiskContribution.toFixed(1)),
            color: '#8E8E93' // Gray color for "Others"
          });
          
          setPositionRiskData({
            totalRisk: 100,
            positions: topPositions
          });
        } else {
          setPositionRiskData({
            totalRisk: 100,
            positions: positionData
          });
        }
      } catch (error) {
        console.error('Error loading position risk data:', error);
        setPositionRiskData(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadPositionRiskData();
  }, [portfolioId]);
  
  if (loading) {
    return (
      <View style={[styles.container, detailed && styles.detailedContainer]}>
        {!detailed && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Position Risk Analysis</Text>
          </View>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading position risk data...</Text>
        </View>
      </View>
    );
  }
  
  if (!positionRiskData) {
    return (
      <View style={[styles.container, detailed && styles.detailedContainer]}>
        {!detailed && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Position Risk Analysis</Text>
          </View>
        )}
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Failed to load position risk data</Text>
        </View>
      </View>
    );
  }
  
  // Prepare chart data
  const chartData = positionRiskData.positions.map((position) => ({
    name: position.symbol,
    value: chartView === 'risk' ? position.riskContribution : position.allocation,
    color: position.color,
    legendFontColor: '#7F7F7F',
    legendFontSize: 12
  }));

  // Calculate insight - find position with highest risk/allocation ratio
  const highestRiskContributor = [...positionRiskData.positions]
    .filter(p => p.symbol !== 'OTHERS')
    .sort((a, b) => (b.riskContribution / b.allocation) - (a.riskContribution / a.allocation))[0];
  
  return (
    <View style={[styles.container, detailed && styles.detailedContainer]}>
      {!detailed && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Position Risk Analysis</Text>
          {onViewMore && (
            <TouchableOpacity
              style={styles.viewMoreButton}
              onPress={onViewMore}
            >
              <Text style={styles.viewMoreText}>See Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      <View style={styles.viewSelector}>
        <TouchableOpacity
          style={[
            styles.viewButton,
            chartView === 'risk' && styles.activeViewButton
          ]}
          onPress={() => setChartView('risk')}
        >
          <Text
            style={[
              styles.viewButtonText,
              chartView === 'risk' && styles.activeViewButtonText
            ]}
          >
            Risk Contribution
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.viewButton,
            chartView === 'allocation' && styles.activeViewButton
          ]}
          onPress={() => setChartView('allocation')}
        >
          <Text
            style={[
              styles.viewButtonText,
              chartView === 'allocation' && styles.activeViewButtonText
            ]}
          >
            Allocation
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.chartSection}>
        <View style={styles.pieChartContainer}>
          <PieChart
            data={chartData}
            width={detailed ? screenWidth : screenWidth / 1.1 }
            height={180}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft={detailed ? "0" : "0"}
            absolute
            hasLegend={false}
          />
        </View>
        
        <View style={styles.legendContainer}>
          {positionRiskData.positions.slice(0, 5).map((position, index) => (
            <TouchableOpacity
              key={index}
              style={styles.legendItem}
              onPress={() => onDrillDown(position.symbol)}
            >
              <View style={[styles.colorIndicator, { backgroundColor: position.color }]} />
              <View style={styles.legendItemContent}>
                <Text style={styles.legendSymbol}>{position.symbol}</Text>
                <Text style={styles.legendValue}>
                  {chartView === 'risk' ? position.riskContribution : position.allocation}%
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {positionRiskData.positions.length > 5 && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={onViewMore || (() => {})}
              disabled={!onViewMore && !detailed}
            >
              <Text style={styles.moreButtonText}>
                +{positionRiskData.positions.length - 5} more
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {detailed && (
        <View style={styles.detailedTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.symbolCell]}>Symbol</Text>
            <Text style={[styles.tableHeaderCell, styles.nameCell]}>Name</Text>
            <Text style={[styles.tableHeaderCell, styles.valueCell]}>Allocation</Text>
            <Text style={[styles.tableHeaderCell, styles.valueCell]}>Risk</Text>
          </View>
          
          <FlatList
            data={positionRiskData.positions}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.tableRow}
                onPress={() => onDrillDown(item.symbol)}
              >
                <Text style={[styles.tableCell, styles.symbolCell]}>{item.symbol}</Text>
                <Text style={[styles.tableCell, styles.nameCell]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.tableCell, styles.valueCell]}>{item.allocation}%</Text>
                <Text style={[styles.tableCell, styles.valueCell]}>{item.riskContribution}%</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          
          {highestRiskContributor && (
            <View style={styles.insightBox}>
              <Text style={styles.insightTitle}>Key Insight</Text>
              <Text style={styles.insightText}>
                {highestRiskContributor.name} ({highestRiskContributor.symbol}) contributes {highestRiskContributor.riskContribution}% to portfolio risk while only representing {highestRiskContributor.allocation}% of portfolio allocation,
                indicating it is a significant source of portfolio volatility.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  detailedContainer: {
    flex: 1,
    borderRadius: 0,
    marginVertical: 0,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
  },
  viewSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    padding: 2,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeViewButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  viewButtonText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  activeViewButtonText: {
    color: '#000',
    fontWeight: '500',
  },
  chartSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pieChartContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  legendContainer: {
    flex: 1,
    paddingLeft: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendSymbol: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 14,
    color: '#8E8E93',
  },
  moreButton: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 14,
    color: '#007AFF',
  },
  detailedTable: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  symbolCell: {
    flex: 1,
  },
  nameCell: {
    flex: 2,
  },
  valueCell: {
    flex: 1,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  tableCell: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  insightBox: {
    marginTop: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  insightText: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
});

export default PositionRiskCard; 
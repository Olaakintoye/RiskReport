import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Card, DataTable, ProgressBar } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getRiskBreakdown } from '../../services/riskService';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

interface PositionRiskAnalysisProps {
  portfolioId: string;
  onDrillDown?: (positionSymbol: string) => void;
}

interface PositionRisk {
  symbol: string;
  name: string;
  contribution: number;
  [key: string]: string | number; // Add index signature for dynamic key access
}

const PositionRiskAnalysis: React.FC<PositionRiskAnalysisProps> = ({ portfolioId, onDrillDown }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [positions, setPositions] = useState<PositionRisk[]>([]);
  const [assetClassBreakdown, setAssetClassBreakdown] = useState<Record<string, number>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({
    key: 'contribution',
    direction: 'descending'
  });
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const loadRiskData = async () => {
      try {
        setIsLoading(true);
        const riskData = await getRiskBreakdown(portfolioId);
        setPositions(riskData.positions);
        setAssetClassBreakdown(riskData.assetClass);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading risk breakdown:', error);
        setIsLoading(false);
      }
    };

    loadRiskData();
  }, [portfolioId]);

  const sortPositions = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
    
    const sortedPositions = [...positions].sort((a, b) => {
      if (key === 'symbol' || key === 'name') {
        return direction === 'ascending'
          ? String(a[key]).localeCompare(String(b[key]))
          : String(b[key]).localeCompare(String(a[key]));
      } else {
        return direction === 'ascending'
          ? Number(a[key]) - Number(b[key])
          : Number(b[key]) - Number(a[key]);
      }
    });
    
    setPositions(sortedPositions);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    
    return (
      <MaterialCommunityIcons
        name={sortConfig.direction === 'ascending' ? 'arrow-up' : 'arrow-down'}
        size={16}
        color="#64748b"
      />
    );
  };

  const handlePositionClick = (symbol: string) => {
    if (onDrillDown) {
      onDrillDown(symbol);
    }
  };

  const displayPositions = showAll ? positions : positions.slice(0, 5);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading risk analysis...</Text>
      </View>
    );
  }

  // Format asset class data for the chart
  const chartData = {
    labels: Object.keys(assetClassBreakdown).map(key => key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')),
    datasets: [
      {
        data: Object.values(assetClassBreakdown),
        colors: [
          (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
          (opacity = 1) => `rgba(236, 72, 153, ${opacity})`,
          (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
          (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
        ]
      }
    ]
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  return (
    <Card style={styles.card}>
      <Card.Title 
        title="Position Risk Contribution Analysis" 
        subtitle="Analysis of risk contribution by position and asset class"
      />
      <Card.Content>
        <Text style={styles.sectionTitle}>Risk by Asset Class</Text>
        <View style={styles.chartContainer}>
          <BarChart
            data={chartData}
            width={Dimensions.get('window').width - 64}
            height={220}
            chartConfig={chartConfig}
            fromZero
            showValuesOnTopOfBars
            yAxisLabel=""
          />
        </View>

        <Text style={styles.sectionTitle}>Position Risk Contribution</Text>
        <Text style={styles.description}>
          Positions with higher risk contribution have more impact on overall portfolio volatility.
        </Text>

        <DataTable>
          <DataTable.Header>
            <DataTable.Title 
              onPress={() => sortPositions('symbol')}
              style={styles.symbolColumn}
            >
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>Symbol</Text>
                {getSortIcon('symbol')}
              </View>
            </DataTable.Title>
            <DataTable.Title 
              onPress={() => sortPositions('name')}
              style={styles.nameColumn}
            >
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>Name</Text>
                {getSortIcon('name')}
              </View>
            </DataTable.Title>
            <DataTable.Title 
              onPress={() => sortPositions('contribution')}
              style={styles.contributionColumn}
              numeric
            >
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>Contrib. %</Text>
                {getSortIcon('contribution')}
              </View>
            </DataTable.Title>
          </DataTable.Header>

          {displayPositions.map((position, index) => (
            <TouchableOpacity key={index} onPress={() => handlePositionClick(position.symbol)}>
              <DataTable.Row>
                <DataTable.Cell style={styles.symbolColumn}>{position.symbol}</DataTable.Cell>
                <DataTable.Cell style={styles.nameColumn}>{position.name}</DataTable.Cell>
                <DataTable.Cell style={styles.contributionColumn} numeric>
                  <View style={styles.contributionCell}>
                    <Text style={[
                      styles.contributionValue,
                      position.contribution > 15 ? styles.highContribution :
                      position.contribution > 8 ? styles.mediumContribution :
                      styles.lowContribution
                    ]}>
                      {position.contribution.toFixed(2)}%
                    </Text>
                    <ProgressBar
                      progress={position.contribution / 100}
                      color={
                        position.contribution > 15 ? '#ef4444' :
                        position.contribution > 8 ? '#f59e0b' :
                        '#10b981'
                      }
                      style={styles.contributionBar}
                    />
                  </View>
                </DataTable.Cell>
              </DataTable.Row>
            </TouchableOpacity>
          ))}
        </DataTable>

        {positions.length > 5 && (
          <TouchableOpacity 
            style={styles.showMoreButton} 
            onPress={() => setShowAll(!showAll)}
          >
            <Text style={styles.showMoreText}>
              {showAll ? 'Show Less' : `Show All (${positions.length})`}
            </Text>
            <MaterialCommunityIcons
              name={showAll ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#10b981"
            />
          </TouchableOpacity>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontWeight: '600',
    marginRight: 4,
  },
  symbolColumn: {
    flex: 1,
  },
  nameColumn: {
    flex: 2,
  },
  contributionColumn: {
    flex: 1.5,
  },
  contributionCell: {
    alignItems: 'flex-end',
    width: '100%',
  },
  contributionValue: {
    fontWeight: '600',
    marginBottom: 4,
  },
  highContribution: {
    color: '#ef4444',
  },
  mediumContribution: {
    color: '#f59e0b',
  },
  lowContribution: {
    color: '#10b981',
  },
  contributionBar: {
    height: 4,
    width: '100%',
    borderRadius: 2,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  showMoreText: {
    color: '#10b981',
    fontWeight: '500',
    marginRight: 4,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
});

export default PositionRiskAnalysis; 
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Asset } from '../../services/portfolioService';

interface PortfolioSummaryProps {
  assets: Asset[];
  onRemoveAsset: (assetId: string) => void;
  portfolioName?: string;
  portfolioDescription?: string;
  portfolioType?: 'equity' | 'fixed_income' | 'multi_asset';
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  assets,
  onRemoveAsset,
  portfolioName,
  portfolioDescription,
  portfolioType
}) => {
  // Calculate total portfolio value
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.price * asset.quantity, 0);
  }, [assets]);

  // Calculate sector allocation
  const sectorAllocation = useMemo(() => {
    const allocation: Record<string, { value: number; percentage: number }> = {};
    
    assets.forEach(asset => {
      const assetValue = asset.price * asset.quantity;
      
      if (!allocation[asset.assetClass]) {
        allocation[asset.assetClass] = { value: 0, percentage: 0 };
      }
      
      allocation[asset.assetClass].value += assetValue;
    });
    
    // Calculate percentages
    Object.keys(allocation).forEach(sector => {
      allocation[sector].percentage = (allocation[sector].value / totalValue) * 100;
    });
    
    return allocation;
  }, [assets, totalValue]);

  // Format asset class name for display
  const formatAssetClass = (assetClass: string): string => {
    return assetClass.charAt(0).toUpperCase() + assetClass.slice(1);
  };

  // Get color for asset class
  const getAssetClassColor = (assetClass: string): string => {
    const colors: Record<string, string> = {
      equity: '#3b82f6',
      bond: '#10b981',
      cash: '#f59e0b',
      commodity: '#ef4444',
      alternative: '#8b5cf6',
      real_estate: '#0ea5e9'
    };
    
    return colors[assetClass] || '#64748b';
  };

  // Function to get a readable portfolio type name
  const getPortfolioTypeName = (type?: 'equity' | 'fixed_income' | 'multi_asset'): string => {
    switch (type) {
      case 'equity':
        return 'Equity';
      case 'fixed_income':
        return 'Fixed Income';
      case 'multi_asset':
        return 'Multi-asset';
      default:
        return 'Not specified';
    }
  };

  // Function to get icon for portfolio type
  const getPortfolioTypeIcon = (type?: 'equity' | 'fixed_income' | 'multi_asset'): string => {
    switch (type) {
      case 'equity':
        return 'chart-line';
      case 'fixed_income':
        return 'bank';
      case 'multi_asset':
        return 'view-grid';
      default:
        return 'help-circle';
    }
  };

  // Create header component separately
  const AllocationHeader = () => (
    <>
      {/* Portfolio Information Card */}
      {portfolioName && (
        <View style={styles.portfolioInfoCard}>
          <Text style={styles.portfolioInfoTitle}>Portfolio Information</Text>
          <View style={styles.portfolioInfoItem}>
            <Text style={styles.portfolioInfoLabel}>Name:</Text>
            <Text style={styles.portfolioInfoValue}>{portfolioName}</Text>
          </View>
          {portfolioDescription && (
            <View style={styles.portfolioInfoItem}>
              <Text style={styles.portfolioInfoLabel}>Description:</Text>
              <Text style={styles.portfolioInfoValue}>{portfolioDescription}</Text>
            </View>
          )}
          {portfolioType && (
            <View style={styles.portfolioInfoItem}>
              <Text style={styles.portfolioInfoLabel}>Type:</Text>
              <View style={styles.portfolioTypeValue}>
                <Text style={styles.portfolioInfoValue}>
                  {getPortfolioTypeName(portfolioType)}
                </Text>
                <View 
                  style={[
                    styles.portfolioTypeBadge, 
                    { 
                      backgroundColor: 
                        portfolioType === 'equity' ? '#ebf5ff' : 
                        portfolioType === 'fixed_income' ? '#ecfdf5' : 
                        '#f5f3ff' 
                    }
                  ]}
                >
                  <MaterialCommunityIcons 
                    name={getPortfolioTypeIcon(portfolioType)} 
                    size={14} 
                    color={
                      portfolioType === 'equity' ? '#1e40af' : 
                      portfolioType === 'fixed_income' ? '#065f46' : 
                      '#5b21b6'
                    }
                    style={styles.portfolioTypeIcon}
                  />
                  <Text
                    style={[
                      styles.portfolioTypeBadgeText,
                      {
                        color: 
                          portfolioType === 'equity' ? '#1e40af' : 
                          portfolioType === 'fixed_income' ? '#065f46' : 
                          '#5b21b6'
                      }
                    ]}
                  >
                    {portfolioType === 'equity' ? 'Stocks & ETFs' : 
                     portfolioType === 'fixed_income' ? 'Bonds' : 
                     'Mixed Assets'}
                  </Text>
                </View>
              </View>
            </View>
          )}
          <View style={styles.portfolioInfoItem}>
            <Text style={styles.portfolioInfoLabel}>Companies:</Text>
            <Text style={styles.portfolioInfoValue}>{assets.length}</Text>
          </View>
          <View style={styles.portfolioInfoItem}>
            <Text style={styles.portfolioInfoLabel}>Total Value:</Text>
            <Text style={styles.portfolioInfoValue}>
              ${totalValue.toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Portfolio Composition</Text>
      
      <View style={styles.allocationSection}>
        <Text style={styles.allocationTitle}>Asset Allocation</Text>
        
        {Object.keys(sectorAllocation).length > 0 ? (
          <>
            <View style={styles.allocationBar}>
              {Object.entries(sectorAllocation).map(([sector, { percentage }], index) => (
                <View 
                  key={index}
                  style={[
                    styles.allocationSegment,
                    { 
                      backgroundColor: getAssetClassColor(sector),
                      width: `${percentage}%` 
                    }
                  ]}
                />
              ))}
            </View>
            
            <View style={styles.allocationLegend}>
              {Object.entries(sectorAllocation).map(([sector, { value, percentage }], index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColorBox, { backgroundColor: getAssetClassColor(sector) }]} />
                  <Text style={styles.legendText}>
                    {formatAssetClass(sector)} ({percentage.toFixed(2)}%)
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>No assets added yet</Text>
        )}
      </View>
      
      <View style={[styles.assetsSection, {marginBottom: 0, borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0}]}>
        <Text style={styles.assetsTitle}>Selected Assets</Text>
        
        {assets.length === 0 && (
          <Text style={styles.emptyText}>No assets selected</Text>
        )}
      </View>
    </>
  );

  // Create footer component separately
  const TotalValueFooter = () => (
    <View style={[styles.assetsSection, {marginTop: 0, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0}]}>
      <View style={styles.totalValueContainer}>
        <Text style={styles.totalValueLabel}>Total Portfolio Value:</Text>
        <Text style={styles.totalValueAmount}>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {assets.length === 0 ? (
        <AllocationHeader />
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.assetItem}>
              <View style={styles.assetInfo}>
                <Text style={styles.assetSymbol}>{item.symbol}</Text>
                <Text style={styles.assetName} numberOfLines={1} ellipsizeMode="tail">
                  {item.name}
                </Text>
                <Text style={styles.assetDetails}>
                  {item.quantity} × ${item.price.toFixed(2)} = ${(item.quantity * item.price).toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemoveAsset(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={AllocationHeader}
          ListFooterComponent={TotalValueFooter}
          contentContainerStyle={styles.listContentContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContentContainer: {
    paddingBottom: 120, // Add extra padding to ensure content is above the navigation buttons
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  allocationSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  allocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  allocationBar: {
    height: 24,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  allocationSegment: {
    height: '100%',
  },
  allocationLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  legendColorBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#475569',
  },
  assetsSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  assetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  assetInfo: {
    flex: 1,
  },
  assetSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  assetName: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  assetDetails: {
    fontSize: 12,
    color: '#64748b',
  },
  removeButton: {
    padding: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  totalValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalValueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  totalValueAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 16,
  },
  portfolioInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  portfolioInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  portfolioInfoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  portfolioInfoLabel: {
    fontSize: 14,
    color: '#64748b',
    width: 100,
  },
  portfolioInfoValue: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  portfolioTypeValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioTypeIcon: {
    marginRight: 4,
  },
  portfolioTypeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default PortfolioSummary; 
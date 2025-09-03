import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';

// Import our portfolio service
import portfolioService, { PortfolioSummary, Asset, Portfolio } from '../../services/portfolioService';

// Import state persistence
import { usePersistentState } from '../../hooks/use-screen-state';

// Import the SP500PortfolioWizard
import SP500PortfolioWizard from './SP500PortfolioWizard';

// Import the EditPortfolioModal
import EditPortfolioModal from '../../components/portfolio/EditPortfolioModal';

// Import the PortfolioDetailsSheet
import PortfolioDetailsSheet from '../../components/portfolio/PortfolioDetailsSheet';

// Component for the allocation pie chart preview
const AllocationChart = ({ allocation }: { allocation: Record<string, number> }) => {
  // Convert allocation object to array of entries
  const allocationEntries = Object.entries(allocation);
  
  return (
    <View style={styles.allocationChart}>
      {allocationEntries.map(([key, value], index) => (
        <View 
          key={key}
          style={[
            styles.allocationItem,
            { 
              flex: value, 
              backgroundColor: COLORS[index % COLORS.length]
            }
          ]}
        />
      ))}
    </View>
  );
};

// Array of colors for the allocation chart
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Define interface for portfolio item props
interface PortfolioItemProps {
  portfolio: PortfolioSummary;
  onPress: (portfolio: PortfolioSummary) => void;
  onDelete: (id: string) => void;
  onEdit: (portfolio: PortfolioSummary) => void;
}

// Helper function to format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Portfolio item component
const PortfolioItem: React.FC<PortfolioItemProps> = ({ portfolio, onPress, onDelete, onEdit }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    
    return (
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert(
            "Delete Portfolio",
            `Are you sure you want to delete "${portfolio.name}"? This action cannot be undone.`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(portfolio.id) }
            ]
          );
        }}
      >
        <Animated.Text style={[styles.deleteButtonText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const handleDeletePress = () => {
    Alert.alert(
      "Delete Portfolio",
      `Are you sure you want to delete "${portfolio.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(portfolio.id) }
      ]
    );
  };

  const handleRealTimeUpdate = async () => {
    try {
      // Show loading state or indicator
      Alert.alert(
        "Updating Prices",
        "Fetching real-time market data...",
        [],
        { cancelable: false }
      );
      
      // Get the full portfolio data
      const fullPortfolio = await portfolioService.getPortfolioById(portfolio.id);
      if (!fullPortfolio) return;
      
      // Update the portfolio with real-time prices
      await portfolioService.updatePortfolio(fullPortfolio);
      
      // Show success message
      Alert.alert(
        "Update Complete",
        "Portfolio has been updated with real-time market data.",
        [{ text: "OK" }]
      );
      
      // Refresh the portfolio list to show updated values
      onPress(portfolio);
    } catch (error) {
      console.error('Error updating portfolio with real-time data:', error);
      Alert.alert(
        "Update Failed",
        "Unable to fetch real-time market data. Please try again later.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity 
        style={styles.portfolioCard}
        onPress={() => onPress(portfolio)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContainer}>
          <View style={styles.portfolioHeader}>
            <Text style={styles.portfolioName}>{portfolio.name}</Text>
            <View style={styles.headerActions}>
              <View style={styles.portfolioBadge}>
                <Text style={styles.portfolioBadgeText}>
                  {Object.keys(portfolio.allocation)[0]?.toUpperCase() || 'MIXED'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.menuButton} 
                onPress={toggleMenu}
              >
                <MaterialCommunityIcons name="dots-vertical" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
          
          {showMenu && (
            <View style={styles.menuContainer}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  toggleMenu();
                  onPress(portfolio);
                }}
              >
                <MaterialCommunityIcons name="eye" size={16} color="#64748b" />
                <Text style={styles.menuItemText}>View</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  toggleMenu();
                  handleRealTimeUpdate();
                }}
              >
                <MaterialCommunityIcons name="refresh" size={16} color="#10b981" />
                <Text style={styles.menuItemText}>Update Prices</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  toggleMenu();
                  onEdit(portfolio);
                }}
              >
                <MaterialCommunityIcons name="pencil" size={16} color="#64748b" />
                <Text style={styles.menuItemText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.menuItem, styles.deleteMenuItem]}
                onPress={() => {
                  toggleMenu();
                  handleDeletePress();
                }}
              >
                <MaterialCommunityIcons name="delete" size={16} color="#ef4444" />
                <Text style={styles.deleteMenuItemText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.portfolioDetails}>
            <View style={styles.allocationContainer}>
              <AllocationChart allocation={portfolio.allocation} />
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
                      {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                    </Text>
                  </View>
                ))}
                {Object.keys(portfolio.allocation).length > 3 && (
                  <Text style={styles.moreLegendText}>+{Object.keys(portfolio.allocation).length - 3} more</Text>
                )}
              </View>
            </View>
            
            <View style={styles.portfolioValue}>
              <Text style={styles.valueLabel}>Portfolio Value</Text>
              <Text style={styles.valueBig}>
                {formatCurrency(portfolio.totalValue)}
              </Text>
              <View style={styles.changeContainer}>
                <Text style={[
                  styles.change, 
                  portfolio.oneDayPL >= 0 ? styles.positiveValue : styles.negativeValue
                ]}>
                  {portfolio.oneDayPL >= 0 ? '▴' : '▾'} {portfolio.oneDayPL >= 0 ? '+' : ''}
                  {formatCurrency(Math.abs(portfolio.oneDayPL))}
                </Text>
                <Text style={styles.changeLabel}>Today</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.portfolioFooter}>
            <View style={styles.footerColumn}>
              <Text style={styles.footerLabel}>Assets</Text>
              <Text style={styles.footerValue}>{portfolio.assetCount || 0}</Text>
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerLabel}>VaR (95%)</Text>
              <Text style={styles.footerValue}>
                {portfolio.lastVaR ? 
                  formatCurrency(portfolio.totalValue * (portfolio.lastVaR / 100)) : 
                  formatCurrency(portfolio.totalValue * 0.05)}
              </Text>
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerLabel}>Updated</Text>
              <Text style={styles.footerValue}>{new Date(portfolio.lastModified).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const OriginalPortfolioScreen: React.FC = () => {
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [filteredPortfolios, setFilteredPortfolios] = useState<PortfolioSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = usePersistentState<string>('OriginalPortfolioScreen', 'searchQuery', '');
  const [showSP500Wizard, setShowSP500Wizard] = useState(false);
  
  // New state for edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [portfolioToEdit, setPortfolioToEdit] = usePersistentState<PortfolioSummary | null>('OriginalPortfolioScreen', 'portfolioToEdit', null);
  
  // New state for details sheet
  const [detailsSheetVisible, setDetailsSheetVisible] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = usePersistentState<Portfolio | null>('OriginalPortfolioScreen', 'selectedPortfolio', null);

  // Load portfolios function
  const loadPortfolios = async () => {
    setLoading(true);
    try {
      const portfolioSummaries = await portfolioService.getPortfolioSummaries();
      setPortfolios(portfolioSummaries);
      setFilteredPortfolios(portfolioSummaries);
      
      console.log('Loaded portfolios with real-time prices:', portfolioSummaries);
    } catch (error) {
      console.error('Error loading portfolios:', error);
      Alert.alert(
        'Error',
        'Failed to load portfolios. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load portfolios on component mount and when screen is focused
  useEffect(() => {
    loadPortfolios();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPortfolios();
    }, [])
  );

  // Refresh function
  const refreshPortfolios = async () => {
    setRefreshing(true);
    try {
      await portfolioService.getAllPortfolios();
      const portfolioSummaries = await portfolioService.getPortfolioSummaries();
      setPortfolios(portfolioSummaries);
      setFilteredPortfolios(portfolioSummaries);
      
      console.log('Refreshed portfolios with real-time prices');
    } catch (error) {
      console.error('Error refreshing portfolios:', error);
      Alert.alert(
        'Error',
        'Failed to refresh portfolios with real-time data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setRefreshing(false);
    }
  };

  // Handle portfolio selection
  const handlePortfolioPress = async (portfolio: PortfolioSummary) => {
    try {
      setLoading(true);
      const fullPortfolio = await portfolioService.getPortfolioById(portfolio.id);
      
      if (fullPortfolio) {
        setSelectedPortfolio(fullPortfolio);
        setDetailsSheetVisible(true);
      } else {
        Alert.alert('Error', 'Unable to load portfolio details.');
      }
    } catch (error) {
      console.error('Error loading portfolio details:', error);
      Alert.alert('Error', 'Failed to load portfolio details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle creating a new portfolio
  const handleCreatePortfolio = () => {
    setShowSP500Wizard(true);
  };

  // Handle closing the SP500 wizard
  const handleCloseSP500Wizard = () => {
    setShowSP500Wizard(false);
    loadPortfolios();
  };

  // Handle deleting a portfolio
  const handleDeletePortfolio = async (id: string) => {
    try {
      await portfolioService.deletePortfolio(id);
      loadPortfolios();
      Alert.alert('Success', 'Portfolio deleted successfully.');
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      Alert.alert('Error', 'Failed to delete portfolio. Please try again.');
    }
  };

  // Handle editing a portfolio
  const handleEditPortfolio = (portfolio: PortfolioSummary) => {
    setPortfolioToEdit(portfolio);
    setEditModalVisible(true);
  };

  // Handle saving portfolio changes
  const handleSavePortfolio = async (id: string, name: string, portfolioType: string) => {
    try {
      const portfolio = await portfolioService.getPortfolioById(id);
      if (portfolio) {
        const updatedPortfolio = {
          ...portfolio,
          name,
          type: portfolioType as any
        };
        await portfolioService.updatePortfolio(updatedPortfolio);
        loadPortfolios();
        setEditModalVisible(false);
        setPortfolioToEdit(null);
        Alert.alert('Success', 'Portfolio updated successfully.');
      }
    } catch (error) {
      console.error('Error updating portfolio:', error);
      Alert.alert('Error', 'Failed to update portfolio. Please try again.');
    }
  };

  // Handle search
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      setFilteredPortfolios(portfolios);
    } else {
      const filtered = portfolios.filter(portfolio =>
        portfolio.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredPortfolios(filtered);
    }
  };

  // If showing the wizard, render it instead of the portfolio list
  if (showSP500Wizard) {
    return <SP500PortfolioWizard onBackToPortfolios={handleCloseSP500Wizard} />;
  }

  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading portfolios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Portfolios</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshPortfolios}
            disabled={refreshing}
          >
            <Ionicons 
              name={refreshing ? "sync-circle" : "sync"} 
              size={24} 
              color="#3b82f6" 
              style={refreshing ? styles.rotating : undefined}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreatePortfolio}
          >
            <Ionicons name="add-circle" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search portfolios"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => handleSearch('')}
            >
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <MaterialCommunityIcons name="filter-variant" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Portfolio Stats Summary */}
      {portfolios.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(portfolios.reduce((sum, p) => sum + p.totalValue, 0))}
            </Text>
            <Text style={styles.statLabel}>Total Value</Text>
            <Text style={styles.portfolioCount}>{portfolios.length} Portfolio{portfolios.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(portfolios.reduce((sum, p) => {
                const portfolioVaR = p.lastVaR ? p.totalValue * (p.lastVaR / 100) : p.totalValue * 0.05;
                return sum + portfolioVaR;
              }, 0))}
            </Text>
            <Text style={styles.statLabel}>Total VaR</Text>
            <Text style={styles.portfolioCount}>(95% confidence)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              portfolios.reduce((sum, p) => sum + p.oneDayPL, 0) >= 0 
                ? styles.positiveStatValue 
                : styles.negativeStatValue
            ]}>
              {portfolios.reduce((sum, p) => sum + p.oneDayPL, 0) >= 0 ? '+' : ''}
              {formatCurrency(portfolios.reduce((sum, p) => sum + p.oneDayPL, 0))}
            </Text>
            <Text style={styles.statLabel}>Today's P/L</Text>
            <Text style={styles.portfolioCount}>{portfolios.length} Portfolio{portfolios.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      )}

      {/* Portfolio List */}
      {filteredPortfolios.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          {searchQuery.length > 0 ? (
            <>
              <MaterialCommunityIcons name="magnify" size={64} color="#94a3b8" />
              <Text style={styles.emptyStateTitle}>No Results Found</Text>
              <Text style={styles.emptyStateText}>
                No portfolios match "{searchQuery}"
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => handleSearch('')}
              >
                <Text style={styles.emptyStateButtonText}>Clear Search</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="folder-open-outline" size={64} color="#94a3b8" />
              <Text style={styles.emptyStateTitle}>No Portfolios Yet</Text>
              <Text style={styles.emptyStateText}>Create your first portfolio to get started</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={handleCreatePortfolio}
              >
                <Text style={styles.emptyStateButtonText}>Create Portfolio</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredPortfolios}
          renderItem={({ item }) => (
            <PortfolioItem 
              portfolio={item} 
              onPress={handlePortfolioPress}
              onDelete={handleDeletePortfolio}
              onEdit={handleEditPortfolio}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={refreshPortfolios}
              colors={['#10b981']}
              tintColor="#10b981"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Edit Portfolio Modal */}
      {portfolioToEdit && (
        <EditPortfolioModal
          visible={editModalVisible}
          portfolio={portfolioToEdit}
          onClose={() => {
            setEditModalVisible(false);
            setPortfolioToEdit(null);
          }}
          onSave={handleSavePortfolio}
        />
      )}
      
      {/* Portfolio Details Sheet */}
      <PortfolioDetailsSheet
        visible={detailsSheetVisible}
        portfolio={selectedPortfolio}
        onClose={() => {
          setDetailsSheetVisible(false);
          setSelectedPortfolio(null);
        }}
        onEditAsset={async () => {}}
        onDeleteAsset={async () => {}}
        onAddAsset={async () => {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  rotating: {
    opacity: 0.7,
  },
  createButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#334155',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  positiveStatValue: {
    color: '#10b981',
  },
  negativeStatValue: {
    color: '#ef4444',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  portfolioCount: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e2e8f0',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
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
  cardContainer: {
    padding: 16,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portfolioName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  portfolioBadge: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  portfolioBadgeText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  portfolioDetails: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  allocationContainer: {
    flex: 1,
  },
  allocationChart: {
    width: '100%',
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 10,
  },
  allocationItem: {
    height: '100%',
  },
  allocationLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  moreLegendText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
  },
  portfolioValue: {
    flex: 1,
    alignItems: 'flex-end',
  },
  valueLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  valueBig: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  change: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  changeLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  positiveValue: {
    color: '#10b981',
  },
  negativeValue: {
    color: '#ef4444',
  },
  portfolioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    paddingBottom: 8,
  },
  footerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  footerValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  menuContainer: {
    position: 'absolute',
    top: 45,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 100,
  },
  menuItem: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#334155',
  },
  deleteMenuItem: {
    borderBottomWidth: 0,
  },
  deleteMenuItemText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#ef4444',
  },
});

export default OriginalPortfolioScreen; 
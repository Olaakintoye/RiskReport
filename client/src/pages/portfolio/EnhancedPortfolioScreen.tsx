import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  Animated,
  Dimensions,
  Platform
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
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

// Import auto-refresh hook
import useAutoRefresh from '../../hooks/useAutoRefresh';

// Import the EditPortfolioModal
import EditPortfolioModal from '../../components/portfolio/EditPortfolioModal';

// Import the PortfolioDetailsSheet
import PortfolioDetailsSheet from '../../components/portfolio/PortfolioDetailsSheet';

// Import enhanced components
import PerformanceCards from '../../components/portfolio/PerformanceCards';
import ActionableRecommendations from '../../components/portfolio/ActionableRecommendations';
import GoalBasedTracking from '../../components/portfolio/GoalBasedTracking';
import EnhancedPortfolioItem from '../../components/portfolio/EnhancedPortfolioItem';

// Types for enhanced features
interface ViewMode {
  type: 'simple' | 'advanced';
  showPerformance: boolean;
  showMarket: boolean;
  showRecommendations: boolean;
  showGoals: boolean;
}

interface PortfolioGroup {
  id: string;
  name: string;
  portfolios: PortfolioSummary[];
  color: string;
}

const EnhancedPortfolioScreen: React.FC = () => {
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [filteredPortfolios, setFilteredPortfolios] = useState<PortfolioSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = usePersistentState<string>('EnhancedPortfolioScreen', 'searchQuery', '');
  const [showSP500Wizard, setShowSP500Wizard] = useState(false);
  const [viewMode, setViewMode] = usePersistentState<ViewMode>('EnhancedPortfolioScreen', 'viewMode', {
    type: 'simple',
    showPerformance: true,
    showMarket: true,
    showRecommendations: true,
    showGoals: true
  });
  const [portfolioGroups, setPortfolioGroups] = usePersistentState<PortfolioGroup[]>('EnhancedPortfolioScreen', 'portfolioGroups', []);
  const [selectedFilter, setSelectedFilter] = usePersistentState<'all' | 'favorites' | 'recent'>('EnhancedPortfolioScreen', 'selectedFilter', 'all');
  const [sortBy, setSortBy] = usePersistentState<'name' | 'value' | 'performance' | 'risk'>('EnhancedPortfolioScreen', 'sortBy', 'name');
  
  // New state for edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [portfolioToEdit, setPortfolioToEdit] = usePersistentState<PortfolioSummary | null>('EnhancedPortfolioScreen', 'portfolioToEdit', null);
  
  // New state for details sheet
  const [detailsSheetVisible, setDetailsSheetVisible] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = usePersistentState<Portfolio | null>('EnhancedPortfolioScreen', 'selectedPortfolio', null);

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

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

  // Auto-refresh function for portfolios
  const refreshPortfolios = async () => {
    try {
      await portfolioService.getAllPortfolios();
      const portfolioSummaries = await portfolioService.getPortfolioSummaries();
      setPortfolios(portfolioSummaries);
      setFilteredPortfolios(portfolioSummaries);
      
      console.log('Auto-refreshed portfolios with real-time prices');
    } catch (error) {
      console.error('Error auto-refreshing portfolios:', error);
      // Silent fail for auto-refresh to avoid interrupting user
    }
  };

  // Auto-refresh portfolios every 5 minutes (reduced from 10 for better UX)
  // Only enabled when screen is visible and not loading
  useAutoRefresh({
    interval: 5 * 60 * 1000, // 5 minutes
    enabled: !loading,
    onRefresh: refreshPortfolios,
    respectMarketHours: true
  });

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

  // Handle quick actions
  const handleQuickAction = async (portfolio: PortfolioSummary, action: string) => {
    switch (action) {
      case 'rebalance':
        Alert.alert('Rebalance', `Rebalancing ${portfolio.name}...`);
        break;
      case 'analyze':
        Alert.alert('Analysis', `Opening analysis for ${portfolio.name}...`);
        break;
      case 'stress_test':
        Alert.alert('Stress Test', `Running stress test on ${portfolio.name}...`);
        break;
      case 'export':
        Alert.alert('Export', `Exporting ${portfolio.name} data...`);
        break;
      case 'update_prices':
        Alert.alert('Update Prices', `Updating prices for ${portfolio.name}...`);
        break;
      case 'duplicate':
        Alert.alert('Duplicate', `Duplicating ${portfolio.name}...`);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  };

  // Handle creating a new portfolio
  const handleCreatePortfolio = () => {
    setShowSP500Wizard(true);
  };

  // Import CSV -> create portfolio
  const handleImportCSV = async () => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({ type: 'text/csv', multiple: false });
      if ((pick as any).canceled || !(pick as any).assets?.[0]) return;
      const fileUri = (pick as any).assets[0].uri as string;
      const content = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      const imported = await portfolioService.importPortfolioFromCSV(content, `Imported ${new Date().toLocaleString()}`);
      Alert.alert('Imported', `Created portfolio \"${imported.name}\" with ${imported.assets.length} assets.`);
      loadPortfolios();
    } catch (e: any) {
      console.error('CSV import failed', e);
      Alert.alert('Import Failed', e?.message || 'Could not import CSV. Ensure headers are: symbol,quantity[,price]');
    }
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

  // Debounce timer ref for search
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Handle search with debouncing (300ms) for better performance
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    
    // Clear existing timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }
    
    // Debounce the filtering
    searchDebounceTimer.current = setTimeout(() => {
      if (text.trim() === '') {
        setFilteredPortfolios(portfolios);
      } else {
        const filtered = portfolios.filter(portfolio =>
          portfolio.name.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredPortfolios(filtered);
      }
    }, 300); // 300ms debounce
  }, [portfolios]);
  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, []);

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode({
      ...viewMode,
      type: viewMode.type === 'simple' ? 'advanced' : 'simple'
    });
  };


  // Calculate total portfolio stats
  const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
  const totalPL = portfolios.reduce((sum, p) => sum + p.oneDayPL, 0);
  const totalVaR = portfolios.reduce((sum, p) => {
    const portfolioVaR = p.lastVaR ? p.totalValue * (p.lastVaR / 100) : p.totalValue * 0.05;
    return sum + portfolioVaR;
  }, 0);

  // Get portfolio IDs for enhanced components
  const portfolioIds = portfolios.map(p => p.id);

  // If showing the wizard, render it instead of the portfolio list
  if (showSP500Wizard) {
    return <SP500PortfolioWizard onBackToPortfolios={handleCloseSP500Wizard} />;
  }

  // Render loading state
  if (loading) {
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
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Portfolios</Text>
          <TouchableOpacity style={styles.viewModeToggle} onPress={toggleViewMode}>
            <MaterialCommunityIcons 
              name={viewMode.type === 'simple' ? 'view-dashboard' : 'view-list'} 
              size={16} 
              color="#64748b" 
            />
            <Text style={styles.viewModeText}>
              {viewMode.type === 'simple' ? 'Advanced' : 'Simple'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.importButton}
            onPress={handleImportCSV}
          >
            <Ionicons name="document-text" size={20} color="#2563eb" />
            <Text style={styles.importButtonText}>Import CSV</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreatePortfolio}
          >
            <Ionicons name="add-circle" size={24} color="#ffffff" />
            <Text style={styles.createButtonText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}

        showsVerticalScrollIndicator={false}
      >
        {/* Portfolio Summary Stats */}
        {portfolios.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
              <Text style={styles.summaryLabel}>Total Value</Text>
              <Text style={styles.summaryCount}>{portfolios.length} Portfolio{portfolios.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[
                styles.summaryValue,
                totalPL >= 0 ? styles.positiveSummary : styles.negativeSummary
              ]}>
                {totalPL >= 0 ? '+' : ''}{formatCurrency(totalPL)}
              </Text>
              <Text style={styles.summaryLabel}>Today's P/L</Text>
              <Text style={styles.summaryCount}>All Portfolios</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{formatCurrency(totalVaR)}</Text>
              <Text style={styles.summaryLabel}>Total VaR</Text>
              <Text style={styles.summaryCount}>(95% confidence)</Text>
            </View>
          </View>
        )}

        {/* Enhanced Components */}
        {viewMode.type === 'advanced' && (
          <>
            {/* Performance Cards */}
            {viewMode.showPerformance && portfolios.length > 0 && (
              <PerformanceCards 
                portfolioId={portfolioIds[0]} 
                totalValue={totalValue}
                onPeriodSelect={(period) => console.log('Selected period:', period)}
              />
            )}



            {/* Actionable Recommendations */}
            {viewMode.showRecommendations && (
              <ActionableRecommendations 
                portfolioIds={portfolioIds}
                onRecommendationPress={(rec) => console.log('Recommendation pressed:', rec)}
                onDismiss={(id) => console.log('Dismissed:', id)}
              />
            )}

            {/* Goal-Based Tracking */}
            {viewMode.showGoals && (
              <GoalBasedTracking 
                portfolioIds={portfolioIds}
                onGoalPress={(goal) => console.log('Goal pressed:', goal)}
                onAddGoal={() => console.log('Add goal pressed')}
              />
            )}

          </>
        )}

        {/* Search and Filter Bar */}
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

        {/* Portfolio List */}
        <View style={styles.portfolioListContainer}>
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
            filteredPortfolios.map((portfolio) => (
              <EnhancedPortfolioItem
                key={portfolio.id}
                portfolio={portfolio}
                onPress={handlePortfolioPress}
                onDelete={handleDeletePortfolio}
                onEdit={handleEditPortfolio}
                onQuickAction={handleQuickAction}
                showAdvancedMetrics={viewMode.type === 'advanced'}
              />
            ))
          )}
        </View>
      </ScrollView>

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
        onEditAsset={() => {}}
        onDeleteAsset={() => {}}
        onAddAsset={async (portfolioId: string, asset: Asset) => {}}
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
    marginTop: SPACING.md,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginRight: 12,
  },
  viewModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewModeText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },


  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    gap: 6
  },
  importButtonText: {
    color: '#2563eb',
    fontWeight: '600'
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.screenPadding,
    paddingVertical: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  positiveSummary: {
    color: '#10b981',
  },
  negativeSummary: {
    color: '#ef4444',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  summaryCount: {
    fontSize: 10,
    color: '#94a3b8',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
  portfolioListContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EnhancedPortfolioScreen; 
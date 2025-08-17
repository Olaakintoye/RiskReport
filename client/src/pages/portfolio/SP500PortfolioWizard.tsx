import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Import services
import sp500Service, { SP500Company } from '../../services/sp500Service';
import portfolioService, { Asset } from '../../services/portfolioService';
import tiingoService from '../../services/tiingoService';
import useAutoRefresh from '../../hooks/useAutoRefresh';

// Import components
import SP500SectorSelector from '@/components/portfolio/SP500SectorSelector';
import SP500CompanyCard from '@/components/portfolio/SP500CompanyCard';
import SP500CompanyDetail from '@/components/portfolio/SP500CompanyDetail';
import PortfolioSummary from '@/components/portfolio/PortfolioSummary';

interface SP500PortfolioWizardProps {
  onBackToPortfolios: () => void;
}

const SP500PortfolioWizard: React.FC<SP500PortfolioWizardProps> = ({ onBackToPortfolios }) => {
  // Wizard state management
  const [step, setStep] = useState<'info' | 'select' | 'review'>('info');
  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [companies, setCompanies] = useState<SP500Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<SP500Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<SP500Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [portfolioType, setPortfolioType] = useState<'equity' | 'fixed_income' | 'multi_asset'>('equity');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);


  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load sectors
        const sectorsData = await sp500Service.getSP500Sectors();
        setSectors(sectorsData);
        
        // Load all companies
        const companiesData = await sp500Service.getSP500Companies();
        setCompanies(companiesData);
        setFilteredCompanies(companiesData);
      } catch (error) {
        console.error('Error loading S&P 500 data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter companies based on sector and search query
  useEffect(() => {
    let filtered = companies;
    
    // Filter by sector if selected
    if (selectedSector) {
      filtered = filtered.filter(company => company.sector === selectedSector);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        company => 
          company.symbol.toLowerCase().includes(query) ||
          company.name.toLowerCase().includes(query)
      );
    }
    
    setFilteredCompanies(filtered);
  }, [selectedSector, searchQuery, companies]);

  // Auto-refresh for company prices in select step (every 5 minutes)
  useAutoRefresh({
    interval: 5 * 60 * 1000, // 5 minutes
    enabled: step === 'select' && filteredCompanies.length > 0,
    onRefresh: refreshAllCompanyPrices,
    respectMarketHours: true
  });

  // Auto-refresh for selected asset prices in review step (every 8 minutes)
  useAutoRefresh({
    interval: 8 * 60 * 1000, // 8 minutes
    enabled: step === 'review' && selectedAssets.length > 0,
    onRefresh: refreshAllPrices,
    respectMarketHours: true
  });

  // Handle sector selection
  const handleSectorSelect = (sector: string) => {
    setSelectedSector(sector === selectedSector ? null : sector);
  };

  // Handle company selection
  const handleCompanySelect = (company: SP500Company) => {
    setSelectedCompany(company);
  };

  // Handle back from company details
  const handleBackFromDetails = () => {
    setSelectedCompany(null);
  };

  // Handle adding a company to the portfolio
  const handleAddToPortfolio = (symbol: string, name: string, price: number, quantity: number) => {
    const existingAssetIndex = selectedAssets.findIndex(asset => asset.symbol === symbol);
    
    if (existingAssetIndex >= 0) {
      // Update existing asset quantity
      const updatedAssets = [...selectedAssets];
      updatedAssets[existingAssetIndex] = {
        ...updatedAssets[existingAssetIndex],
        quantity: updatedAssets[existingAssetIndex].quantity + quantity
      };
      setSelectedAssets(updatedAssets);
    } else {
      // Add new asset
      const newAsset: Asset = {
        id: `temp-${Date.now()}-${symbol}`,
        symbol,
        name,
        quantity,
        price,
        assetClass: 'equity' as const // Explicitly type as 'equity' literal
      };
      setSelectedAssets([...selectedAssets, newAsset]);
    }
    
    // Go back to company list
    setSelectedCompany(null);
  };

  // Handle removing an asset from the portfolio
  const handleRemoveAsset = (assetId: string) => {
    setSelectedAssets(selectedAssets.filter(asset => asset.id !== assetId));
  };

  // Handle creating the portfolio with real-time price updates
  const handleCreatePortfolio = async () => {
    if (!portfolioName.trim() || selectedAssets.length === 0) {
      Alert.alert('Missing Information', 'Please provide a portfolio name and add at least one company.');
      return;
    }
    
    console.log('Creating portfolio with name:', portfolioName);
    console.log('Selected assets:', selectedAssets);
    console.log('Portfolio type:', portfolioType);
    
    setIsCreating(true);
    try {
      // Update real-time prices for all assets before creating the portfolio
      console.log('Updating real-time prices for all assets...');
      
      // Clear the Tiingo cache to force fresh data
      tiingoService.clearCache();
      
      // Get all the tickers from the selected assets
      const symbols = selectedAssets.map(asset => asset.symbol);
      
      // Try to batch fetch real-time prices for all assets
      try {
        const pricesData = await tiingoService.getBatchRealTimePrices(symbols);
        
        // Update asset prices with real-time data
        const updatedAssets = selectedAssets.map(asset => {
          const tickerData = pricesData[asset.symbol];
          if (tickerData && (tickerData.tngoLast || tickerData.last)) {
            // Use tngoLast if available, otherwise fallback to last
            const realTimePrice = tickerData.tngoLast || tickerData.last;
            console.log(`Updated ${asset.symbol} price: $${realTimePrice} (real-time)`);
            return {
              ...asset,
              price: realTimePrice
            };
          }
          // Keep original price if no real-time data available
          console.log(`Keeping original price for ${asset.symbol}: $${asset.price}`);
          return asset;
        });
        
        // Update the selected assets with real-time prices
        setSelectedAssets(updatedAssets);
      } catch (priceError) {
        console.error('Error updating real-time prices:', priceError);
        // Continue with existing prices if real-time update fails
        console.log('Continuing with existing prices due to real-time update failure');
      }
      
      // Set asset class based on portfolio type
      let assetClass: 'equity' | 'bond' | 'cash' | 'multi-asset' |  'alternative' | 'real_estate' | 'commodity';
      
      switch (portfolioType) {
        case 'equity':
          assetClass = 'equity';
          break;
        case 'fixed_income':
          assetClass = 'bond';
          break;
        case 'multi_asset':
          // For multi-asset, we'll use a mix of asset classes
          assetClass = 'multi-asset'; // Default for first few assets
          break;
        default:
          assetClass = 'equity';
      }
      
      // Apply asset class based on portfolio type
      let assetsWithClass;
      
      if (portfolioType === 'multi_asset' && selectedAssets.length > 1) {
        // For multi-asset type, distribute assets across different classes
        const assetClasses = ['equity', 'bond', 'cash', 'alternative', 'real_estate'];
        assetsWithClass = selectedAssets.map((asset, index) => ({
          ...asset,
          assetClass: assetClasses[index % assetClasses.length] as any
        }));
      } else {
        // For single asset class portfolios
        assetsWithClass = selectedAssets.map(asset => ({
          ...asset,
          assetClass
        }));
      }
      
      const newPortfolio = {
        name: portfolioName,
        description: portfolioDescription,
        assets: assetsWithClass
      };
      
      console.log('Calling portfolioService.createPortfolio with:', newPortfolio);
      const result = await portfolioService.createPortfolio(newPortfolio);
      console.log('Portfolio created successfully with real-time prices, result:', result);
      
      // Show success message and return to portfolio screen
      Alert.alert(
        'Portfolio Created',
        `Portfolio "${portfolioName}" created successfully with real-time market data!`,
        [{ text: 'OK' }]
      );
      
      // Small delay to ensure the alert is seen
      setTimeout(() => {
        onBackToPortfolios();
      }, 500);
    } catch (error) {
      console.error('Error creating portfolio:', error);
      Alert.alert(
        'Creation Failed',
        'Failed to create portfolio. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Function to refresh all asset prices (now for auto-refresh)
  const refreshAllPrices = async () => {
    if (selectedAssets.length === 0) return;
    
    try {
      // Clear the Tiingo cache to force fresh data
      tiingoService.clearCache();
      
      // Get all the tickers from the selected assets
      const symbols = selectedAssets.map(asset => asset.symbol);
      console.log('Auto-refreshing prices for:', symbols.join(', '));
      
      // Try to batch fetch real-time prices for all assets
      const pricesData = await tiingoService.getBatchRealTimePrices(symbols);
      
      // Update asset prices with real-time data
      const updatedAssets = selectedAssets.map(asset => {
        const tickerData = pricesData[asset.symbol];
        if (tickerData && (tickerData.tngoLast || tickerData.last)) {
          // Use tngoLast if available, otherwise fallback to last
          const realTimePrice = tickerData.tngoLast || tickerData.last;
          console.log(`Auto-updated ${asset.symbol} price: $${realTimePrice}`);
          return {
            ...asset,
            price: realTimePrice
          };
        }
        // Keep original price if no real-time data available
        console.log(`Keeping original price for ${asset.symbol}: $${asset.price}`);
        return asset;
      });
      
      // Update the selected assets with real-time prices
      setSelectedAssets(updatedAssets);
    } catch (error) {
      console.error('Error auto-refreshing asset prices:', error);
      // Don't show alert for auto-refresh failures to avoid interrupting user
    }
  };

  // Function to refresh all visible company prices (now for auto-refresh)
  const refreshAllCompanyPrices = async () => {
    if (filteredCompanies.length === 0) return;
    
    try {
      // Clear Tiingo cache to get fresh data
      tiingoService.clearCache();
      
      // Get symbols for companies currently displayed
      const symbols = filteredCompanies.slice(0, 25).map(company => company.symbol);
      console.log(`Auto-refreshing prices for ${symbols.length} companies...`);
      
      // Batch request real-time prices
      await tiingoService.getBatchRealTimePrices(symbols);
      
      // Force re-render of company cards
      setFilteredCompanies([...filteredCompanies]);
      
      console.log(`Successfully auto-refreshed prices for ${symbols.length} companies`);
    } catch (error) {
      console.error('Error auto-refreshing company prices:', error);
      // Don't show alert for auto-refresh failures
    }
  };

  // Enhance step changing with logging
  const changeStep = (newStep: 'info' | 'select' | 'review') => {
    console.log(`Changing step from ${step} to ${newStep}`);
    
    // If moving to review step, add a visual confirmation
    if (newStep === 'review') {
      console.log(`Reviewing ${selectedAssets.length} selected assets`);
    }
    
    setStep(newStep);
  };

  // Render the information step
  const renderInfoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Create New Portfolio</Text>
      <Text style={styles.stepDescription}>
        Create a custom portfolio from S&P 500 companies, the 500 largest publicly traded companies in the United States.
      </Text>
      
      <View style={styles.infoCard}>
        <MaterialCommunityIcons name="information-outline" size={24} color="#3b82f6" style={styles.infoIcon} />
        <Text style={styles.infoText}>
          You'll be able to search and filter companies by sector, view detailed company information, and add selected companies to your portfolio.
        </Text>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Portfolio Name*</Text>
        <TextInput
          style={styles.input}
          value={portfolioName}
          onChangeText={setPortfolioName}
          placeholder="Enter a name for your portfolio"
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Portfolio Type*</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowTypeDropdown(true)}
        >
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownText}>
              {portfolioType === 'equity' ? 'Equity' : 
               portfolioType === 'fixed_income' ? 'Fixed Income' : 
               'Multi-asset'}
            </Text>
            <Text style={styles.dropdownDescription}>
              {portfolioType === 'equity' ? 'Stocks and ETFs' : 
               portfolioType === 'fixed_income' ? 'Bonds and debt securities' : 
               'Diversified across asset classes'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#64748b" />
        </TouchableOpacity>
        
        <Modal
          visible={showTypeDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTypeDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowTypeDropdown(false)}
          >
            <View style={styles.dropdownModal}>
              <Text style={styles.dropdownModalTitle}>Select Portfolio Type</Text>
              <TouchableOpacity 
                style={[styles.dropdownItem, portfolioType === 'equity' && styles.dropdownItemSelected]} 
                onPress={() => {
                  setPortfolioType('equity');
                  setShowTypeDropdown(false);
                }}
              >
                <View style={styles.dropdownItemContent}>
                  <Text style={[styles.dropdownItemText, portfolioType === 'equity' && styles.dropdownItemTextSelected]}>
                    Equity
                  </Text>
                  <Text style={styles.dropdownItemDescription}>Stocks and ETFs</Text>
                </View>
                {portfolioType === 'equity' && (
                  <Ionicons name="checkmark" size={20} color="#3b82f6" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.dropdownItem, portfolioType === 'fixed_income' && styles.dropdownItemSelected]} 
                onPress={() => {
                  setPortfolioType('fixed_income');
                  setShowTypeDropdown(false);
                }}
              >
                <View style={styles.dropdownItemContent}>
                  <Text style={[styles.dropdownItemText, portfolioType === 'fixed_income' && styles.dropdownItemTextSelected]}>
                    Fixed Income
                  </Text>
                  <Text style={styles.dropdownItemDescription}>Bonds and debt securities</Text>
                </View>
                {portfolioType === 'fixed_income' && (
                  <Ionicons name="checkmark" size={20} color="#3b82f6" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.dropdownItem, portfolioType === 'multi_asset' && styles.dropdownItemSelected]} 
                onPress={() => {
                  setPortfolioType('multi_asset');
                  setShowTypeDropdown(false);
                }}
              >
                <View style={styles.dropdownItemContent}>
                  <Text style={[styles.dropdownItemText, portfolioType === 'multi_asset' && styles.dropdownItemTextSelected]}>
                    Multi-asset
                  </Text>
                  <Text style={styles.dropdownItemDescription}>Diversified across asset classes</Text>
                </View>
                {portfolioType === 'multi_asset' && (
                  <Ionicons name="checkmark" size={20} color="#3b82f6" />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={portfolioDescription}
          onChangeText={setPortfolioDescription}
          placeholder="Enter a description for your portfolio"
          multiline
          numberOfLines={4}
        />
      </View>
      
      <TouchableOpacity
        style={[styles.nextButton, !portfolioName.trim() && styles.disabledButton]}
        disabled={!portfolioName.trim()}
        onPress={() => changeStep('select')}
      >
        <Text style={styles.nextButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Render the company selection step
  const renderSelectStep = () => {
    // Log selected assets for debugging
    console.log("Selected assets:", selectedAssets);
    
    // If a company is selected, show its details
    if (selectedCompany) {
      return (
        <SP500CompanyDetail
          symbol={selectedCompany.symbol}
          onBack={handleBackFromDetails}
          onAddToPortfolio={handleAddToPortfolio}
          selected={selectedAssets.some(asset => asset.symbol === selectedCompany.symbol)}
        />
      );
    }

    return (
      <View style={styles.stepContainer}>
        <View style={styles.header}>
          <View style={styles.headerTitleSection}>
            <Text style={styles.stepTitle}>Select Companies</Text>
            <Text style={styles.stepDescription}>
              Browse and select companies to add to your portfolio.
            </Text>
          </View>
          <View style={styles.headerRightSection}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badge}>{selectedAssets.length}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.topReviewButton, selectedAssets.length === 0 && styles.disabledButton]}
              disabled={selectedAssets.length === 0}
              onPress={() => changeStep('review')}
            >
              <Text style={styles.topReviewButtonText}>Review</Text>
              <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.reviewButtonIcon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Add instruction banner */}
        <View style={styles.instructionBanner}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#3b82f6" style={{marginRight: 6}} />
          <Text style={styles.instructionText}>
            Click on a company card, then click "Add to Portfolio" to include it in your selection.
          </Text>
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by company name or symbol"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        
        <SP500SectorSelector
          sectors={sectors}
          selectedSector={selectedSector}
          onSelectSector={handleSectorSelect}
        />
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading companies...</Text>
          </View>
        ) : filteredCompanies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="database-off" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>No companies found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or sector filter</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCompanies}
            keyExtractor={(item, index) => `${item.symbol}-${index}`}
            renderItem={({ item }) => (
              <SP500CompanyCard
                company={item}
                onSelect={() => handleCompanySelect(item)}
                selected={selectedAssets.some(asset => asset.symbol === item.symbol)}
              />
            )}
            contentContainerStyle={styles.companiesList}
            ListFooterComponent={() => (
              <View style={styles.listFooter}>
                <Text style={styles.footerText}>
                  {selectedAssets.length === 0 
                    ? "Select companies to add to your portfolio" 
                    : `${selectedAssets.length} ${selectedAssets.length === 1 ? 'company' : 'companies'} selected`}
                </Text>
              </View>
            )}
          />
        )}
        
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => changeStep('info')}
          >
            <Ionicons name="arrow-back" size={20} color="#3b82f6" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render the review step
  const renderReviewStep = () => (
    <View style={styles.reviewContainer}>
      {/* Modern Header with Actions */}
      <View style={styles.modernHeader}>
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.modernTitle}>Portfolio Review</Text>
            <Text style={styles.modernSubtitle}>
              {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} • ${selectedAssets.reduce((sum, asset) => sum + asset.price * asset.quantity, 0).toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.actionButtons}>
            
            <TouchableOpacity
              style={[
                styles.modernCreateButton,
                (selectedAssets.length === 0 || isCreating) && styles.modernDisabledButton
              ]}
              onPress={handleCreatePortfolio}
              disabled={selectedAssets.length === 0 || isCreating}
            >
              {isCreating ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={styles.buttonSpinner} />
                  <Text style={styles.modernCreateText}>Creating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.modernCreateText}>Create Portfolio</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.reviewContent} showsVerticalScrollIndicator={false}>
        {/* Portfolio Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="briefcase-outline" size={20} color="#6366f1" />
            <Text style={styles.cardTitle}>Portfolio Details</Text>
          </View>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Portfolio Name</Text>
              <Text style={styles.detailValue}>{portfolioName}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <View style={styles.typeChip}>
                <Text style={styles.typeChipText}>
                  {portfolioType === 'equity' ? 'Equity' : 
                   portfolioType === 'fixed_income' ? 'Fixed Income' : 'Multi-asset'}
                </Text>
              </View>
            </View>
            
            {portfolioDescription && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{portfolioDescription}</Text>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Assets</Text>
              <Text style={styles.detailValue}>{selectedAssets.length}</Text>
            </View>
            
            <View style={[styles.detailRow, styles.totalValueRow]}>
              <Text style={styles.totalLabel}>Portfolio Value</Text>
              <Text style={styles.totalValueText}>
                ${selectedAssets.reduce((sum, asset) => sum + asset.price * asset.quantity, 0).toLocaleString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.priceNotice}>
            <Ionicons name="information-circle" size={14} color="#6366f1" />
            <Text style={styles.priceNoticeText}>Live market pricing when available</Text>
          </View>
        </View>

        {/* Assets List */}
        <View style={styles.assetsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="list-outline" size={20} color="#6366f1" />
            <Text style={styles.cardTitle}>Holdings</Text>
          </View>
          
          {selectedAssets.length === 0 ? (
            <View style={styles.modernEmptyState}>
              <Ionicons name="folder-open-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateTitle}>No Assets Selected</Text>
              <Text style={styles.emptyStateSubtitle}>Add some assets to create your portfolio</Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => changeStep('select')}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.emptyStateButtonText}>Add Assets</Text>
              </TouchableOpacity>
            </View>
          ) : (
            selectedAssets.map((item, index) => (
              <View key={item.id} style={[styles.modernAssetItem, index < selectedAssets.length - 1 && styles.assetItemBorder]}>
                <View style={styles.assetMainInfo}>
                  <View style={styles.assetIcon}>
                    <Text style={styles.assetIconText}>{item.symbol.charAt(0)}</Text>
                  </View>
                  <View style={styles.assetDetails}>
                    <Text style={styles.modernAssetSymbol}>{item.symbol}</Text>
                    <Text style={styles.modernAssetName} numberOfLines={1}>{item.name}</Text>
                  </View>
                </View>
                
                <View style={styles.assetMetrics}>
                  <View style={styles.metricColumn}>
                    <Text style={styles.metricLabel}>Qty</Text>
                    <Text style={styles.metricValue}>{item.quantity}</Text>
                  </View>
                  <View style={styles.metricColumn}>
                    <Text style={styles.metricLabel}>Price</Text>
                    <Text style={styles.metricValue}>${item.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.metricColumn}>
                    <Text style={styles.metricLabel}>Total</Text>
                    <Text style={styles.metricValueBold}>${(item.price * item.quantity).toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.modernRemoveButton}
                    onPress={() => handleRemoveAsset(item.id)}
                  >
                    <Ionicons name="close" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Navigation */}
        <View style={styles.modernNavigation}>
          <TouchableOpacity
            style={styles.modernBackButton}
            onPress={() => changeStep('select')}
          >
            <Ionicons name="chevron-back" size={18} color="#6366f1" />
            <Text style={styles.modernBackText}>Back to Selection</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.wizardHeader}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onBackToPortfolios}
        >
          <Ionicons name="close" size={24} color="#334155" />
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step === 'info' ? styles.activeStepDot : styles.completedStepDot]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === 'select' ? styles.activeStepDot : (step === 'review' ? styles.completedStepDot : styles.inactiveStepDot)]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === 'review' ? styles.activeStepDot : styles.inactiveStepDot]} />
        </View>
        
        {/* Show current step in header */}
        <Text style={styles.stepHeaderText}>
          {step === 'info' ? 'Info' : step === 'select' ? 'Select' : 'Review'}
        </Text>
      </View>
      
      {/* Debug current step */}
      {__DEV__ && (
        <View style={styles.debugBanner}>
          <Text style={styles.debugText}>Current Step: {step}</Text>
          <Text style={styles.debugText}>Assets Selected: {selectedAssets.length}</Text>
        </View>
      )}
      
      {/* Conditionally render content based on step */}
      {step === 'select' || step === 'review' ? (
        // Render select and review steps directly (without ScrollView) to avoid nesting a FlatList inside ScrollView
        <View style={styles.content}>
          {step === 'select' && renderSelectStep()}
          {step === 'review' && renderReviewStep()}
        </View>
      ) : (
        // For other steps (info step), we can use ScrollView since they don't contain FlatList
        <ScrollView style={styles.content}>
          {step === 'info' && renderInfoStep()}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    padding: 8,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginRight: 32,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeStepDot: {
    backgroundColor: '#3b82f6',
  },
  completedStepDot: {
    backgroundColor: '#10b981',
  },
  inactiveStepDot: {
    backgroundColor: '#e2e8f0',
  },
  stepLine: {
    height: 2,
    backgroundColor: '#e2e8f0',
    flex: 1,
    marginHorizontal: 4,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
    lineHeight: 28,
  },
  stepDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 4,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#1e3a8a',
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    fontSize: 14,
    color: '#1e293b',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#9ca3af',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerTitleSection: {
    flex: 1,
    paddingRight: 20,
  },
  headerRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
  },
  topReviewButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  topReviewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 4,
  },
  reviewButtonIcon: {
    marginLeft: 2,
  },
  badgeContainer: {
    backgroundColor: '#3b82f6',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    color: '#334155',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 14,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  instructionText: {
    fontSize: 13,
    color: '#1e3a8a',
    flex: 1,
  },
  companiesList: {
    paddingBottom: 120, // Increase padding to ensure navigation buttons are visible
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 32,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f9fafb',
    paddingTop: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    zIndex: 1000,
    elevation: 5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    marginLeft: 4,
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
  createButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  createButtonIcon: {
    marginRight: 8,
  },
  stepHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    width: 80,
    textAlign: 'right',
  },
  
  debugBanner: {
    backgroundColor: '#ffe4e6',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fca5a5',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  debugText: {
    color: '#b91c1c',
    fontSize: 12,
  },
  debugAssetInfo: {
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  debugAssetInfoText: {
    color: '#166534',
    fontSize: 13,
  },
  reviewScrollContainer: {
    flex: 1,
  },
  reviewContentContainer: {
    paddingBottom: 120, // Leave plenty of space for the navigation buttons
  },
  listFooter: {
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 80,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  dropdownButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dropdownContent: {
    flex: 1,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  dropdownDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  dropdownModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0f7ff',
    borderColor: '#bfdbfe',
  },
  dropdownItemContent: {
    flex: 1,
    marginRight: 8,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  dropdownItemTextSelected: {
    color: '#1e40af',
  },
  dropdownItemDescription: {
    fontSize: 14,
    color: '#64748b',
  },

  headerButtons: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
    minWidth: 140,
  },
  createPortfolioButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  createPortfolioButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  rotating: {
    opacity: 0.7,
  },
  priceNote: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reviewCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#64748b',
    width: 100,
  },
  reviewValue: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  assetsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    color: '#64748b',
  },
  assetValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 4,
  },
  quantityValue: {
    fontSize: 14,
    color: '#1e293b',
  },
  assetPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 4,
  },
  priceValue: {
    fontSize: 14,
    color: '#1e293b',
  },
  assetTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  totalValue: {
    fontSize: 14,
    color: '#1e293b',
  },
  removeButton: {
    padding: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  emptyAssetsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyAssetsText: {
    color: '#64748b',
    marginBottom: 16,
  },
  emptyAssetsButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 6,
  },
  emptyAssetsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  assetsList: {
    paddingBottom: 120, // Increase padding to ensure navigation buttons are visible
  },
  buttonIcon: {
    marginRight: 8,
  },

  
  // Modern Review Page Styles
  reviewContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modernHeader: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 60,
  },
  titleSection: {
    flex: 1,
    marginRight: 16,
    justifyContent: 'center',
  },
  modernTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
    lineHeight: 28,
  },
  modernSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  modernCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    minHeight: 36,
    justifyContent: 'center',
  },
  modernCreateText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },
  modernDisabledButton: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonSpinner: {
    marginRight: 6,
  },
  reviewContent: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
    lineHeight: 22,
  },
  detailsGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 24,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flex: 0,
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  typeChip: {
    backgroundColor: '#eff6ff',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  typeChipText: {
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  totalValueRow: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '700',
  },
  totalValueText: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '700',
  },
  priceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  priceNoticeText: {
    fontSize: 13,
    color: '#6366f1',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  assetsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  modernEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  modernAssetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 60,
  },
  assetItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  assetMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  assetIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  assetIconText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  assetDetails: {
    flex: 1,
    minWidth: 0,
  },
  modernAssetSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  modernAssetName: {
    fontSize: 13,
    color: '#64748b',
  },
  assetMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  metricColumn: {
    alignItems: 'center',
    minWidth: 50,
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  metricValueBold: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
  },
  modernRemoveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modernNavigation: {
    paddingVertical: 16,
  },
  modernBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
  },
  modernBackText: {
    color: '#6366f1',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  bottomSpacing: {
    height: 24,
  },
});

export default SP500PortfolioWizard; 
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import sp500Service from '../../services/sp500Service';
import tiingoService from '../../services/tiingoService';
import marketDataService from '../../services/marketDataService';

interface SP500CompanyDetailProps {
  symbol: string;
  onBack: () => void;
  onAddToPortfolio: (symbol: string, name: string, price: number, quantity: number) => void;
  selected: boolean;
}

const SP500CompanyDetail: React.FC<SP500CompanyDetailProps> = ({
  symbol,
  onBack,
  onAddToPortfolio,
  selected
}) => {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [quantity, setQuantity] = useState('1');
  const [totalValue, setTotalValue] = useState(0);
  const [historicalPrices, setHistoricalPrices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [realTimePrice, setRealTimePrice] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadCompanyData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load company details from SP500 service
        const details = await sp500Service.getCompanyDetails(symbol);
        setCompany(details);
        
        // Try to get real-time price data from Tiingo
        try {
          const priceData = await tiingoService.getRealTimePrice(symbol);
          if (priceData && (priceData.tngoLast || priceData.last)) {
            // Use tngoLast if available, otherwise fall back to last
            const price = priceData.tngoLast || priceData.last;
            setRealTimePrice(price);
            console.log(`Real-time price for ${symbol}: $${price}`);
            
            // Calculate initial total value using real-time price
            updateTotalValue(price, parseFloat(quantity) || 0);
          } else {
            // Fall back to quote price if Tiingo data unavailable
            console.log(`No real-time price available for ${symbol}, using quote price`);
            if (details && details.quote) {
              updateTotalValue(details.quote.price, parseFloat(quantity) || 0);
            }
          }
        } catch (priceError) {
          console.error(`Error getting real-time price for ${symbol}:`, priceError);
          // Fall back to quote price if Tiingo API fails
          if (details && details.quote) {
            updateTotalValue(details.quote.price, parseFloat(quantity) || 0);
          }
        }
        
        // Load historical price data
        const priceHistory = await sp500Service.getHistoricalPrices(symbol, 30);
        setHistoricalPrices(priceHistory);
      } catch (err) {
        console.error(`Error loading data for ${symbol}:`, err);
        setError('Failed to load company data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadCompanyData();
  }, [symbol]);

  // Function to refresh real-time price
  const refreshPrice = async () => {
    if (!company) return;
    
    setRefreshing(true);
    try {
      // Clear cache to ensure fresh data
      tiingoService.clearCache();
      
      // Get fresh real-time price
      const priceData = await tiingoService.getRealTimePrice(symbol);
      if (priceData && (priceData.tngoLast || priceData.last)) {
        const price = priceData.tngoLast || priceData.last;
        setRealTimePrice(price);
        
        // Update total value
        updateTotalValue(price, parseFloat(quantity) || 0);
        
        // Show confirmation
        Alert.alert(
          "Price Updated",
          `Latest price for ${symbol}: $${price.toFixed(2)}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Update Failed",
          "Unable to get real-time price data. Using most recent available price.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error(`Error refreshing price for ${symbol}:`, error);
      Alert.alert(
        "Update Failed",
        "Unable to refresh price data. Please try again later.",
        [{ text: "OK" }]
      );
    } finally {
      setRefreshing(false);
    }
  };

  const updateTotalValue = (price: number, qty: number) => {
    setTotalValue(price * qty);
  };

  const handleQuantityChange = (value: string) => {
    // Only allow numeric values
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setQuantity(value);
      
      // Use real-time price if available, otherwise fall back to quote price
      const price = realTimePrice || (company && company.quote ? company.quote.price : 0);
      updateTotalValue(price, parseFloat(value) || 0);
    }
  };

  const handleAddToPortfolio = () => {
    if (company && parseFloat(quantity) > 0) {
      // Use real-time price if available, otherwise fall back to quote price
      const price = realTimePrice || (company.quote ? company.quote.price : 0);
      
      console.log(`Adding ${symbol} to portfolio with real-time price: $${price}`);
      onAddToPortfolio(
        symbol,
        company.profile.companyName || company.quote.name,
        price,
        parseFloat(quantity)
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading {symbol}...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading company data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!company) return null;

  const { profile, quote, metrics } = company;
  
  // Use real-time price if available, otherwise fall back to quote price
  const displayPrice = realTimePrice || quote.price;
  const priceSource = realTimePrice ? 'Real-time' : 'Delayed';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{symbol}</Text>
        {selected && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>In Portfolio</Text>
          </View>
        )}
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.priceSection}>
          <Text style={styles.companyName}>{profile.companyName || quote.name}</Text>
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>${displayPrice.toFixed(2)}</Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={refreshPrice}
                disabled={refreshing}
              >
                <Ionicons 
                  name={refreshing ? "sync-circle" : "sync"} 
                  size={20} 
                  color="#3b82f6" 
                  style={refreshing ? styles.rotating : undefined}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.priceSource}>{priceSource} price</Text>
            <Text style={[
              styles.priceChange,
              quote.change >= 0 ? styles.pricePositive : styles.priceNegative
            ]}>
              {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} 
              ({quote.changesPercentage}%)
            </Text>
          </View>
        </View>
        
        {profile.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{profile.description}</Text>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sector</Text>
            <Text style={styles.infoValue}>{profile.sector}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Industry</Text>
            <Text style={styles.infoValue}>{profile.industry}</Text>
          </View>
          
          {profile.ceo && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CEO</Text>
              <Text style={styles.infoValue}>{profile.ceo}</Text>
            </View>
          )}
          
          {profile.website && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Website</Text>
              <Text style={styles.infoValue}>{profile.website}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Exchange</Text>
            <Text style={styles.infoValue}>{quote.exchange}</Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                ${((displayPrice * (quote.sharesOutstanding || 0)) / 1000000000).toFixed(2)}B
              </Text>
              <Text style={styles.metricLabel}>Market Cap</Text>
            </View>
            
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {displayPrice && metrics.eps ? 
                  (displayPrice / metrics.eps).toFixed(2) : 
                  quote.pe ? quote.pe.toFixed(2) : 
                  metrics.peRatioTTM ? metrics.peRatioTTM.toFixed(2) : 
                  'N/A'}
              </Text>
              <Text style={styles.metricLabel}>P/E Ratio</Text>
            </View>
            
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {metrics.dividendYieldTTM ? 
                  `${(metrics.dividendYieldTTM * 100).toFixed(2)}%` : 
                  'N/A'}
              </Text>
              <Text style={styles.metricLabel}>Dividend Yield</Text>
            </View>
            
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {metrics.roeTTM ? 
                  `${(metrics.roeTTM * 100).toFixed(2)}%` : 
                  'N/A'}
              </Text>
              <Text style={styles.metricLabel}>ROE</Text>
            </View>
          </View>
          <Text style={styles.dataSourceNote}>
            {realTimePrice ? 'Using real-time market data' : 'Using delayed market data'} • 
            Updated: {new Date().toLocaleTimeString()}
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          
          <View style={styles.priceRangeContainer}>
            <Text style={styles.priceRangeLabel}>52-Week Range</Text>
            <View style={styles.priceRangeBar}>
              <View 
                style={[
                  styles.priceRangeBarInner,
                  {
                    width: `${Math.max(0, Math.min(100, ((displayPrice - quote.yearLow) / (quote.yearHigh - quote.yearLow)) * 100))}%`,
                    backgroundColor: '#3b82f6'
                  }
                ]}
              />
              <View 
                style={[
                  styles.priceRangeIndicator,
                  {
                    left: `${Math.max(0, Math.min(100, ((displayPrice - quote.yearLow) / (quote.yearHigh - quote.yearLow)) * 100))}%`
                  }
                ]}
              />
            </View>
            <View style={styles.priceRangeLegend}>
              <Text style={styles.priceRangeLow}>${quote.yearLow.toFixed(2)}</Text>
              <Text style={styles.priceRangeHigh}>${quote.yearHigh.toFixed(2)}</Text>
            </View>
            <View style={styles.currentPriceIndicator}>
              <Text style={styles.currentPriceLabel}>Current: </Text>
              <Text style={styles.currentPriceValue}>${displayPrice.toFixed(2)}</Text>
              {realTimePrice && (
                <View style={styles.realTimeIndicator}>
                  <Text style={styles.realTimeText}>LIVE</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add to Portfolio</Text>
          
          <View style={styles.instructionCard}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#3b82f6" style={{marginRight: 6}} />
            <Text style={styles.instructionText}>
              Set the quantity below and click "Add to Portfolio" to include this company in your selection.
            </Text>
          </View>
          
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Quantity:</Text>
            <TextInput
              style={styles.quantityInput}
              value={quantity}
              onChangeText={handleQuantityChange}
              keyboardType="numeric"
              placeholder="Enter quantity"
            />
          </View>
          
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Value:</Text>
            <Text style={styles.totalValue}>
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.addButton,
              (parseFloat(quantity) <= 0 || selected) && styles.disabledButton
            ]}
            disabled={parseFloat(quantity) <= 0 || selected}
            onPress={handleAddToPortfolio}
          >
            {selected ? (
              <Text style={styles.addButtonText}>Added to Portfolio</Text>
            ) : (
              <>
                <MaterialCommunityIcons name="plus-circle" size={20} color="#fff" style={{marginRight: 8}} />
                <Text style={styles.addButtonText}>Add to Portfolio</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  selectedBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  selectedBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  priceSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  priceContainer: {
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginRight: 8,
  },
  priceSource: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  refreshButton: {
    marginLeft: 12,
    padding: 4,
  },
  rotating: {
    opacity: 0.7,
  },
  priceChange: {
    fontSize: 16,
    fontWeight: '500',
  },
  pricePositive: {
    color: '#10b981',
  },
  priceNegative: {
    color: '#ef4444',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 100,
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  metricItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  priceRangeContainer: {
    marginTop: 8,
  },
  priceRangeLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  priceRangeBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  priceRangeBarInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 4,
  },
  priceRangeIndicator: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    top: -4,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  priceRangeLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceRangeLow: {
    fontSize: 12,
    color: '#64748b',
  },
  priceRangeHigh: {
    fontSize: 12,
    color: '#64748b',
  },
  dataSourceNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  quantityContainer: {
    marginBottom: 16,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 14,
    color: '#1e293b',
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalValueLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  totalValueAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addButtonIcon: {
    marginRight: 8,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
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
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 8,
  },
  currentPriceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  currentPriceLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  currentPriceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 4,
  },
  realTimeIndicator: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  realTimeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SP500CompanyDetail; 
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  SafeAreaView,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SecuritySearchResult, SecurityDetails as SecurityDetailsType } from '../../services/marketDataService';
import marketDataService from '../../services/marketDataService';
import tiingoService from '../../services/tiingoService';

interface SecurityDetailsProps {
  security: SecuritySearchResult;
  onBack: () => void;
  onAddToPortfolio: (security: SecurityDetailsType, quantity: number) => void;
}

const SecurityDetailsComponent: React.FC<SecurityDetailsProps> = ({ 
  security, 
  onBack,
  onAddToPortfolio
}) => {
  const [details, setDetails] = useState<SecurityDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState('1');
  const [totalValue, setTotalValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get security details from market data service (now uses Tiingo API)
      const securityDetails = await marketDataService.getSecurityDetails(security.symbol);
      setDetails(securityDetails);
      updateTotalValue(securityDetails.price, parseFloat(quantity) || 0);
    } catch (err) {
      console.error('Error loading security details:', err);
      setError('Failed to load security details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [security]);

  // Function to refresh price data
  const refreshPriceData = async () => {
    if (!details) return;
    
    setRefreshing(true);
    try {
      // Get the latest price directly from Tiingo
      const realTimeData = await tiingoService.getRealTimePrice(security.symbol);
      
      // Log the API response for debugging
      console.log(`Refresh price data for ${security.symbol}:`, JSON.stringify(realTimeData, null, 2));
      
      // Update the details with the new price
      setDetails(prevDetails => {
        if (!prevDetails) return null;
        
        // Use tngoLast for more reliable price data
        const updatedPrice = realTimeData.tngoLast || realTimeData.last;
        const previousPrice = prevDetails.price;
        const change = updatedPrice - realTimeData.prevClose;
        const changePercent = change / realTimeData.prevClose;
        
        const updatedDetails = {
          ...prevDetails,
          price: updatedPrice,
          previousClose: realTimeData.prevClose,
          change,
          changePercent,
          high: realTimeData.high,
          low: realTimeData.low,
          volume: realTimeData.volume
        };
        
        // Update the total value based on the new price
        updateTotalValue(updatedPrice, parseFloat(quantity) || 0);
        
        return updatedDetails;
      });
    } catch (err) {
      console.error('Error refreshing price data:', err);
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
      if (details) {
        updateTotalValue(details.price, parseFloat(value) || 0);
      }
    }
  };

  const handleAddToPortfolio = () => {
    if (details && parseFloat(quantity) > 0) {
      onAddToPortfolio(details, parseFloat(quantity));
    }
  };
  
  // Enhanced back button handler with debug
  const handleBack = () => {
    console.log('Back button pressed in SecurityDetails for', security.symbol);
    // Directly call onBack to return to the assets selection page
    onBack();
  };

  // Debug function to test the API directly
  const testTiingoApi = async () => {
    try {
      // Test with a known reliable ticker like AAPL
      const testSymbol = 'AAPL';
      console.log(`Testing Tiingo API with ${testSymbol}`);
      
      // Get real-time data directly from Tiingo
      const apiData = await tiingoService.getRealTimePrice(testSymbol);
      console.log('Tiingo API response:', JSON.stringify(apiData, null, 2));
      
      // Show alert with results
      Alert.alert(
        'API Test Results', 
        `Symbol: ${testSymbol}\n` +
        `last: ${apiData.last}\n` +
        `tngoLast: ${apiData.tngoLast}\n` +
        `prevClose: ${apiData.prevClose}`
      );
    } catch (error: any) {
      console.error('Error testing Tiingo API:', error);
      Alert.alert('API Test Failed', `Error: ${error?.message || 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable 
            onPress={handleBack} 
            style={({pressed}) => [
              styles.backButton,
              pressed ? styles.backButtonPressed : null
            ]}
            hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
          >
            <View style={styles.backButtonContent}>
              <Ionicons name="chevron-back" size={28} color="#007AFF" />
              <Text style={styles.backButtonText}>Back</Text>
            </View>
          </Pressable>
          <Text style={styles.headerTitle}>Loading Details...</Text>
          <View style={styles.headerActions} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading security details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable 
            onPress={handleBack} 
            style={({pressed}) => [
              styles.backButton,
              pressed ? styles.backButtonPressed : null
            ]}
            hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
          >
            <View style={styles.backButtonContent}>
              <Ionicons name="chevron-back" size={28} color="#007AFF" />
              <Text style={styles.backButtonText}>Back</Text>
            </View>
          </Pressable>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={styles.headerActions} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!details) return null;

    return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          onPress={handleBack} 
          style={({pressed}) => [
            styles.backButton,
            pressed ? styles.backButtonPressed : null
          ]}
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
        >
          <View style={styles.backButtonContent}>
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </View>
        </Pressable>
        <Text style={styles.headerTitle}>{security.symbol}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={refreshPriceData}
            disabled={refreshing}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={refreshing ? "sync-circle" : "sync"} 
              size={22} 
              color="#3b82f6" 
              style={refreshing ? styles.rotating : undefined} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={testTiingoApi}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="bug" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.securityHeader}>
          <Text style={styles.securityName}>{details.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Current Price:</Text>
            <Text style={styles.priceValue}>${details.price !== null && details.price !== undefined ? details.price.toFixed(2) : 'N/A'}</Text>
            <Text style={[
              styles.priceChange,
              (details.change !== null && details.change !== undefined) && (details.change >= 0 ? styles.positiveChange : styles.negativeChange)
            ]}>
              {details.change !== null && details.change !== undefined ? 
                `${details.change >= 0 ? '+' : ''}${details.change.toFixed(2)}` : 'N/A'} 
              {details.changePercent !== null && details.changePercent !== undefined ? 
                `(${details.changePercent >= 0 ? '+' : ''}${(details.changePercent * 100).toFixed(2)}%)` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.priceDataContainer}>
          <Text style={styles.sectionTitle}>Price Data</Text>
          <View style={styles.priceDataGrid}>
            <View style={styles.priceDataItem}>
              <Text style={styles.priceDataLabel}>Previous Close</Text>
              <Text style={styles.priceDataValue}>
                ${details.previousClose !== null && details.previousClose !== undefined ? 
                   details.previousClose.toFixed(2) : 'N/A'}
              </Text>
            </View>
            
            {details.high !== undefined && details.high !== null && (
              <View style={styles.priceDataItem}>
                <Text style={styles.priceDataLabel}>Day's High</Text>
                <Text style={styles.priceDataValue}>${details.high.toFixed(2)}</Text>
              </View>
            )}
            
            {details.low !== undefined && details.low !== null && (
              <View style={styles.priceDataItem}>
                <Text style={styles.priceDataLabel}>Day's Low</Text>
                <Text style={styles.priceDataValue}>${details.low.toFixed(2)}</Text>
              </View>
            )}
            
            <View style={styles.priceDataItem}>
              <Text style={styles.priceDataLabel}>Volume</Text>
              <Text style={styles.priceDataValue}>
                {details.volume !== null && details.volume !== undefined ? 
                 details.volume.toLocaleString() : 'N/A'}
              </Text>
            </View>
          </View>
          <Text style={styles.realTimeLabel}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            {' '}Real-time data via Tiingo
          </Text>
        </View>

        {details.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{details.description}</Text>
          </View>
        )}

        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Asset Class</Text>
            <Text style={styles.detailValue}>
              {details.assetClass ? 
                (details.assetClass.charAt(0).toUpperCase() + details.assetClass.slice(1)) : 
                'N/A'}
            </Text>
          </View>
          
          {details.sector && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Sector</Text>
              <Text style={styles.detailValue}>{details.sector}</Text>
            </View>
          )}
          
          {details.industry && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Industry</Text>
              <Text style={styles.detailValue}>{details.industry}</Text>
            </View>
          )}
          
          {details.marketCap !== undefined && details.marketCap !== null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Market Cap</Text>
              <Text style={styles.detailValue}>
                ${(details.marketCap / 1000000000).toFixed(2)}B
              </Text>
            </View>
          )}
          
          {details.peRatio !== undefined && details.peRatio !== null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>P/E Ratio</Text>
              <Text style={styles.detailValue}>{details.peRatio.toFixed(2)}</Text>
            </View>
          )}
          
          {details.dividendYield !== undefined && details.dividendYield !== null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dividend Yield</Text>
              <Text style={styles.detailValue}>{details.dividendYield.toFixed(2)}%</Text>
            </View>
          )}
        </View>

        <View style={styles.addToPortfolioContainer}>
          <Text style={styles.sectionTitle}>Add to Portfolio</Text>
          
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <View style={styles.quantityInputContainer}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => {
                  const currentValue = parseFloat(quantity) || 0;
                  if (currentValue > 1) {
                    const newValue = (currentValue - 1).toString();
                    handleQuantityChange(newValue);
                  }
                }}
              >
                <Ionicons name="remove" size={20} color="#64748b" />
              </TouchableOpacity>
              
              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={handleQuantityChange}
                keyboardType="decimal-pad"
              />
              
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => {
                  const currentValue = parseFloat(quantity) || 0;
                  const newValue = (currentValue + 1).toString();
                  handleQuantityChange(newValue);
                }}
              >
                <Ionicons name="add" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.totalValueContainer}>
            <Text style={styles.totalValueLabel}>Total Value:</Text>
            <Text style={styles.totalValueAmount}>
              ${totalValue !== null && totalValue !== undefined ? totalValue.toFixed(2) : '0.00'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.addButton,
              parseFloat(quantity) <= 0 && styles.disabledButton
            ]}
            onPress={handleAddToPortfolio}
            disabled={parseFloat(quantity) <= 0}
          >
            <Ionicons name="add-circle" size={20} color="#fff" style={styles.addButtonIcon} />
            <Text style={styles.addButtonText}>Add to Portfolio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  safeArea: {
    backgroundColor: '#fff',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    position: 'relative',
    zIndex: 10,
    height: Platform.OS === 'ios' ? 90 : 60,
  },
  backButton: {
    padding: 12,
    marginLeft: -8,
    width: 100,
    height: 50,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 20,
    position: 'relative',
    borderRadius: 10,
  },
  backButtonPressed: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    opacity: 0.9,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 5,
  },
  backButtonText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: -4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    marginLeft: -90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 24,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  securityHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  securityName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  priceContainer: {
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 6,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  priceChange: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  positiveChange: {
    color: '#10b981',
  },
  negativeChange: {
    color: '#ef4444',
  },
  descriptionContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  detailsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  addToPortfolioContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 24,
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
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 16,
  },
  totalValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 16,
  },
  totalValueLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  totalValueAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotating: {
    opacity: 0.7,
  },
  priceDataContainer: {
    backgroundColor: '#fff',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priceDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  priceDataItem: {
    width: '50%',
    paddingVertical: 8,
    paddingRight: 8,
  },
  priceDataLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  priceDataValue: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  realTimeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  debugButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 88,
    justifyContent: 'flex-end',
  },
});

export default SecurityDetailsComponent; 
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SP500Company } from '../../services/sp500Service';
import sp500Service from '../../services/sp500Service';
import tiingoService from '../../services/tiingoService';
import useAutoRefresh from '../../hooks/useAutoRefresh';

interface SP500CompanyCardProps {
  company: SP500Company;
  onSelect: () => void;
  selected: boolean;
}

const SP500CompanyCard: React.FC<SP500CompanyCardProps> = ({
  company,
  onSelect,
  selected
}) => {
  const [price, setPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetchPriceData();
  }, [company.symbol]);

  const fetchPriceData = async () => {
    try {
      setLoading(true);
      
      // First try to get real-time price from Tiingo
      try {
        const priceData = await tiingoService.getRealTimePrice(company.symbol);
        if (priceData && (priceData.tngoLast || priceData.last)) {
          // Use tngoLast if available, otherwise fall back to last
          const realTimePrice = priceData.tngoLast || priceData.last;
          setPrice(realTimePrice);
          
          // Set price change based on prevClose if available
          if (priceData.prevClose) {
            setPriceChange(realTimePrice - priceData.prevClose);
          }
          console.log(`Real-time price for ${company.symbol}: $${realTimePrice}`);
        } else {
          throw new Error('No real-time price available');
        }
      } catch (tiingoError) {
        console.error(`Error fetching Tiingo price for ${company.symbol}:`, tiingoError);
        
        // Fallback to sp500 service if Tiingo fails
        const details = await sp500Service.getCompanyDetails(company.symbol);
        if (details && details.quote) {
          setPrice(details.quote.price);
          setPriceChange(details.quote.change);
        }
      }
    } catch (error) {
      console.error(`Error fetching price for ${company.symbol}:`, error);
    } finally {
      setLoading(false);

    }
  };

  // Get sector color based on name
  const getSectorColor = (sector: string): string => {
    const sectorColors: Record<string, string> = {
      'Information Technology': '#3b82f6', // blue
      'Health Care': '#10b981', // green
      'Consumer Discretionary': '#f59e0b', // amber
      'Financials': '#8b5cf6', // purple
      'Communication Services': '#ef4444', // red
      'Industrials': '#6b7280', // gray
      'Consumer Staples': '#14b8a6', // teal
      'Energy': '#f97316', // orange
      'Real Estate': '#4f46e5', // indigo
      'Materials': '#0ea5e9', // sky blue
      'Utilities': '#64748b', // slate
    };
    
    return sectorColors[sector] || '#6b7280'; // default gray
  };

  // Auto-refresh price data every 6 minutes
  useAutoRefresh({
    interval: 6 * 60 * 1000, // 6 minutes
    enabled: true,
    onRefresh: fetchPriceData,
    respectMarketHours: true
  });

  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.selectedContainer]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.symbolContainer}>
          <View 
            style={[
              styles.sectorIndicator, 
              { backgroundColor: getSectorColor(company.sector) }
            ]} 
          />
          <Text style={styles.symbol}>{company.symbol}</Text>
          {selected && <Ionicons name="checkmark-circle" size={16} color="#10b981" style={styles.selectedIcon} />}
        </View>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {company.name}
        </Text>
        <View style={styles.infoRow}>
          <Text style={styles.sector}>{company.sector}</Text>
        </View>
      </View>
      
      <View style={styles.priceContainer}>
        {loading ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : (
          <>
            <Text style={styles.price}>
              ${price !== null ? price.toFixed(2) : '—'}
            </Text>
            {priceChange !== null && typeof priceChange === 'number' && (
              <Text style={[
                styles.priceChange,
                priceChange >= 0 ? styles.pricePositive : styles.priceNegative
              ]}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
              </Text>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedContainer: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  content: {
    flex: 1,
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  symbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  selectedIcon: {
    marginLeft: 6,
  },
  name: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sector: {
    fontSize: 12,
    color: '#64748b',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },

  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  priceChange: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  pricePositive: {
    color: '#10b981',
  },
  priceNegative: {
    color: '#ef4444',
  },
});

export default SP500CompanyCard; 
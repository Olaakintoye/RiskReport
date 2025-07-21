import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Button,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import marketDataService, { SecuritySearchResult } from '../../services/marketDataService';

interface SecuritySearchProps {
  onSelect: (security: SecuritySearchResult) => void;
}

const SecuritySearch: React.FC<SecuritySearchProps> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SecuritySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [sp500Constituents, setSP500Constituents] = useState<SecuritySearchResult[]>([]);
  const [loadingSP500, setLoadingSP500] = useState(false);
  const [showSP500, setShowSP500] = useState(false);

  // Popular equity and bond suggestions
  const [popularEquities, setPopularEquities] = useState<SecuritySearchResult[]>([]);
  const [popularBonds, setPopularBonds] = useState<SecuritySearchResult[]>([]);

  useEffect(() => {
    // Load popular securities on component mount
    setPopularEquities(marketDataService.getPopularEquities());
    setPopularBonds(marketDataService.getPopularBonds());
  }, []);

  // Load S&P 500 constituents
  const loadSP500Constituents = async () => {
    setLoadingSP500(true);
    try {
      const constituents = await marketDataService.getSP500Constituents();
      setSP500Constituents(constituents);
    } catch (error) {
      console.error('Error loading S&P 500 constituents:', error);
    } finally {
      setLoadingSP500(false);
    }
  };

  useEffect(() => {
    // Search when query changes (with debounce)
    const handler = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else if (query.length === 0) {
        setResults([]);
        setSearchPerformed(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const searchResults = await marketDataService.searchSecurities(query);
      setResults(searchResults);
      setSearchPerformed(true);
      setShowSuggestions(false);
      setShowSP500(false);
    } catch (error) {
      console.error('Error searching securities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (security: SecuritySearchResult) => {
    onSelect(security);
    setQuery('');
    setResults([]);
    setSearchPerformed(false);
    setShowSuggestions(true);
    setShowSP500(false);
  };

  const toggleSP500List = () => {
    if (showSP500) {
      setShowSP500(false);
    } else {
      if (sp500Constituents.length === 0) {
        loadSP500Constituents();
      }
      setShowSP500(true);
      setShowSuggestions(false);
    }
  };

  const renderSuggestions = () => {
    // Define types for our combined data
    type SuggestionItem = 
      | { id: string; type: 'header'; title: string }
      | { id: string; type: 'item'; data: SecuritySearchResult }
      | { id: string; type: 'button' };
    
    // Create an array of all items to display
    const combinedData: SuggestionItem[] = [
      { id: 'header-stocks', type: 'header', title: 'Popular Stocks' },
      ...popularEquities.slice(0, 5).map(item => ({ 
        id: `stock-${item.symbol}`, 
        type: 'item' as const, 
        data: item 
      })),
      { id: 'header-bonds', type: 'header', title: 'Popular Bonds & ETFs' },
      ...popularBonds.slice(0, 5).map(item => ({ 
        id: `bond-${item.symbol}`, 
        type: 'item' as const, 
        data: item 
      })),
      { id: 'sp500-button', type: 'button' }
    ];
    
    return (
      <FlatList
        data={combinedData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{item.title}</Text>
              </View>
            );
          } else if (item.type === 'item') {
            return renderSecurityItem(item.data);
          } else if (item.type === 'button') {
            return (
              <TouchableOpacity 
                style={styles.sp500Button} 
                onPress={toggleSP500List}
              >
                <Text style={styles.sp500ButtonText}>View S&P 500 Constituents</Text>
                <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
              </TouchableOpacity>
            );
          }
          return null;
        }}
        ItemSeparatorComponent={({ leadingItem }) => {
          const item = leadingItem as SuggestionItem;
          return item.type === 'item' ? <View style={styles.separator} /> : null;
        }}
      />
    );
  };

  const renderSP500List = () => {
    if (loadingSP500) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading S&P 500 constituents...</Text>
        </View>
      );
    }

    type SP500Item = 
      | { id: string; type: 'header' }
      | { id: string; type: 'item'; data: SecuritySearchResult };

    // Create data with header row
    const sp500Data: SP500Item[] = [
      { id: 'header', type: 'header' },
      ...sp500Constituents.map(item => ({
        id: `sp500-${item.symbol}`,
        type: 'item' as const,
        data: item
      }))
    ];

    return (
      <FlatList
        data={sp500Data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.sp500Header}>
                <TouchableOpacity onPress={toggleSP500List} style={styles.backButton}>
                  <Ionicons name="chevron-back" size={16} color="#3b82f6" />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.sp500Title}>S&P 500 Constituents</Text>
              </View>
            );
          } else if (item.type === 'item') {
            return renderSecurityItem(item.data);
          }
          return null;
        }}
        ItemSeparatorComponent={({ leadingItem }) => {
          const item = leadingItem as SP500Item;
          return item.type === 'item' ? <View style={styles.separator} /> : null;
        }}
        style={styles.resultsList}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
      />
    );
  };

  const renderSecurityItem = (item: SecuritySearchResult) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.symbolContainer}>
        <Text style={styles.symbolText}>{item.symbol}</Text>
        <View style={[
          styles.assetTypeBadge,
          item.assetType === 'equity' ? styles.equityBadge : 
          item.assetType === 'bond' ? styles.bondBadge : styles.etfBadge
        ]}>
          <Text style={styles.assetTypeText}>{item.assetType.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.nameText}>{item.name}</Text>
      <Text style={styles.exchangeText}>{item.exchange}</Text>
    </TouchableOpacity>
  );

  const renderSearchResults = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (searchPerformed && results.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No results found for "{query}"</Text>
        </View>
      );
    }

    type SearchResultItem = { id: string; type: 'item'; data: SecuritySearchResult };

    const searchResultsData: SearchResultItem[] = results.map(item => ({
      id: `search-${item.symbol}`,
      type: 'item' as const,
      data: item
    }));

    return (
      <FlatList
        data={searchResultsData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderSecurityItem(item.data)}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        style={styles.resultsList}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for stocks, bonds, or ETFs..."
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => {
              setQuery('');
              setResults([]);
              setSearchPerformed(false);
              setShowSuggestions(true);
              setShowSP500(false);
            }}
          >
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.resultsContainer}>
        {showSP500 ? renderSP500List() :
          query.length > 0 ? renderSearchResults() : showSuggestions && renderSuggestions()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 16,
    color: '#334155',
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    marginLeft: 8,
    color: '#64748b',
    fontSize: 16,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: 16,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    padding: 12,
    backgroundColor: 'white',
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  symbolText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginRight: 8,
  },
  assetTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  equityBadge: {
    backgroundColor: '#dbeafe',
  },
  bondBadge: {
    backgroundColor: '#dcfce7',
  },
  etfBadge: {
    backgroundColor: '#fef3c7',
  },
  assetTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  nameText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  exchangeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  categoryHeader: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  sp500Button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  sp500ButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#3b82f6',
  },
  sp500Header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    marginLeft: 4,
  },
  sp500Title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    marginRight: 30, // Balance the layout with backButton
  },
});

export default SecuritySearch; 
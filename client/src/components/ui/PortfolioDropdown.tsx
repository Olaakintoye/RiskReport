import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { PortfolioSummary } from '../../services/portfolioService';

interface PortfolioDropdownProps {
  portfolios: PortfolioSummary[];
  selectedPortfolioId: string;
  onSelectPortfolio: (portfolioId: string) => void;
}

const { height, width } = Dimensions.get('window');

const PortfolioDropdown: React.FC<PortfolioDropdownProps> = ({
  portfolios,
  selectedPortfolioId,
  onSelectPortfolio
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Find the selected portfolio from the ID
  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSelect = (portfolioId: string) => {
    onSelectPortfolio(portfolioId);
    setIsDropdownOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.dropdownTrigger}
        onPress={toggleDropdown}
        disabled={portfolios.length <= 1}
      >
        <View style={styles.selectedItem}>
          <View style={styles.portfolioIcon}>
            {selectedPortfolio ? (
              <MaterialCommunityIcons name="briefcase" size={18} color="#fff" />
            ) : (
              <MaterialCommunityIcons name="folder-outline" size={18} color="#fff" />
            )}
          </View>
          <View style={styles.selectedTextContainer}>
            <Text style={styles.portfolioName}>
              {selectedPortfolio?.name || 'No Portfolio Selected'}
            </Text>
            <Text style={styles.portfolioCount}>
              {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''} available
            </Text>
          </View>
        </View>
        {portfolios.length > 1 && (
          <Ionicons 
            name={isDropdownOpen ? "chevron-up" : "chevron-down"}
            size={16} 
            color="#64748b"
            style={styles.chevron}
          />
        )}
      </TouchableOpacity>

      {isDropdownOpen && (
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Select Portfolio ({portfolios.length})</Text>
            <TouchableOpacity onPress={toggleDropdown}>
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollContainer}>
            {portfolios.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.portfolioItem,
                  selectedPortfolioId === item.id && styles.selectedPortfolioItem
                ]}
                onPress={() => handleSelect(item.id)}
              >
                <View style={styles.portfolioItemContent}>
                  <View style={[
                    styles.portfolioIcon,
                    selectedPortfolioId === item.id && styles.selectedPortfolioIcon
                  ]}>
                    <MaterialCommunityIcons name="briefcase" size={18} color="#fff" />
                  </View>
                  <View>
                    <Text style={[
                      styles.portfolioItemName,
                      selectedPortfolioId === item.id && styles.selectedPortfolioText
                    ]}>
                      {item.name}
                    </Text>
                    <Text style={styles.portfolioItemValue}>
                      ${item.totalValue.toLocaleString()}
                    </Text>
                  </View>
                </View>
                {selectedPortfolioId === item.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 200,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  portfolioName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
  },
  chevron: {
    marginLeft: 8,
  },
  selectedTextContainer: {
    flexDirection: 'column',
  },
  portfolioCount: {
    fontSize: 12,
    color: '#64748b',
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 300,
    zIndex: 1000,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  scrollContainer: {
    maxHeight: 250,
  },
  portfolioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    marginHorizontal: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  selectedPortfolioItem: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  portfolioItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedPortfolioIcon: {
    backgroundColor: '#0ea5e9',
  },
  portfolioItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 4,
  },
  selectedPortfolioText: {
    color: '#0284c7',
    fontWeight: '600',
  },
  portfolioItemValue: {
    fontSize: 14,
    color: '#64748b',
  },
});

export default PortfolioDropdown; 
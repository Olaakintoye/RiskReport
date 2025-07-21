import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { PortfolioSummary } from '../../../../services/portfolioService';

interface PortfolioSelectorProps {
  portfolios: PortfolioSummary[];
  selectedPortfolioId: string;
  onSelectPortfolio: (portfolioId: string) => void;
}

const PortfolioSelector: React.FC<PortfolioSelectorProps> = ({
  portfolios,
  selectedPortfolioId,
  onSelectPortfolio
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  
  const handleSelectPortfolio = (portfolioId: string) => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    onSelectPortfolio(portfolioId);
    setModalVisible(false);
  };
  
  const openModal = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={openModal}
        activeOpacity={0.7}
      >
        <View style={styles.selectorContent}>
          <Text style={styles.portfolioName} numberOfLines={1}>
            {selectedPortfolio?.name || 'Select Portfolio'}
          </Text>
          <Text style={styles.portfolioValue} numberOfLines={1}>
            ${selectedPortfolio?.totalValue.toLocaleString() || '0'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color="#007AFF" />
      </TouchableOpacity>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Portfolio</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close-circle-outline" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={portfolios}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.portfolioItem,
                    item.id === selectedPortfolioId && styles.selectedItem
                  ]}
                  onPress={() => handleSelectPortfolio(item.id)}
                >
                  <View style={styles.portfolioInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemValue}>${item.totalValue.toLocaleString()}</Text>
                  </View>
                  {item.id === selectedPortfolioId && (
                    <Ionicons name="checkmark" size={22} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  selectorContent: {
    flex: 1,
  },
  portfolioName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 14,
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F5F5F7',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  portfolioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  selectedItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  portfolioInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 14,
    color: '#8E8E93',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});

export default PortfolioSelector; 
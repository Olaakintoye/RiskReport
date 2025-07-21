import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  FlatList,
  Dimensions,
  PanResponder,
  Modal,
  Alert,
  TextInput,
  Platform,
  ScrollView
} from 'react-native';
import { MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { Portfolio, Asset } from '../../services/portfolioService';
import SecuritySearch from '../portfolio/SecuritySearch';
import SecurityDetails from '../portfolio/SecurityDetails';
import { SecuritySearchResult, SecurityDetails as SecurityDetailsType } from '../../services/marketDataService';

interface PortfolioDetailsSheetProps {
  visible: boolean;
  portfolio: Portfolio | null;
  onClose: () => void;
  onEditAsset?: (asset: Asset, newQuantity: number) => void;
  onDeleteAsset?: (asset: Asset) => void;
  onAddAsset?: (portfolioId: string, asset: Asset) => Promise<Portfolio | void>;
}

const { height } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = height * 0.8;
const SHEET_MIN_HEIGHT = height * 0.1;
const SHEET_INITIAL_HEIGHT = height * 0.6;

const PortfolioDetailsSheet: React.FC<PortfolioDetailsSheetProps> = ({
  visible,
  portfolio,
  onClose,
  onEditAsset,
  onDeleteAsset,
  onAddAsset
}) => {
  const sheetHeight = useRef(new Animated.Value(SHEET_INITIAL_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const [searchMode, setSearchMode] = useState(false);
  const [selectedSecurity, setSelectedSecurity] = useState<SecuritySearchResult | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(sheetHeight, {
          toValue: SHEET_INITIAL_HEIGHT,
          duration: 300,
          useNativeDriver: false
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: false
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetHeight, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false
        })
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newHeight = SHEET_INITIAL_HEIGHT - gestureState.dy;
        if (newHeight >= SHEET_MIN_HEIGHT && newHeight <= SHEET_MAX_HEIGHT) {
          sheetHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          onClose();
        } else if (gestureState.dy < -50) {
          Animated.spring(sheetHeight, {
            toValue: SHEET_MAX_HEIGHT,
            useNativeDriver: false
          }).start();
        } else {
          Animated.spring(sheetHeight, {
            toValue: SHEET_INITIAL_HEIGHT,
            useNativeDriver: false
          }).start();
        }
      }
    })
  ).current;

  if (!portfolio) return null;

  // Calculate total portfolio value
  const totalValue = portfolio.assets.reduce(
    (sum, asset) => sum + asset.price * asset.quantity,
    0
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to handle quantity editing
  const handleEditQuantity = (asset: Asset) => {
    setEditingAsset(asset);
    setEditQuantity(asset.quantity.toString());
  };

  // Function to save quantity changes
  const saveQuantityChanges = () => {
    if (editingAsset && onEditAsset) {
      const quantity = parseInt(editQuantity);
      if (!isNaN(quantity) && quantity > 0) {
        onEditAsset(editingAsset, quantity);
      }
    }
    setEditingAsset(null);
  };

  // Function to handle deletion confirmation
  const handleDeleteConfirmation = (asset: Asset) => {
    Alert.alert(
      "Delete Asset",
      `Are you sure you want to remove ${asset.symbol} from this portfolio?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => onDeleteAsset && onDeleteAsset(asset)
        }
      ]
    );
  };

  // Close all open swipeables
  const closeAllSwipeables = (except?: string) => {
    swipeableRefs.current.forEach((ref, key) => {
      if (key !== except && ref) {
        ref.close();
      }
    });
  };

  // Render right actions (buttons) for swipeable
  const renderRightActions = (asset: Asset) => {
    return (
      <View style={styles.swipeActions}>
        <RectButton
          style={[styles.swipeAction, styles.editAction]}
          onPress={() => {
            closeAllSwipeables(asset.id);
            handleEditQuantity(asset);
          }}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
          <Text style={styles.actionText}>Edit</Text>
        </RectButton>
        
        <RectButton
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => {
            closeAllSwipeables();
            handleDeleteConfirmation(asset);
          }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </RectButton>
      </View>
    );
  };

  // Render each asset item with swipeable
  const renderAssetItem = ({ item }: { item: Asset }) => {
    const assetValue = item.price * item.quantity;
    const percentOfPortfolio = (assetValue / totalValue) * 100;

    // Check if this asset is being edited
    if (editingAsset && editingAsset.id === item.id) {
      return (
        <View style={styles.editAssetContainer}>
          <View style={styles.editAssetHeader}>
            <Text style={styles.editAssetTitle}>Edit {item.symbol} Quantity</Text>
            <TouchableOpacity onPress={() => setEditingAsset(null)}>
              <MaterialCommunityIcons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.editAssetInfo}>
            <Text style={styles.editAssetSymbol}>{item.symbol}</Text>
            <Text style={styles.editAssetName}>{item.name}</Text>
            <Text style={styles.editAssetPrice}>Current Price: {formatCurrency(item.price)}</Text>
          </View>
          
          <View style={styles.editQuantityRow}>
            <Text style={styles.editQuantityLabel}>Quantity:</Text>
            <View style={styles.quantityStepper}>
              <TouchableOpacity 
                style={styles.stepperButton}
                onPress={() => {
                  const current = parseInt(editQuantity) || 0;
                  if (current > 1) {
                    setEditQuantity((current - 1).toString());
                  }
                }}
              >
                <AntDesign name="minus" size={16} color="#64748b" />
              </TouchableOpacity>
              
              <TextInput
                style={styles.editQuantityInput}
                value={editQuantity}
                onChangeText={(text) => {
                  // Only allow numeric input
                  if (/^\d*$/.test(text)) {
                    setEditQuantity(text);
                  }
                }}
                keyboardType="numeric"
                selectTextOnFocus
              />
              
              <TouchableOpacity 
                style={styles.stepperButton}
                onPress={() => {
                  const current = parseInt(editQuantity) || 0;
                  setEditQuantity((current + 1).toString());
                }}
              >
                <AntDesign name="plus" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.editValuePreview}>
            <Text style={styles.editValueLabel}>New Total Value:</Text>
            <Text style={styles.editValueAmount}>
              {formatCurrency(item.price * (parseInt(editQuantity) || 0))}
            </Text>
          </View>
          
          <View style={styles.editActions}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setEditingAsset(null)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.editButton, styles.saveButton]}
              onPress={saveQuantityChanges}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current.set(item.id, ref);
          }
        }}
        renderRightActions={() => renderRightActions(item)}
        onSwipeableOpen={() => closeAllSwipeables(item.id)}
        friction={2}
        rightThreshold={40}
      >
        <View style={styles.assetItem}>
          <View style={styles.assetHeader}>
            <View style={styles.assetSymbolContainer}>
              <View 
                style={[
                  styles.assetClassIndicator, 
                  { backgroundColor: getAssetClassColor(item.assetClass) }
                ]} 
              />
              <Text style={styles.assetSymbol}>{item.symbol}</Text>
            </View>
            <Text style={styles.assetValue}>{formatCurrency(assetValue)}</Text>
          </View>
          
          <Text style={styles.assetName}>{item.name}</Text>
          
          <View style={styles.assetDetails}>
            <View style={styles.assetDetailColumn}>
              <Text style={styles.assetDetailLabel}>Quantity</Text>
              <Text style={styles.assetDetailValue}>{item.quantity.toLocaleString()}</Text>
            </View>
            <View style={styles.assetDetailColumn}>
              <Text style={styles.assetDetailLabel}>Price</Text>
              <Text style={styles.assetDetailValue}>{formatCurrency(item.price)}</Text>
            </View>
            <View style={styles.assetDetailColumn}>
              <Text style={styles.assetDetailLabel}>Allocation</Text>
              <Text style={styles.assetDetailValue}>{percentOfPortfolio.toFixed(2)}%</Text>
            </View>
          </View>
          
          <View style={styles.assetAllocationBar}>
            <View 
              style={[
                styles.assetAllocationFill,
                { 
                  width: `${percentOfPortfolio}%`,
                  backgroundColor: getAssetClassColor(item.assetClass)
                }
              ]}
            />
          </View>
        </View>
      </Swipeable>
    );
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

  const handleAddAssetPress = () => {
    setSearchMode(true);
  };

  const handleBackFromSearch = () => {
    setSearchMode(false);
    setSelectedSecurity(null);
  };

  const handleSelectSecurity = (security: SecuritySearchResult) => {
    setSelectedSecurity(security);
  };

  const handleAddToPortfolio = async (security: SecurityDetailsType, quantity: number) => {
    if (!portfolio) return;
    
    try {
      const newAsset: Asset = {
        id: `asset-${Date.now()}-${security.symbol}`,
        symbol: security.symbol,
        name: security.name,
        quantity,
        price: security.price,
        assetClass: security.assetClass,
      };
      
      if (onAddAsset) {
        await onAddAsset(portfolio.id, newAsset);
        
        // Show success message
        Alert.alert(
          'Asset Added',
          `${quantity} shares of ${security.symbol} were added to your portfolio.`,
          [{ text: 'OK' }]
        );
        
        // Return to the portfolio view
        setSelectedSecurity(null);
        setSearchMode(false);
      }
    } catch (error) {
      console.error('Error adding asset to portfolio:', error);
      Alert.alert('Error', 'Failed to add asset to portfolio. Please try again.');
    }
  };
  
  // Render search or details screen if in search mode
  if (searchMode) {
    if (selectedSecurity) {
      return (
        <Modal
          transparent
          visible={visible}
          animationType="slide"
          onRequestClose={handleBackFromSearch}
        >
          <SecurityDetails 
            security={selectedSecurity} 
            onBack={handleBackFromSearch}
            onAddToPortfolio={handleAddToPortfolio}
          />
        </Modal>
      );
    }
    
    return (
      <Modal
        transparent
        visible={visible}
        animationType="slide"
        onRequestClose={handleBackFromSearch}
      >
        <View style={styles.modalContainer}>
          <View style={styles.searchHeader}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackFromSearch}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#334155" />
            </TouchableOpacity>
            <Text style={styles.searchTitle}>Add Asset to Portfolio</Text>
            {/* Empty view to balance the header */}
            <View style={styles.backButton} />
          </View>
          <View style={styles.searchContent}>
            <SecuritySearch onSelect={handleSelectSecurity} />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View style={[styles.backdropContent, { opacity: backdropOpacity }]} />
      </TouchableOpacity>
      <Animated.View
        style={[styles.container, { height: sheetHeight }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle} />
        
        <View style={styles.header}>
          <View>
            <Text style={styles.portfolioName}>{portfolio.name}</Text>
            <Text style={styles.portfolioDate}>
              Created {formatDate(portfolio.createdAt)} • Updated {formatDate(portfolio.updatedAt)}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>
        
        {portfolio.description && (
          <Text style={styles.portfolioDescription}>{portfolio.description}</Text>
        )}
        
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Assets</Text>
            <Text style={styles.summaryValue}>{portfolio.assets.length}</Text>
          </View>
        </View>
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Assets</Text>
          <TouchableOpacity 
            style={styles.addAssetButton}
            onPress={handleAddAssetPress}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#fff" />
            <Text style={styles.addAssetButtonText}>Add Asset</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.swipeInstructionContainer}>
          <MaterialCommunityIcons name="gesture-swipe-horizontal" size={18} color="#64748b" />
          <Text style={styles.swipeInstructionText}>Swipe left on an asset to edit or delete</Text>
        </View>
        
        <FlatList
          data={portfolio.assets}
          renderItem={renderAssetItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.assetsList}
          showsVerticalScrollIndicator={true}
          ItemSeparatorComponent={() => <View style={styles.assetSeparator} />}
          extraData={editingAsset} // Re-render when editing state changes
          removeClippedSubviews={false} // Prevents issues with swiping
          CellRendererComponent={({ children, ...props }) => (
            <View {...props}>{children}</View>
          )}
        />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropContent: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    paddingBottom: 34, // Add extra padding for iOS home indicator
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  closeButton: {
    padding: 5,
  },
  portfolioName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  portfolioDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  portfolioDescription: {
    paddingHorizontal: 20,
    fontSize: 14,
    color: '#64748b',
    marginBottom: 15,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  assetsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  assetItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  assetSymbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetClassIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  assetSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  assetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  assetName: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10,
  },
  assetDetails: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  assetDetailColumn: {
    flex: 1,
  },
  assetDetailLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  assetDetailValue: {
    fontSize: 14,
    color: '#334155',
  },
  assetAllocationBar: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  assetAllocationFill: {
    height: '100%',
  },
  swipeInstructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  swipeInstructionText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  assetSeparator: {
    height: 8,
  },
  swipeActions: {
    width: 160,
    flexDirection: 'row',
  },
  swipeAction: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAction: {
    backgroundColor: '#3b82f6',
  },
  deleteAction: {
    backgroundColor: '#ef4444',
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  editAssetContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginBottom: 10,
  },
  editAssetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  editAssetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  editAssetInfo: {
    marginBottom: 15,
  },
  editAssetSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  editAssetName: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 5,
  },
  editAssetPrice: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  editQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  editQuantityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
    width: 120,
  },
  stepperButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  editQuantityInput: {
    width: 48,
    height: 36,
    textAlign: 'center',
    fontSize: 16,
    color: '#1e293b',
    padding: 0,
    backgroundColor: '#fff',
  },
  editValuePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  editValueLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  editValueAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  addAssetButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addAssetButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 4,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContent: {
    flex: 1,
  },
  searchContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    minHeight: '100%',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  searchTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    marginRight: 40, // Balance the layout with backButton width
  },
});

export default PortfolioDetailsSheet; 
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Import components and services
import portfolioService, { Asset, Portfolio } from '../../services/portfolioService';
import SecuritySearch from '../../components/portfolio/SecuritySearch';
import SecurityDetails from '../../components/portfolio/SecurityDetails';
import { SecuritySearchResult, SecurityDetails as SecurityDetailsType } from '../../services/marketDataService';

interface PortfolioCreationProps {
  onBackToList: () => void;
}

const PortfolioCreation: React.FC<PortfolioCreationProps> = ({ onBackToList }) => {
  // States for the portfolio creation process
  const [step, setStep] = useState<'details' | 'securities' | 'review'>('details');
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [selectedSecurities, setSelectedSecurities] = useState<Asset[]>([]);
  const [selectedSecurity, setSelectedSecurity] = useState<SecuritySearchResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Portfolio validation
  const isPortfolioValid = () => {
    return portfolioName.trim().length > 0;
  };

  // Assets validation
  const hasAssets = () => {
    return selectedSecurities.length > 0;
  };

  // Calculate total portfolio value
  const calculateTotalValue = () => {
    return selectedSecurities.reduce((sum, asset) => sum + (asset.price * asset.quantity), 0);
  };

  // Handle adding a security to the portfolio
  const handleAddSecurity = (security: SecurityDetailsType, quantity: number) => {
    const newAsset: Asset = {
      id: `temp-${Date.now()}-${security.symbol}`,  // Will be replaced with a real ID when saved
      symbol: security.symbol,
      name: security.name,
      quantity,
      price: security.price,
      assetClass: security.assetClass,
    };

    // Check if asset already exists in portfolio
    const existingIndex = selectedSecurities.findIndex(asset => asset.symbol === security.symbol);
    
    if (existingIndex >= 0) {
      // Update existing asset
      const updatedAssets = [...selectedSecurities];
      updatedAssets[existingIndex] = {
        ...updatedAssets[existingIndex],
        quantity: updatedAssets[existingIndex].quantity + quantity,
      };
      setSelectedSecurities(updatedAssets);
    } else {
      // Add new asset
      setSelectedSecurities([...selectedSecurities, newAsset]);
    }

    // Go back to securities list
    setSelectedSecurity(null);
    
    // Show confirmation toast
    Alert.alert(
      'Added to Portfolio',
      `${quantity} shares of ${security.symbol} added to your portfolio.`,
      [{ text: 'OK' }]
    );
  };

  // Handle removing a security from the portfolio
  const handleRemoveSecurity = (assetId: string) => {
    Alert.alert(
      'Remove Security',
      'Are you sure you want to remove this security from your portfolio?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setSelectedSecurities(selectedSecurities.filter(asset => asset.id !== assetId));
          },
        },
      ]
    );
  };

  // Handle editing a security in the portfolio
  const handleEditSecurity = (assetId: string) => {
    const asset = selectedSecurities.find(asset => asset.id === assetId);
    if (!asset) return;

    Alert.prompt(
      'Edit Quantity',
      `Enter new quantity for ${asset.symbol}:`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Update',
          onPress: (value) => {
            const newQuantity = parseFloat(value || '0');
            if (isNaN(newQuantity) || newQuantity <= 0) {
              Alert.alert('Invalid Quantity', 'Please enter a valid number greater than 0.');
              return;
            }

            const updatedAssets = selectedSecurities.map(a => 
              a.id === assetId ? { ...a, quantity: newQuantity } : a
            );
            setSelectedSecurities(updatedAssets);
          },
        },
      ],
      'plain-text',
      asset.quantity.toString()
    );
  };

  // Handle creating the portfolio
  const handleCreatePortfolio = async () => {
    if (!isPortfolioValid() || !hasAssets()) {
      Alert.alert('Invalid Portfolio', 'Please provide a name and add at least one security.');
      return;
    }

    setIsCreating(true);
    try {
      // Create the portfolio object
      const newPortfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'> = {
        name: portfolioName,
        description: portfolioDescription,
        assets: selectedSecurities.map((asset, index) => ({
          ...asset,
          id: `new-${index}-${asset.symbol}`  // This will be replaced with real IDs
        })),
      };

      // Save the portfolio
      await portfolioService.createPortfolio(newPortfolio);
      Alert.alert(
        'Success',
        'Portfolio created successfully!',
        [{ text: 'OK', onPress: onBackToList }]
      );
    } catch (error) {
      console.error('Error creating portfolio:', error);
      Alert.alert(
        'Error',
        'Failed to create portfolio. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Render the portfolio details form
  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Portfolio Details</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Portfolio Name*</Text>
        <TextInput
          style={styles.input}
          value={portfolioName}
          onChangeText={setPortfolioName}
          placeholder="Enter portfolio name"
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={portfolioDescription}
          onChangeText={setPortfolioDescription}
          placeholder="Enter portfolio description"
          multiline
          numberOfLines={4}
        />
      </View>
      
      <TouchableOpacity
        style={[styles.nextButton, !isPortfolioValid() && styles.disabledButton]}
        disabled={!isPortfolioValid()}
        onPress={() => setStep('securities')}
      >
        <Text style={styles.nextButtonText}>Next</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Render the securities selection step
  const renderSecuritiesStep = () => {
    // If a specific security is selected, show its details
    if (selectedSecurity) {
      return (
        <SecurityDetails
          security={selectedSecurity}
          onBack={() => {
            console.log('Back button pressed, clearing selectedSecurity');
            setSelectedSecurity(null);
          }}
          onAddToPortfolio={handleAddSecurity}
        />
      );
    }

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Add Securities</Text>
        
        {/* Selected securities list */}
        {selectedSecurities.length > 0 && (
          <View style={styles.selectedSecuritiesContainer}>
            <Text style={styles.sectionTitle}>Selected Securities</Text>
            <FlatList
              data={selectedSecurities}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.selectedSecurityItem}>
                  <View style={styles.securityInfo}>
                    <Text style={styles.securitySymbol}>{item.symbol}</Text>
                    <Text style={styles.securityName}>{item.name}</Text>
                    <Text style={styles.securityDetails}>
                      {item.quantity} shares × ${item.price.toFixed(2)} = ${(item.quantity * item.price).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.securityActions}>
                    <TouchableOpacity
                      style={styles.securityAction}
                      onPress={() => handleEditSecurity(item.id)}
                    >
                      <Ionicons name="pencil" size={18} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.securityAction}
                      onPress={() => handleRemoveSecurity(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              style={styles.selectedSecuritiesList}
            />
          </View>
        )}
        
        {/* Security search */}
        <View style={styles.searchContainer}>
          <Text style={styles.sectionTitle}>Search Securities</Text>
          <SecuritySearch
            onSelect={(security) => setSelectedSecurity(security)}
          />
        </View>
        
        {/* Navigation buttons */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('details')}
          >
            <Ionicons name="arrow-back" size={20} color="#64748b" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.nextButton, !hasAssets() && styles.disabledButton]}
            disabled={!hasAssets()}
            onPress={() => setStep('review')}
          >
            <Text style={styles.nextButtonText}>Review</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render the portfolio review step
  const renderReviewStep = () => {
    const totalValue = calculateTotalValue();
    
    // Calculate asset allocation
    const allocation: Record<string, number> = {};
    selectedSecurities.forEach(asset => {
      const assetValue = asset.price * asset.quantity;
      const assetClass = asset.assetClass;
      
      if (!allocation[assetClass]) {
        allocation[assetClass] = 0;
      }
      
      allocation[assetClass] += assetValue / totalValue;
    });
    
    // Get allocation entries for the chart
    const allocationEntries = Object.entries(allocation);
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Review Portfolio</Text>
        
        <View style={styles.reviewCard}>
          <Text style={styles.portfolioNameReview}>{portfolioName}</Text>
          
          {portfolioDescription && (
            <Text style={styles.portfolioDescriptionReview}>{portfolioDescription}</Text>
          )}
          
          <View style={styles.totalValueContainer}>
            <Text style={styles.totalValueLabel}>Total Value:</Text>
            <Text style={styles.totalValueAmount}>${totalValue.toFixed(2)}</Text>
          </View>
          
          {/* Asset Allocation Chart */}
          <View style={styles.allocationContainer}>
            <Text style={styles.allocationTitle}>Asset Allocation</Text>
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
            
            <View style={styles.allocationLegend}>
              {allocationEntries.map(([key, value], index) => (
                <View key={key} style={styles.legendItem}>
                  <View 
                    style={[
                      styles.legendColor,
                      { backgroundColor: COLORS[index % COLORS.length] }
                    ]} 
                  />
                  <Text style={styles.legendText}>
                    {key.charAt(0).toUpperCase() + key.slice(1)} ({(value * 100).toFixed(2)}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
          
          {/* Asset List */}
          <Text style={styles.assetsTitle}>Assets</Text>
          <FlatList
            data={selectedSecurities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.assetItem}>
                <View style={styles.assetHeader}>
                  <Text style={styles.assetSymbol}>{item.symbol}</Text>
                  <Text style={styles.assetValue}>${(item.price * item.quantity).toFixed(2)}</Text>
                </View>
                <Text style={styles.assetName}>{item.name}</Text>
                <Text style={styles.assetDetails}>
                  {item.quantity} shares at ${item.price.toFixed(2)}
                </Text>
              </View>
            )}
            style={styles.assetsList}
            scrollEnabled={false}
          />
        </View>
        
        {/* Navigation buttons */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('securities')}
          >
            <Ionicons name="arrow-back" size={20} color="#64748b" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.createButton, isCreating && styles.disabledButton]}
            disabled={isCreating}
            onPress={handleCreatePortfolio}
          >
            {isCreating ? (
              <Text style={styles.createButtonText}>Creating...</Text>
            ) : (
              <>
                <Text style={styles.createButtonText}>Create Portfolio</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBackToList}
        >
          <Ionicons name="arrow-back" size={24} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Portfolio</Text>
      </View>
      
      <View style={styles.stepsIndicator}>
        <View style={[styles.stepIndicator, step === 'details' && styles.activeStep]}>
          <Text style={[styles.stepNumber, step === 'details' && styles.activeStepNumber]}>1</Text>
          <Text style={[styles.stepText, step === 'details' && styles.activeStepText]}>Details</Text>
        </View>
        <View style={styles.stepDivider} />
        <View style={[styles.stepIndicator, step === 'securities' && styles.activeStep]}>
          <Text style={[styles.stepNumber, step === 'securities' && styles.activeStepNumber]}>2</Text>
          <Text style={[styles.stepText, step === 'securities' && styles.activeStepText]}>Securities</Text>
        </View>
        <View style={styles.stepDivider} />
        <View style={[styles.stepIndicator, step === 'review' && styles.activeStep]}>
          <Text style={[styles.stepNumber, step === 'review' && styles.activeStepNumber]}>3</Text>
          <Text style={[styles.stepText, step === 'review' && styles.activeStepText]}>Review</Text>
        </View>
      </View>
      
      <ScrollView style={styles.contentContainer}>
        {step === 'details' && renderDetailsStep()}
        {step === 'securities' && renderSecuritiesStep()}
        {step === 'review' && renderReviewStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Array of colors for the allocation chart
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  stepsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  stepIndicator: {
    alignItems: 'center',
  },
  activeStep: {
    // Active step styles
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  activeStepNumber: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  stepText: {
    fontSize: 12,
    color: '#64748b',
  },
  activeStepText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  stepDivider: {
    height: 1,
    width: 40,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  contentContainer: {
    flex: 1,
  },
  stepContainer: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#334155',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  backButtonText: {
    color: '#64748b',
    fontSize: 16,
    marginLeft: 8,
  },
  selectedSecuritiesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  selectedSecuritiesList: {
    maxHeight: 200,
  },
  selectedSecurityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  securityInfo: {
    flex: 1,
  },
  securitySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  securityName: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  securityDetails: {
    fontSize: 12,
    color: '#94a3b8',
  },
  securityActions: {
    flexDirection: 'row',
  },
  securityAction: {
    padding: 8,
    marginLeft: 8,
  },
  searchContainer: {
    flex: 1,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  createButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  portfolioNameReview: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  portfolioDescriptionReview: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  totalValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 16,
  },
  totalValueLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  totalValueAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
  },
  allocationContainer: {
    marginBottom: 24,
  },
  allocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  allocationChart: {
    height: 24,
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  allocationItem: {
    height: '100%',
  },
  allocationLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  assetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  assetsList: {
    marginBottom: 8,
  },
  assetItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assetSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  assetValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  assetName: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  assetDetails: {
    fontSize: 12,
    color: '#94a3b8',
  },
});

export default PortfolioCreation; 
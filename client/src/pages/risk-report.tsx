import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import portfolioService, { PortfolioSummary, Portfolio } from '../services/portfolioService';
import PortfolioDropdown from '../components/ui/PortfolioDropdown';
import Slider from '@react-native-community/slider';

// Set this to false to use the actual Python-based calculation server
// Set to true for development/testing without the server
const USE_MOCK_DATA = false;

// Update with your actual server IP address and port
// Using localhost for development - change to your machine's IP for mobile access
import API_BASE from '../config/api';
const API_URL = API_BASE;

interface VarParams {
  confidenceLevel: string;
  timeHorizon: string;
  numSimulations: string;
  varMethod: 'parametric' | 'historical' | 'monte-carlo' | 'monte-carlo-t';
}

interface VarResults {
  portfolioValue: number;
  currentValue: number;
  var: number;
  varPercentage: number;
  cvar: number;
  cvarPercentage: number;
  contributionByAsset?: {
    symbol: string;
    name: string;
    contribution: number;
    percentage: number;
  }[];
}

export default function RiskReport() {
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [params, setParams] = useState<VarParams>({
    confidenceLevel: '0.95',
    timeHorizon: '1',
    numSimulations: '10000',
    varMethod: 'monte-carlo',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<VarResults | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [usedMockData, setUsedMockData] = useState(false);

  // Fetch portfolios on component mount
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const portfolioSummaries = await portfolioService.getPortfolioSummaries();
        setPortfolios(portfolioSummaries);
        
        // Select the first portfolio by default if available
        if (portfolioSummaries.length > 0 && !selectedPortfolioId) {
          setSelectedPortfolioId(portfolioSummaries[0].id);
        }
      } catch (error) {
        console.error('Error fetching portfolios:', error);
        Alert.alert('Error', 'Failed to load portfolios');
      }
    };
    
    fetchPortfolios();
  }, []);
  
  // Fetch selected portfolio details when ID changes
  useEffect(() => {
    const fetchPortfolioDetails = async () => {
      if (!selectedPortfolioId) return;
      
      try {
        const portfolio = await portfolioService.getPortfolioById(selectedPortfolioId);
        setSelectedPortfolio(portfolio);
      } catch (error) {
        console.error('Error fetching portfolio details:', error);
        setSelectedPortfolio(null);
      }
    };
    
    fetchPortfolioDetails();
  }, [selectedPortfolioId]);

  const handleParamChange = (name: keyof VarParams, value: string | 'parametric' | 'historical' | 'monte-carlo' | 'monte-carlo-t') => {
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const validateParams = (): boolean => {
    // Make sure all values are valid numbers
    for (const [key, value] of Object.entries(params)) {
      if (key === 'varMethod') continue; // Skip non-numeric field
      
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        Alert.alert('Invalid input', `${key} must be a valid number`);
        return false;
      }
      
      // Check specific ranges
      if (key === 'confidenceLevel' && (numValue <= 0 || numValue >= 1)) {
        Alert.alert('Invalid input', 'Confidence level must be between 0 and 1');
        return false;
      }
      
      if (key !== 'confidenceLevel' && numValue <= 0) {
        Alert.alert('Invalid input', `${key} must be greater than 0`);
        return false;
      }
    }
    
    if (!selectedPortfolio) {
      Alert.alert('No Portfolio Selected', 'Please select a portfolio to analyze');
      return false;
    }
    
    return true;
  };

  // Generate mock results based on current parameters and selected portfolio
  const generateMockResults = (): { results: VarResults, imageUrl: string } => {
    console.log('Generating mock results for development');
    
    if (!selectedPortfolio) {
      throw new Error('No portfolio selected');
    }
    
    // Calculate portfolio value
    const portfolioValue = selectedPortfolio.assets.reduce(
      (sum, asset) => sum + asset.price * asset.quantity, 
      0
    );
    
    // Generate a more realistic VaR based on the portfolio composition
    const confidenceLevel = parseFloat(params.confidenceLevel);
    const timeHorizon = parseFloat(params.timeHorizon);
    
    // Base VaR percentage depends on confidence level and method
    let baseVarPct = 0;
    if (confidenceLevel <= 0.9) baseVarPct = 1.2;
    else if (confidenceLevel <= 0.95) baseVarPct = 1.65;
    else if (confidenceLevel <= 0.99) baseVarPct = 2.33;
    else baseVarPct = 3.0;
    
    // Adjust for time horizon (roughly square root of time rule)
    baseVarPct = baseVarPct * Math.sqrt(timeHorizon);
    
    // Add some variance by method
    let methodMultiplier = 1.0;
    switch (params.varMethod) {
      case 'parametric':
        methodMultiplier = 0.9;
        break;
      case 'historical':
        methodMultiplier = 1.05;
        break;
      case 'monte-carlo':
        methodMultiplier = 1.0;
        break;
      case 'monte-carlo-t':
        methodMultiplier = 1.15; // t-distribution has fatter tails
        break;
      default:
        methodMultiplier = 1.0;
    }
    
    // Final VaR percentage with some randomness
    const varPercentage = baseVarPct * methodMultiplier + (Math.random() * 0.3);
    const cvarPercentage = varPercentage * 1.3; // CVaR is typically higher than VaR
    
    // Calculate contributions by asset based on their weight and volatility
    // In a real implementation, this would use correlations between assets
    const contributionByAsset = selectedPortfolio.assets.map(asset => {
      const assetValue = asset.price * asset.quantity;
      const weight = assetValue / portfolioValue;
      
      // Different asset classes have different risk factors
      let assetRiskFactor = 1.0;
      switch (asset.assetClass) {
        case 'equity':
          assetRiskFactor = 1.2;
          break;
        case 'bond':
          assetRiskFactor = 0.7;
          break;
        case 'cash':
          assetRiskFactor = 0.1;
          break;
        case 'commodity':
          assetRiskFactor = 1.3;
          break;
        case 'alternative':
          assetRiskFactor = 1.5;
          break;
        case 'real_estate':
          assetRiskFactor = 1.0;
          break;
        default:
          assetRiskFactor = 1.0;
      }
      
      // Calculate contribution
      const contribution = portfolioValue * varPercentage/100 * weight * assetRiskFactor;
      
      return {
        symbol: asset.symbol,
        name: asset.name,
        contribution,
        percentage: (contribution / (portfolioValue * varPercentage/100)) * 100
      };
    });
    
    // Sort by contribution (highest first)
    contributionByAsset.sort((a, b) => b.contribution - a.contribution);
    
    return {
      results: {
        portfolioValue,
        currentValue: portfolioValue / (selectedPortfolio.assets.reduce((sum, asset) => sum + asset.quantity, 0) || 1),
        var: portfolioValue * (varPercentage / 100),
        varPercentage,
        cvar: portfolioValue * (cvarPercentage / 100),
        cvarPercentage,
        contributionByAsset
      },
      imageUrl: params.varMethod === 'monte-carlo-t' 
        ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/MonteCarloValueAtRisk.svg/640px-MonteCarloValueAtRisk.svg.png'
        : 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/VaR_diagram.svg/640px-VaR_diagram.svg.png'
    };
  };

  const runVarAnalysis = async () => {
    if (!validateParams()) return;

    setIsLoading(true);
    setResults(null);
    setResultImage(null);
    setUsedMockData(false);

    try {
      console.log('Running VaR analysis with params:', params);
      console.log('Selected portfolio:', selectedPortfolio);
      
      // Skip API call and use mock data if USE_MOCK_DATA is true
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
        const { results, imageUrl } = generateMockResults();
        setResults(results);
        setResultImage(imageUrl);
        setUsedMockData(true);
        return;
      }
      
      // In a real implementation, we would send the portfolio data and params to the server
      const requestData = {
        params,
        portfolio: selectedPortfolio
      };
      
      // Make API call to our Express server with a timeout
      const response = await axios.post(`${API_URL}/api/run-var`, requestData, {
        timeout: 45000, // 45 second timeout (should be enough for Python computation)
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.data.success) {
        setResults(response.data.results);
        // The chartUrl will be a path relative to the server
        setResultImage(`${API_URL}${response.data.chartUrl}`);
      } else {
        throw new Error(response.data.error || 'Failed to run VaR analysis');
      }
    } catch (error: any) {
      console.error('Error running VaR analysis:', error);
      
      // Check for network errors specifically
      const isNetworkError = error?.message === 'Network Error' || 
                            (error?.code && error.code === 'ECONNABORTED') ||
                            !navigator.onLine;
      
      let errorMessage = 'Could not connect to the calculation server.';
      if (!isNetworkError && error?.response) {
        errorMessage = `Server error: ${error.response?.data?.error || error.message}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Fall back to mock data if possible
      if (selectedPortfolio) {
        try {
          const { results, imageUrl } = generateMockResults();
          setResults(results);
          setResultImage(imageUrl);
          setUsedMockData(true);
          
          // Show an informational alert that we're using mock data
          Alert.alert(
            'Using Simulated Data',
            `${errorMessage} Showing simulated results instead.`,
            [{ text: 'OK' }]
          );
        } catch (mockError) {
          Alert.alert('Error', errorMessage);
        }
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderMethodSelector = () => (
    <View style={styles.methodSelector}>
      <Text style={styles.paramLabel}>VaR Method</Text>
      <View style={styles.methodButtons}>
        {['parametric', 'historical', 'monte-carlo', 'monte-carlo-t'].map((method) => (
          <TouchableOpacity
            key={method}
            style={[
              styles.methodButton,
              params.varMethod === method && styles.methodButtonActive
            ]}
            onPress={() => handleParamChange('varMethod', method as any)}
          >
            <Text 
              style={[
                styles.methodButtonText,
                params.varMethod === method && styles.methodButtonTextActive
              ]}
            >
              {method === 'parametric' ? 'Parametric' : 
               method === 'historical' ? 'Historical' :
               method === 'monte-carlo' ? 'Monte Carlo' : 'MC t-dist'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Portfolio Risk Report</Text>
        {usedMockData && (
          <Text style={styles.mockDataIndicator}>Simulated Data Mode</Text>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Select Portfolio</Text>
          <PortfolioDropdown 
            portfolios={portfolios}
            selectedPortfolioId={selectedPortfolioId}
            onSelectPortfolio={setSelectedPortfolioId}
          />
        </View>
        
        {selectedPortfolio && (
          <View style={styles.portfolioSummary}>
            <Text style={styles.portfolioName}>{selectedPortfolio.name}</Text>
            <Text style={styles.portfolioDescription}>{selectedPortfolio.description || 'No description'}</Text>
            <Text style={styles.portfolioValue}>
              Portfolio Value: ${selectedPortfolio.assets.reduce(
                (sum, asset) => sum + asset.price * asset.quantity, 
                0
              ).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.assetCount}>
              {selectedPortfolio.assets.length} assets in portfolio
            </Text>
          </View>
        )}
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Risk Parameters</Text>
          
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>Confidence Level: {parseFloat(params.confidenceLevel) * 100}%</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.8}
              maximumValue={0.99}
              step={0.01}
              value={parseFloat(params.confidenceLevel)}
              onValueChange={(value) => handleParamChange('confidenceLevel', value.toString())}
              minimumTrackTintColor="#3897F0"
              maximumTrackTintColor="#cbd5e1"
              thumbTintColor="#3897F0"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>80%</Text>
              <Text style={styles.sliderLabel}>99%</Text>
            </View>
          </View>
          
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>Time Horizon: {params.timeHorizon} day(s)</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={parseFloat(params.timeHorizon)}
              onValueChange={(value) => handleParamChange('timeHorizon', value.toString())}
              minimumTrackTintColor="#3897F0"
              maximumTrackTintColor="#cbd5e1"
              thumbTintColor="#3897F0"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1 day</Text>
              <Text style={styles.sliderLabel}>10 days</Text>
            </View>
          </View>
          
          <View style={styles.paramContainer}>
            <Text style={styles.paramLabel}>Number of Simulations</Text>
            <TextInput
              style={styles.input}
              value={params.numSimulations}
              onChangeText={(value) => handleParamChange('numSimulations', value)}
              keyboardType="number-pad"
              placeholder="10000"
            />
          </View>
          
          {renderMethodSelector()}
          
          <TouchableOpacity
            style={styles.runButton}
            onPress={runVarAnalysis}
            disabled={isLoading || !selectedPortfolio}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="analytics-outline" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>
                  Run Risk Analysis
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {results && (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>Risk Analysis Results</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Portfolio Value:</Text>
              <Text style={styles.resultValue}>${results.portfolioValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{params.timeHorizon}-Day VaR ({parseFloat(params.confidenceLevel) * 100}% confidence):</Text>
              <Text style={styles.resultValue}>${results.var.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>VaR as percentage of portfolio:</Text>
              <Text style={styles.resultValue}>{results.varPercentage.toFixed(2)}%</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Conditional VaR (Expected Shortfall):</Text>
              <Text style={styles.resultValue}>${results.cvar.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>CVaR as percentage of portfolio:</Text>
              <Text style={styles.resultValue}>{results.cvarPercentage.toFixed(2)}%</Text>
            </View>
            
            {resultImage && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Distribution of Portfolio Losses</Text>
                <Image 
                  source={{ uri: resultImage }} 
                  style={styles.chart}
                  resizeMode="contain"
                />
              </View>
            )}
            
            {results.contributionByAsset && results.contributionByAsset.length > 0 && (
              <View style={styles.contributionContainer}>
                <Text style={styles.chartTitle}>Risk Contribution by Asset</Text>
                {results.contributionByAsset.map((asset, index) => (
                  <View key={asset.symbol} style={styles.contributionRow}>
                    <View style={styles.contributionInfo}>
                      <Text style={styles.contributionSymbol}>{asset.symbol}</Text>
                      <Text style={styles.contributionName}>{asset.name}</Text>
                    </View>
                    <View style={styles.contributionValues}>
                      <Text style={styles.contributionValue}>
                        ${asset.contribution.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.contributionPercentage}>
                        {asset.percentage.toFixed(2)}%
                      </Text>
                    </View>
                    <View style={styles.contributionBarContainer}>
                      <View 
                        style={[
                          styles.contributionBar, 
                          { width: `${Math.min(asset.percentage, 100)}%` }
                        ]} 
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  mockDataIndicator: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#334155',
  },
  portfolioSummary: {
    marginBottom: 24,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  portfolioName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 4,
  },
  portfolioDescription: {
    fontSize: 14,
    color: '#0e7490',
    marginBottom: 12,
  },
  portfolioValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0c4a6e',
    marginBottom: 4,
  },
  assetCount: {
    fontSize: 14,
    color: '#0e7490',
  },
  paramContainer: {
    marginBottom: 16,
  },
  paramLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#475569',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  methodSelector: {
    marginBottom: 16,
  },
  methodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  methodButton: {
    flex: 1,
    minWidth: '45%',
    margin: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  methodButtonText: {
    fontSize: 14,
    color: '#64748b',
  },
  methodButtonTextActive: {
    color: '#1e40af',
    fontWeight: '500',
  },
  runButton: {
    backgroundColor: '#3897F0',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultLabel: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'right',
  },
  chartContainer: {
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#334155',
    alignSelf: 'flex-start',
  },
  chart: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  contributionContainer: {
    marginTop: 8,
  },
  contributionRow: {
    marginBottom: 12,
  },
  contributionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contributionSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginRight: 8,
  },
  contributionName: {
    fontSize: 14,
    color: '#64748b',
  },
  contributionValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  contributionValue: {
    fontSize: 13,
    color: '#334155',
  },
  contributionPercentage: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  contributionBarContainer: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  contributionBar: {
    height: '100%',
    backgroundColor: '#3897F0',
    borderRadius: 3,
  },
}); 
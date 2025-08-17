import React, { useState } from 'react';
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
  contractSize: string;
  numContracts: string;
}

interface VarResults {
  currentValue: number;
  portfolioValue: number;
  var: number;
  varPercentage: number;
}

export default function VarAnalysis() {
  const [params, setParams] = useState<VarParams>({
    confidenceLevel: '0.95',
    timeHorizon: '1',
    numSimulations: '50000',
    contractSize: '50',
    numContracts: '10'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<VarResults | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [usedMockData, setUsedMockData] = useState(false);

  const handleParamChange = (name: keyof VarParams, value: string) => {
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const validateParams = (): boolean => {
    // Make sure all values are valid numbers
    for (const [key, value] of Object.entries(params)) {
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
    return true;
  };

  // Generate mock results based on current parameters
  const generateMockResults = (): { results: VarResults, imageUrl: string } => {
    console.log('Generating mock results for development');
    const currentValue = 5128.14;
    const portfolioValue = parseFloat(params.numContracts) * parseFloat(params.contractSize) * currentValue;
    const varPercentage = 1.9 + (Math.random() * 0.5);
    
    return {
      results: {
        currentValue,
        portfolioValue,
        var: portfolioValue * (varPercentage / 100),
        varPercentage
      },
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/MonteCarloValueAtRisk.svg/640px-MonteCarloValueAtRisk.svg.png'
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
      
      // Skip API call and use mock data if USE_MOCK_DATA is true
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { results, imageUrl } = generateMockResults();
        setResults(results);
        setResultImage(imageUrl);
        setUsedMockData(true);
        return;
      }
      
      // Make API call to our Express server with a timeout
      const response = await axios.post(`${API_URL}/api/run-var`, params, {
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
      }
      
      // Fall back to mock data
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Monte Carlo VaR Analysis</Text>
        {usedMockData && (
          <Text style={styles.mockDataIndicator}>Simulated Data Mode</Text>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Parameters</Text>
        
        <View style={styles.paramContainer}>
          <Text style={styles.paramLabel}>Confidence Level (0-1)</Text>
          <TextInput
            style={styles.input}
            value={params.confidenceLevel}
            onChangeText={(value) => handleParamChange('confidenceLevel', value)}
            keyboardType="decimal-pad"
            placeholder="0.95"
          />
        </View>
        
        <View style={styles.paramContainer}>
          <Text style={styles.paramLabel}>Time Horizon (days)</Text>
          <TextInput
            style={styles.input}
            value={params.timeHorizon}
            onChangeText={(value) => handleParamChange('timeHorizon', value)}
            keyboardType="number-pad"
            placeholder="1"
          />
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
        
        <View style={styles.paramContainer}>
          <Text style={styles.paramLabel}>Contract Size ($)</Text>
          <TextInput
            style={styles.input}
            value={params.contractSize}
            onChangeText={(value) => handleParamChange('contractSize', value)}
            keyboardType="number-pad"
            placeholder="50"
          />
        </View>
        
        <View style={styles.paramContainer}>
          <Text style={styles.paramLabel}>Number of Contracts</Text>
          <TextInput
            style={styles.input}
            value={params.numContracts}
            onChangeText={(value) => handleParamChange('numContracts', value)}
            keyboardType="number-pad"
            placeholder="10"
          />
        </View>
        
        <TouchableOpacity
          style={styles.runButton}
          onPress={runVarAnalysis}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="analytics-outline" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>
                {USE_MOCK_DATA ? 'Run Simulated Analysis' : 'Run Python Analysis'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {results && (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>Results</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Current S&P 500 Value:</Text>
              <Text style={styles.resultValue}>${results.currentValue.toFixed(2)}</Text>
            </View>
            
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#334155',
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
  runButton: {
    backgroundColor: '#3897F0',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 24,
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
    borderRadius: 8,
    padding: 16,
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
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#334155',
  },
  chart: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
}); 
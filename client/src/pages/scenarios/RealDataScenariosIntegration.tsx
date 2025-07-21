import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import services
import realScenarioService, { HISTORICAL_EVENTS } from '../../services/realScenarioService';
import portfolioService from '../../services/portfolioService';
import scenarioService from '../../services/scenarioService';

/**
 * Component to run real-data historical scenarios
 */
const RealDataScenarios: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  // Handler to run a historical event scenario
  const handleRunHistoricalEvent = async (eventId: string) => {
    try {
      setLoading(true);
      
      // Get event data
      const event = HISTORICAL_EVENTS.find(e => e.id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      
      // Show portfolio selector
      const portfolios = await portfolioService.getPortfolios();
      
      if (portfolios.length === 0) {
        Alert.alert('No Portfolios', 'Please create a portfolio first before running a scenario.');
        setLoading(false);
        return;
      }
      
      // For demonstration, we'll use the first portfolio
      // In a real app, you would show a portfolio selection UI
      const selectedPortfolio = portfolios[0];
      
      // Run the historical scenario with real data
      const scenarioResult = await realScenarioService.runHistoricalScenario(
        selectedPortfolio,
        event.startDate,
        event.endDate,
        `Historical: ${event.name}`
      );
      
      // The scenario result is automatically saved by the service layer
      
      // Navigate to the result detail screen
      // @ts-ignore (navigation parameter may vary based on your navigation setup)
      navigation.navigate('ScenarioRunDetail', { runId: scenarioResult.id });
      
      Alert.alert(
        'Historical Scenario Complete',
        `Successfully ran "${event.name}" scenario.\nPortfolio Impact: ${scenarioResult.impact.toFixed(2)}%`
      );
    } catch (error) {
      console.error('Error running historical scenario:', error);
      Alert.alert('Error', 'Failed to run historical scenario. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handler to run a real-time stress test
  const handleRunStressTest = async () => {
    try {
      setLoading(true);
      
      // Get portfolios
      const portfolios = await portfolioService.getPortfolios();
      
      if (portfolios.length === 0) {
        Alert.alert('No Portfolios', 'Please create a portfolio first before running a stress test.');
        setLoading(false);
        return;
      }
      
      // For demonstration, use the first portfolio
      const selectedPortfolio = portfolios[0];
      
      // Define sample stress factors
      const stressFactors = {
        equity: -15,     // 15% drop in equity markets
        rates: 100,      // 100 bps increase in interest rates
        credit: 150,     // 150 bps widening of credit spreads
        fx: -5,          // 5% depreciation in domestic currency
        commodity: -10   // 10% drop in commodity prices
      };
      
      // Run the stress test with real-time data
      const stressTestResult = await realScenarioService.simulateRealTimeStressTest(
        selectedPortfolio,
        stressFactors
      );
      
      // Format the results
      const impactPercentage = ((stressTestResult.stressedValue - stressTestResult.originalValue) / 
                              stressTestResult.originalValue * 100).toFixed(2);
      
      // Format asset class impacts
      const impactsByClass = Object.entries(stressTestResult.assetClassImpacts)
        .map(([assetClass, impact]) => `${assetClass}: ${impact.toFixed(2)}%`)
        .join('\n');
      
      // Show results
      Alert.alert(
        'Stress Test Results',
        `Portfolio Value: $${stressTestResult.originalValue.toLocaleString()}\n` +
        `Stressed Value: $${stressTestResult.stressedValue.toLocaleString()}\n` +
        `Overall Impact: ${impactPercentage}%\n\n` +
        `Impacts by Asset Class:\n${impactsByClass}`
      );
    } catch (error) {
      console.error('Error running stress test:', error);
      Alert.alert('Error', 'Failed to run stress test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Display historical events and options
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Real-Data Historical Scenarios</Text>
      <Text style={styles.description}>
        Run scenarios based on actual historical market data from Tiingo
      </Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loading} />
      ) : (
        <>
          {HISTORICAL_EVENTS.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventCard}
              onPress={() => handleRunHistoricalEvent(event.id)}
            >
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>{event.name}</Text>
                <Text style={styles.eventDate}>
                  {event.startDate === event.endDate 
                    ? event.startDate
                    : `${event.startDate} to ${event.endDate}`
                  }
                </Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={24} color="#3b82f6" />
            </TouchableOpacity>
          ))}
          
          <Text style={styles.sectionTitle}>Real-Time Stress Test</Text>
          <Text style={styles.description}>
            Test your portfolio with real-time market data under stress conditions
          </Text>
          
          <TouchableOpacity 
            style={styles.stressTestButton}
            onPress={handleRunStressTest}
          >
            <MaterialCommunityIcons name="flask" size={24} color="#fff" />
            <Text style={styles.stressTestButtonText}>Run Stress Test</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 16,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  eventCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#64748b',
  },
  stressTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    marginTop: 8,
  },
  stressTestButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 8,
  },
  loading: {
    marginTop: 32,
  },
});

export default RealDataScenarios; 
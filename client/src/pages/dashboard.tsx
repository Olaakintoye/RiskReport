import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { getAllPortfolios } from '../services/portfolioService';
import { calculatePortfolioRisk, getRiskBreakdown } from '../services/riskService';
import { getRecentScenarios } from '../services/scenarioService';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/use-auth';

// Define types
interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
}

interface RiskMetric {
  name: string;
  value: number;
  limit: number;
  unit: string;
}

interface ScenarioResult {
  id: string;
  name: string;
  portfolioName: string;
  impactValue: number;
  runDate: string;
}

export default function UnifiedDashboard() {
  // Auth context
  const { user } = useAuth();
  
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [topRisks, setTopRisks] = useState<RiskMetric[]>([]);
  const [recentScenarios, setRecentScenarios] = useState<ScenarioResult[]>([]);
  const [riskBudgetUsage, setRiskBudgetUsage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');
  const navigation = useNavigation();

  const loadDashboardData = async () => {
    try {
      // Load portfolio data
      const portfolioData = await getAllPortfolios();
      setPortfolios(portfolioData.slice(0, 3)); // Top 3 portfolios
      
      // Calculate aggregated risk metrics
      let totalRisk = 0;
      let totalLimit = 0;
      
      const riskMetrics: RiskMetric[] = [];
      
      for (const portfolio of portfolioData) {
        const riskData = await calculatePortfolioRisk(portfolio.id);
  
        // Add key metrics to the list
        if (riskData.var) {
          riskMetrics.push({
            name: `VaR (${portfolio.name})`,
            value: riskData.var,
            limit: riskData.varLimit || riskData.var * 1.5,
            unit: '%'
          });
          
          totalRisk += riskData.var;
          totalLimit += riskData.varLimit || riskData.var * 1.5;
        }
      }
      
      // Calculate risk budget usage
      setRiskBudgetUsage(totalRisk / totalLimit);
      
      // Sort risk metrics by usage percentage
      riskMetrics.sort((a, b) => (b.value / b.limit) - (a.value / a.limit));
      setTopRisks(riskMetrics.slice(0, 5)); // Top 5 risk metrics
      
      // Get recent scenarios
      const scenarioResults = await getRecentScenarios();
      setRecentScenarios(scenarioResults.slice(0, 3)); // Top 3 recent scenarios
      
      setIsLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Set greeting based on time of day and user name
  useEffect(() => {
    const currentHour = new Date().getHours();
    let timeBasedGreeting = '';
    
    if (currentHour < 12) {
      timeBasedGreeting = 'Good morning';
    } else if (currentHour < 18) {
      timeBasedGreeting = 'Good afternoon';
    } else {
      timeBasedGreeting = 'Good evening';
    }
    
    // Get user's first name for personalization
    const firstName = user?.fullName ? user.fullName.split(' ')[0] : null;
    const personalizedGreeting = firstName 
      ? `${timeBasedGreeting}, ${firstName}!`
      : timeBasedGreeting;
    
    setGreeting(personalizedGreeting);
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, []);
  
  const navigateToRiskReport = () => {
    navigation.navigate('Risk Report' as never);
  };

  const navigateToPortfolio = () => {
    navigation.navigate('Portfolio' as never);
  };
  
  const navigateToScenarios = () => {
    navigation.navigate('Scenarios' as never);
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="chart-timeline-variant" size={48} color="#10b981" />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
        </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />}
    >
      {/* Header with greeting */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.headerTitle}>Risk Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <MaterialCommunityIcons name="account-circle" size={32} color="#334155" />
        </TouchableOpacity>
      </View>

      {/* Risk Budget Gauge Card */}
      <LinearGradient
        colors={['#ecfdf5', '#d1fae5']}
        style={styles.gradientCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.gradientCardContent}>
          <View style={styles.riskBudgetHeader}>
            <Text style={styles.gradientCardTitle}>Risk Budget Usage</Text>
            <TouchableOpacity onPress={navigateToRiskReport}>
              <MaterialCommunityIcons name="arrow-right" size={24} color="#047857" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.gaugeContainer}>
            <View style={styles.gauge}>
              <View 
                style={[
                  styles.gaugeProgress,
                  { 
                    width: `${riskBudgetUsage * 100}%`,
                    backgroundColor: riskBudgetUsage > 0.8 ? '#ef4444' : riskBudgetUsage > 0.6 ? '#f59e0b' : '#10b981' 
                  }
                ]} 
              />
            </View>
            <View style={styles.gaugeLabels}>
              <View style={styles.gaugeLabel}>
                <Text style={styles.gaugeLabelText}>{(riskBudgetUsage * 100).toFixed(1)}%</Text>
                <Text style={styles.gaugeLabelSubtext}>Used</Text>
              </View>
              <View style={styles.gaugeLabel}>
                <Text style={styles.gaugeLabelText}>{((1 - riskBudgetUsage) * 100).toFixed(1)}%</Text>
                <Text style={styles.gaugeLabelSubtext}>Available</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Top Portfolios */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Portfolios</Text>
        <TouchableOpacity onPress={navigateToPortfolio} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.portfolioCardsContainer}>
        {portfolios.map((portfolio, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.portfolioCard}
            onPress={navigateToPortfolio}
          >
            <View style={styles.portfolioCardIcon}>
              <MaterialCommunityIcons 
                name="briefcase" 
                size={20} 
                color="#fff" 
              />
            </View>
            <View style={styles.portfolioCardContent}>
              <Text style={styles.portfolioCardName}>{portfolio.name}</Text>
              <Text style={styles.portfolioCardValue}>
                ${portfolio.totalValue.toLocaleString()}
              </Text>
            </View>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={20} 
              color="#64748b" 
              style={styles.portfolioCardArrow}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Risk Metrics */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top Risk Metrics</Text>
        <TouchableOpacity onPress={navigateToRiskReport} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>More details</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.riskMetricsCard}>
        <Card.Content style={styles.cardContentNoPadding}>
          {topRisks.map((risk, index) => (
            <View key={index} style={[styles.riskMetricItem, index < topRisks.length - 1 && styles.riskMetricItemBorder]}>
              <View style={styles.riskMetricHeader}>
                <Text style={styles.riskMetricName}>{risk.name}</Text>
                <View style={styles.riskMetricValue}>
                  <Text style={[
                    styles.riskMetricValueText,
                    risk.value / risk.limit > 0.8 ? styles.highRiskText : 
                    risk.value / risk.limit > 0.6 ? styles.mediumRiskText : 
                    styles.lowRiskText
                  ]}>
                    {risk.value.toFixed(2)}{risk.unit}
                  </Text>
                  <Text style={styles.riskMetricLimitText}>/ {risk.limit.toFixed(2)}{risk.unit}</Text>
                </View>
              </View>
              <View style={styles.riskBarContainer}>
                <View style={styles.riskBarBackground}>
                  <View 
                    style={[
                      styles.riskBarFill,
                      { 
                        width: `${(risk.value / risk.limit) * 100}%`,
                        backgroundColor: risk.value / risk.limit > 0.8 ? '#ef4444' : 
                                        risk.value / risk.limit > 0.6 ? '#f59e0b' : 
                                        '#10b981'
                      }
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Recent Scenarios */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Scenarios</Text>
        <TouchableOpacity onPress={navigateToScenarios} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>Run more</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.scenariosCard}>
        <Card.Content style={styles.cardContentNoPadding}>
          {recentScenarios.map((scenario, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.scenarioItem, index < recentScenarios.length - 1 && styles.scenarioItemBorder]}
              onPress={navigateToScenarios}
            >
              <View style={styles.scenarioIconContainer}>
                <View style={[
                  styles.scenarioIcon,
                  scenario.impactValue < 0 ? styles.negativeScenarioIcon : styles.positiveScenarioIcon
                ]}>
                  <MaterialCommunityIcons 
                    name={scenario.impactValue < 0 ? "arrow-down-drop-circle" : "arrow-up-drop-circle"} 
                    size={20} 
                    color="#fff" 
                  />
                </View>
              </View>
              <View style={styles.scenarioContent}>
                <Text style={styles.scenarioName}>{scenario.name}</Text>
                <Text style={styles.scenarioPortfolio}>{scenario.portfolioName}</Text>
              </View>
              <View style={styles.scenarioImpactContainer}>
                <Text style={[
                  styles.scenarioImpactValue,
                  scenario.impactValue < 0 ? styles.negativeImpact : styles.positiveImpact
                ]}>
                  {scenario.impactValue > 0 ? '+' : ''}{scenario.impactValue.toFixed(2)}%
                </Text>
                <Text style={styles.scenarioDate}>{scenario.runDate}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </Card.Content>
      </Card>

      {/* Risk Alerts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Risk Alerts</Text>
        <TouchableOpacity style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>View all</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.alertsCard}>
        <Card.Content style={styles.cardContentNoPadding}>
          <TouchableOpacity style={[styles.alertItem, styles.alertItemBorder]}>
            <View style={[styles.alertIndicator, styles.warningAlert]} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>VaR Threshold Approaching</Text>
              <Text style={styles.alertDescription}>Global Equity Fund is at 85% of VaR limit</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.alertItem, styles.alertItemBorder]}>
            <View style={[styles.alertIndicator, styles.criticalAlert]} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Sector Concentration</Text>
              <Text style={styles.alertDescription}>Technology exposure exceeds 30% in Aggressive Growth</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.alertItem}>
            <View style={[styles.alertIndicator, styles.infoAlert]} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>New Scenario Available</Text>
              <Text style={styles.alertDescription}>Fed Rate Hike (75bps) scenario is ready for analysis</Text>
            </View>
          </TouchableOpacity>
        </Card.Content>
      </Card>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  gradientCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
  },
  gradientCardContent: {
    padding: 16,
  },
  gradientCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 16,
  },
  riskBudgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeContainer: {
    marginTop: 8,
  },
  gauge: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  gaugeProgress: {
    height: '100%',
    borderRadius: 6,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gaugeLabel: {
    alignItems: 'center',
  },
  gaugeLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  gaugeLabelSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  seeAllButton: {
    padding: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  portfolioCardsContainer: {
    paddingHorizontal: 16,
  },
  portfolioCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  portfolioCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  portfolioCardName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 2,
  },
  portfolioCardValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  portfolioCardArrow: {
    marginLeft: 8,
  },
  riskMetricsCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
  },
  riskMetricItem: {
    padding: 16,
  },
  riskMetricItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  riskMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskMetricName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  riskMetricValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  riskMetricValueText: {
    fontSize: 15,
    fontWeight: '600',
  },
  riskMetricLimitText: {
    fontSize: 13,
    color: '#94a3b8',
    marginLeft: 2,
  },
  highRiskText: {
    color: '#ef4444',
  },
  mediumRiskText: {
    color: '#f59e0b',
  },
  lowRiskText: {
    color: '#10b981',
  },
  riskBarContainer: {
    width: '100%',
  },
  riskBarBackground: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  riskBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scenariosCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
  },
  scenarioItem: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scenarioItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  scenarioIconContainer: {
    marginRight: 12,
  },
  scenarioIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positiveScenarioIcon: {
    backgroundColor: '#10b981',
  },
  negativeScenarioIcon: {
    backgroundColor: '#ef4444',
  },
  scenarioContent: {
    flex: 1,
  },
  scenarioName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 2,
  },
  scenarioPortfolio: {
    fontSize: 13,
    color: '#64748b',
  },
  scenarioImpactContainer: {
    alignItems: 'flex-end',
  },
  scenarioImpactValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  positiveImpact: {
    color: '#10b981',
  },
  negativeImpact: {
    color: '#ef4444',
  },
  scenarioDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  alertsCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  alertItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  alertIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  criticalAlert: {
    backgroundColor: '#ef4444',
  },
  warningAlert: {
    backgroundColor: '#f59e0b',
  },
  infoAlert: {
    backgroundColor: '#3b82f6',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  bottomSpacing: {
    height: 32,
  },
  cardContentNoPadding: {
    padding: 0,
  },
});

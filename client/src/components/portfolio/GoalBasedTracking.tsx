import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Goal {
  id: string;
  name: string;
  type: 'retirement' | 'house' | 'education' | 'emergency' | 'vacation' | 'custom';
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  portfolioIds: string[];
  progress: number; // 0-100
  onTrack: boolean;
  projections: {
    likely: number; // 50th percentile
    optimistic: number; // 90th percentile
    pessimistic: number; // 10th percentile
    probability: number; // Probability of reaching goal
  };
}

interface GoalBasedTrackingProps {
  portfolioIds: string[];
  onGoalPress?: (goal: Goal) => void;
  onAddGoal?: () => void;
}

const GoalBasedTracking: React.FC<GoalBasedTrackingProps> = ({
  portfolioIds,
  onGoalPress,
  onAddGoal
}) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showProjections, setShowProjections] = useState(false);

  useEffect(() => {
    loadGoals();
  }, [portfolioIds]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      // Mock data - in real app, this would come from goals service
      const mockGoals: Goal[] = [
        {
          id: '1',
          name: 'Retirement Fund',
          type: 'retirement',
          targetAmount: 1000000,
          currentAmount: 342000,
          targetDate: '2045-01-01',
          monthlyContribution: 2000,
          riskTolerance: 'moderate',
          portfolioIds: ['portfolio-1', 'portfolio-2'],
          progress: 34.2,
          onTrack: true,
          projections: {
            likely: 1200000,
            optimistic: 1800000,
            pessimistic: 850000,
            probability: 78
          }
        },
        {
          id: '2',
          name: 'House Down Payment',
          type: 'house',
          targetAmount: 100000,
          currentAmount: 45000,
          targetDate: '2026-06-01',
          monthlyContribution: 1500,
          riskTolerance: 'conservative',
          portfolioIds: ['portfolio-3'],
          progress: 45.0,
          onTrack: false,
          projections: {
            likely: 85000,
            optimistic: 95000,
            pessimistic: 75000,
            probability: 35
          }
        },
        {
          id: '3',
          name: 'Kids Education Fund',
          type: 'education',
          targetAmount: 200000,
          currentAmount: 78000,
          targetDate: '2035-09-01',
          monthlyContribution: 800,
          riskTolerance: 'moderate',
          portfolioIds: ['portfolio-4'],
          progress: 39.0,
          onTrack: true,
          projections: {
            likely: 220000,
            optimistic: 280000,
            pessimistic: 180000,
            probability: 82
          }
        },
        {
          id: '4',
          name: 'Emergency Fund',
          type: 'emergency',
          targetAmount: 50000,
          currentAmount: 48000,
          targetDate: '2024-12-01',
          monthlyContribution: 500,
          riskTolerance: 'conservative',
          portfolioIds: ['portfolio-5'],
          progress: 96.0,
          onTrack: true,
          projections: {
            likely: 52000,
            optimistic: 54000,
            pessimistic: 50000,
            probability: 95
          }
        }
      ];
      
      setGoals(mockGoals);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  const getTimeToGoal = (targetDate: string): string => {
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = Math.abs(target.getTime() - now.getTime());
    const diffYears = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 365));
    return `${diffYears} year${diffYears !== 1 ? 's' : ''}`;
  };

  const getGoalIcon = (type: Goal['type']) => {
    switch (type) {
      case 'retirement':
        return 'account-supervisor';
      case 'house':
        return 'home';
      case 'education':
        return 'school';
      case 'emergency':
        return 'shield-check';
      case 'vacation':
        return 'airplane';
      default:
        return 'target';
    }
  };

  const getGoalColor = (type: Goal['type']) => {
    switch (type) {
      case 'retirement':
        return '#8b5cf6';
      case 'house':
        return '#3b82f6';
      case 'education':
        return '#10b981';
      case 'emergency':
        return '#ef4444';
      case 'vacation':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const renderProgressRing = (progress: number, size: number = 60) => {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;
    
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    );
  };

  const renderMonteCarloChart = (projections: Goal['projections']) => {
    const width = 300;
    const height = 150;
    const padding = 20;
    
    const values = [
      projections.pessimistic,
      projections.likely,
      projections.optimistic
    ];
    
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    
    const getY = (value: number) => {
      return height - padding - ((value - minValue) / range) * (height - 2 * padding);
    };
    
    return (
      <View style={styles.monteCarloChart}>
        <Text style={styles.chartTitle}>Monte Carlo Projections</Text>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="probabilityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <Stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
            </LinearGradient>
          </Defs>
          
          {/* Probability band */}
          <Path
            d={`M ${padding} ${getY(projections.pessimistic)} 
                L ${width - padding} ${getY(projections.pessimistic)}
                L ${width - padding} ${getY(projections.optimistic)}
                L ${padding} ${getY(projections.optimistic)} Z`}
            fill="url(#probabilityGradient)"
          />
          
          {/* Likely outcome line */}
          <Path
            d={`M ${padding} ${getY(projections.likely)} L ${width - padding} ${getY(projections.likely)}`}
            stroke="#3b82f6"
            strokeWidth="3"
          />
        </Svg>
        
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Pessimistic: {formatCurrency(projections.pessimistic)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Likely: {formatCurrency(projections.likely)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>Optimistic: {formatCurrency(projections.optimistic)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const handleGoalPress = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowProjections(true);
  };

  const handleAdjustGoal = (goal: Goal) => {
    Alert.alert(
      'Adjust Goal',
      `What would you like to adjust for "${goal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Target Amount', onPress: () => {} },
        { text: 'Monthly Contribution', onPress: () => {} },
        { text: 'Target Date', onPress: () => {} }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading goals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Investment Goals</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddGoal}>
          <MaterialCommunityIcons name="plus" size={16} color="#3b82f6" />
          <Text style={styles.addButtonText}>Add Goal</Text>
        </TouchableOpacity>
      </View>

      {goals.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="target" size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No Goals Set</Text>
          <Text style={styles.emptyDescription}>
            Set investment goals to track your progress and stay motivated
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onAddGoal}>
            <Text style={styles.emptyButtonText}>Create First Goal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.goalsContainer} showsVerticalScrollIndicator={false}>
          {goals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.goalItem,
                !goal.onTrack && styles.offTrackGoal
              ]}
              onPress={() => handleGoalPress(goal)}
            >
              <View style={styles.goalHeader}>
                <View style={styles.goalIconContainer}>
                  <MaterialCommunityIcons
                    name={getGoalIcon(goal.type)}
                    size={24}
                    color={getGoalColor(goal.type)}
                  />
                </View>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={styles.goalTarget}>
                    Target: {formatCurrency(goal.targetAmount)} by {formatDate(goal.targetDate)}
                  </Text>
                  <Text style={styles.goalTimeframe}>
                    {getTimeToGoal(goal.targetDate)} remaining
                  </Text>
                </View>
                <View style={styles.goalProgress}>
                  <View style={styles.progressRing}>
                    {renderProgressRing(goal.progress)}
                    <Text style={styles.progressText}>{goal.progress.toFixed(0)}%</Text>
                  </View>
                </View>
              </View>

              <View style={styles.goalDetails}>
                <View style={styles.goalStat}>
                  <Text style={styles.goalStatLabel}>Current</Text>
                  <Text style={styles.goalStatValue}>
                    {formatCurrency(goal.currentAmount)}
                  </Text>
                </View>
                <View style={styles.goalStat}>
                  <Text style={styles.goalStatLabel}>Monthly</Text>
                  <Text style={styles.goalStatValue}>
                    {formatCurrency(goal.monthlyContribution)}
                  </Text>
                </View>
                <View style={styles.goalStat}>
                  <Text style={styles.goalStatLabel}>Probability</Text>
                  <Text style={[
                    styles.goalStatValue,
                    goal.projections.probability >= 70 ? styles.highProbability :
                    goal.projections.probability >= 50 ? styles.mediumProbability :
                    styles.lowProbability
                  ]}>
                    {goal.projections.probability}%
                  </Text>
                </View>
              </View>

              {!goal.onTrack && (
                <View style={styles.warningContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.warningText}>
                    Behind target - consider increasing contributions
                  </Text>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    onPress={() => handleAdjustGoal(goal)}
                  >
                    <Text style={styles.adjustButtonText}>Adjust</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Projections Modal */}
      <Modal
        visible={showProjections}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProjections(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedGoal?.name} Projections
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowProjections(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {selectedGoal && (
              <>
                <View style={styles.projectionSummary}>
                  <Text style={styles.projectionTitle}>Goal Analysis</Text>
                  <Text style={styles.projectionDescription}>
                    Based on current contributions and market conditions, here's your goal analysis:
                  </Text>
                  
                  <View style={styles.probabilityContainer}>
                    <Text style={styles.probabilityLabel}>Success Probability</Text>
                    <Text style={[
                      styles.probabilityValue,
                      selectedGoal.projections.probability >= 70 ? styles.highProbability :
                      selectedGoal.projections.probability >= 50 ? styles.mediumProbability :
                      styles.lowProbability
                    ]}>
                      {selectedGoal.projections.probability}%
                    </Text>
                  </View>
                </View>

                {renderMonteCarloChart(selectedGoal.projections)}
                
                <View style={styles.recommendationsContainer}>
                  <Text style={styles.recommendationsTitle}>Recommendations</Text>
                  {selectedGoal.projections.probability < 70 && (
                    <View style={styles.recommendationItem}>
                      <MaterialCommunityIcons name="trending-up" size={20} color="#f59e0b" />
                      <Text style={styles.recommendationText}>
                        Increase monthly contribution by {formatCurrency(200)} to improve success probability
                      </Text>
                    </View>
                  )}
                  {selectedGoal.riskTolerance === 'conservative' && (
                    <View style={styles.recommendationItem}>
                      <MaterialCommunityIcons name="chart-line" size={20} color="#3b82f6" />
                      <Text style={styles.recommendationText}>
                        Consider moderate risk allocation to potentially reach goal faster
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  goalsContainer: {
    maxHeight: 400,
  },
  goalItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  offTrackGoal: {
    borderColor: '#fed7d7',
    backgroundColor: '#fffbfa',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  goalTarget: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  goalTimeframe: {
    fontSize: 12,
    color: '#94a3b8',
  },
  goalProgress: {
    alignItems: 'center',
  },
  progressRing: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  goalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goalStat: {
    alignItems: 'center',
  },
  goalStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  goalStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  highProbability: {
    color: '#10b981',
  },
  mediumProbability: {
    color: '#f59e0b',
  },
  lowProbability: {
    color: '#ef4444',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#ef4444',
  },
  adjustButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  adjustButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  projectionSummary: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  projectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  projectionDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  probabilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  probabilityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  probabilityValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  monteCarloChart: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartLegend: {
    marginTop: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#64748b',
  },
  recommendationsContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

export default GoalBasedTracking; 
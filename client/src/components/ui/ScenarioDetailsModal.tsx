import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CalculationExplanationModal from './CalculationExplanationModal';
import calculationExplanationService from '../../services/calculationExplanationService';
import { CalculationExplanation } from '../../services/calculationExplanationService';

// Types for scenario run data

interface ScenarioRunData {
  id: string;
  scenarioId: string;
  scenarioName: string;
  date: string;
  time: string;
  portfolioId: string;
  portfolioName: string;
  portfolioValue: number;
  impact: number;  // Percentage impact
  impactValue: number; // Absolute impact in currency
  assetClassImpacts: Record<string, number>; // Impact by asset class
  factorAttribution: Record<string, number>; // Impact attribution by factor
}

interface ScenarioDetailsModalProps {
  visible: boolean;
  scenarioRun: ScenarioRunData | null;
  onClose: () => void;
  onRunAgain?: (scenarioRun: ScenarioRunData) => void;
}

const ScenarioDetailsModal: React.FC<ScenarioDetailsModalProps> = ({
  visible,
  scenarioRun,
  onClose,
  onRunAgain
}) => {
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<CalculationExplanation | null>(null);

  console.log('ScenarioDetailsModal rendered with visible:', visible, 'scenarioRun:', !!scenarioRun, 'VERSION 2.0');

  if (!visible || !scenarioRun) {
    console.log('ScenarioDetailsModal not visible or no scenarioRun, returning null');
    return null;
  }

  console.log('ScenarioDetailsModal IS VISIBLE! Showing modal with scenarioRun:', scenarioRun.scenarioName);

  const showExplanation = (type: string, context?: any) => {
    console.log('showExplanation called with type:', type, 'context:', context);
    if (!scenarioRun) return;
    
    let explanation: CalculationExplanation;
    
    try {
      // Create a mock results object for the explanation service
      const mockResults = {
        totalImpact: scenarioRun.impactValue,
        totalImpactPercent: scenarioRun.impact,
        portfolioValue: scenarioRun.portfolioValue,
        stressedValue: scenarioRun.portfolioValue + scenarioRun.impactValue,
        scenarioFactors: {
          equity: -25, // Default market shock for explanation
          rates: 0,
          credit: 0,
          fx: 0,
          commodity: 0,
          volatility: 0
        },
        factorAttribution: scenarioRun.factorAttribution,
        assetClassImpacts: Object.entries(scenarioRun.assetClassImpacts).reduce((acc, [key, value]) => {
          acc[key] = {
            impact: value * scenarioRun.portfolioValue / 100,
            impact_percent: value,
            current_value: scenarioRun.portfolioValue * 0.5, // Mock current value
            weight: 0.5 // Mock weight
          };
          return acc;
        }, {} as any),
        positionResults: [
          {
            symbol: 'AAPL',
            currentValue: scenarioRun.portfolioValue * 0.5,
            impactPercent: scenarioRun.impact,
            assetClass: 'equity',
            factorContributions: {
              equity: scenarioRun.factorAttribution.equity || 0,
              rates: 0,
              credit: 0,
              fx: 0,
              commodity: 0,
              volatility: 0
            }
          }
        ]
      };
      
      console.log('showExplanation called with type:', type, 'context:', context);
      console.log('mockResults:', mockResults);
      
      switch (type) {
        case 'portfolio-impact':
          explanation = calculationExplanationService.getPortfolioImpactExplanation(
            mockResults,
            mockResults.scenarioFactors
          );
          console.log('Generated portfolio-impact explanation:', explanation);
          break;
        case 'asset-class':
          explanation = calculationExplanationService.getAssetClassImpactExplanation(
            context,
            mockResults
          );
          console.log('Generated asset-class explanation:', explanation);
          break;
        case 'factor':
          explanation = calculationExplanationService.getFactorAttributionExplanation(
            context,
            mockResults
          );
          console.log('Generated factor explanation:', explanation);
          break;
        case 'factor-filtering':
          const totalFactors = 6; // equity, rates, credit, fx, commodity, volatility
          const shownFactors = Object.keys(scenarioRun.factorAttribution);
          explanation = calculationExplanationService.getFactorFilteringExplanation(
            shownFactors,
            ['equity', 'rates', 'credit', 'fx', 'commodity', 'volatility']
          );
          break;
        default:
          return;
      }
      
      console.log('Setting explanation and showing modal:', explanation);
      setCurrentExplanation(explanation);
      setShowExplanationModal(true);
    } catch (error) {
      console.error('Error generating explanation:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scenario Run Details</Text>
          <View style={styles.headerAction} />
        </View>

        <ScrollView style={styles.detailsContainer}>
          {/* Header Info */}
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>{scenarioRun.scenarioName}</Text>
            <Text style={styles.detailsDate}>
              Run on {scenarioRun.date} at {scenarioRun.time}
            </Text>
            <View style={styles.detailsPortfolioTag}>
              <Text style={styles.detailsPortfolioTagText}>
                Portfolio: {scenarioRun.portfolioName}
              </Text>
            </View>
          </View>

          {/* Portfolio Impact */}
          <View style={styles.detailsCard}>
            <View style={styles.labelWithIcon}>
              <Text style={styles.detailsCardTitle}>Portfolio Impact</Text>
              <TouchableOpacity 
                onPress={() => {
                  console.log('Portfolio Impact icon tapped!');
                  showExplanation('portfolio-impact');
                }}
                style={[styles.infoIcon, {backgroundColor: '#f0f9ff', padding: 8, borderRadius: 20}]}
              >
                <Ionicons name="information-circle-outline" size={20} color="#1d4ed8" />
              </TouchableOpacity>
            </View>
            <View style={styles.impactDetailRow}>
              <Text style={styles.impactDetailLabel}>P&L Impact:</Text>
              <Text style={[
                styles.impactDetailValue,
                scenarioRun.impact >= 0 ? styles.positiveImpact : styles.negativeImpact
              ]}>
                {scenarioRun.impact >= 0 ? '+' : ''}{scenarioRun.impact.toFixed(2)}% 
                ({scenarioRun.impact >= 0 ? '+' : ''}${Math.abs(scenarioRun.impactValue).toLocaleString()})
              </Text>
            </View>
          </View>

          {/* Impact by Asset Class */}
          <View style={styles.detailsCard}>
            <View style={styles.detailsCardHeader}>
              <View style={styles.labelWithIcon}>
                <Text style={styles.detailsCardTitle}>Impact by Asset Class</Text>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('Asset Class icon tapped!');
                    showExplanation('asset-class', 'equity');
                  }}
                  style={[styles.infoIcon, {backgroundColor: '#f0f9ff', padding: 8, borderRadius: 20}]}
                >
                  <Ionicons name="information-circle-outline" size={20} color="#1d4ed8" />
                </TouchableOpacity>
              </View>
            </View>
            
            {Object.keys(scenarioRun.assetClassImpacts).length > 0 ? (
              <View style={styles.assetClassTable}>
                {Object.entries(scenarioRun.assetClassImpacts).map(([assetClass, impact]) => (
                  <View key={assetClass} style={styles.assetClassRow}>
                    <View style={styles.labelWithIcon}>
                      <Text style={styles.assetClassName}>
                        {assetClass.charAt(0).toUpperCase() + assetClass.slice(1)}
                      </Text>
                      <TouchableOpacity 
                        onPress={() => {
                          console.log('Individual Asset Class icon tapped!');
                          showExplanation('asset-class', assetClass);
                        }}
                        style={styles.infoIcon}
                      >
                        <Ionicons name="information-circle-outline" size={16} color="#3b82f6" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[
                      styles.assetClassImpact,
                      impact >= 0 ? styles.positiveImpact : styles.negativeImpact
                    ]}>
                      {impact >= 0 ? '+' : ''}{impact.toFixed(2)}%
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Image
                source={{ uri: 'https://miro.medium.com/v2/resize:fit:1400/1*l_QoPs5-eZepLAoaGEdo6Q.png' }}
                style={styles.barChartImage}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Factor Attribution */}
          <View style={styles.detailsCard}>
            <View style={styles.labelWithIcon}>
              <Text style={styles.detailsCardTitle}>Factor Attribution</Text>
              <TouchableOpacity 
                onPress={() => {
                  console.log('Factor Attribution icon tapped!');
                  showExplanation('factor', 'equity');
                }}
                style={[styles.infoIcon, {backgroundColor: '#f0f9ff', padding: 8, borderRadius: 20}]}
              >
                <Ionicons name="information-circle-outline" size={20} color="#1d4ed8" />
              </TouchableOpacity>
            </View>
            
            {/* Show relevance notice if not all factors are displayed */}
            {Object.keys(scenarioRun.factorAttribution).length < 6 && (
              <View style={styles.infoNotice}>
                <Ionicons name="information-circle-outline" size={16} color="#3b82f6" />
                <Text style={styles.infoNoticeText}>
                  Only showing factors relevant to your portfolio's composition
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('Factor Filtering icon tapped!');
                    showExplanation('factor-filtering');
                  }}
                  style={styles.infoIcon}
                >
                  <Ionicons name="information-circle-outline" size={16} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.factorTable}>
              <View style={styles.factorTableHeader}>
                <Text style={styles.factorHeaderCell}>Factor</Text>
                <Text style={styles.factorHeaderCell}>Impact</Text>
              </View>
              {Object.entries(scenarioRun.factorAttribution).map(([factor, impact]) => (
                <View key={factor} style={styles.factorTableRow}>
                  <View style={styles.labelWithIcon}>
                    <Text style={styles.factorCell}>
                      {factor.charAt(0).toUpperCase() + factor.slice(1)}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => {
                        console.log('Individual Factor icon tapped!');
                        showExplanation('factor', factor);
                      }}
                      style={[styles.infoIcon, {backgroundColor: '#f0f9ff', padding: 6, borderRadius: 15}]}
                    >
                      <Ionicons name="information-circle-outline" size={18} color="#1d4ed8" />
                    </TouchableOpacity>
                  </View>
                  <Text style={[
                    styles.factorCell, 
                    impact >= 0 ? styles.positiveImpact : styles.negativeImpact
                  ]}>
                    {impact >= 0 ? '+' : ''}${Math.abs(impact).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>


          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {onRunAgain && (
              <TouchableOpacity 
                style={styles.runAgainButton}
                onPress={() => onRunAgain(scenarioRun)}
              >
                <Text style={styles.runAgainButtonText}>Run This Scenario Again</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      
      {/* Calculation Explanation Modal */}
      <CalculationExplanationModal
        visible={showExplanationModal}
        explanation={currentExplanation}
        onClose={() => setShowExplanationModal(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  headerAction: {
    width: 40,
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  detailsHeader: {
    paddingVertical: 20,
  },
  detailsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  detailsDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  detailsPortfolioTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailsPortfolioTagText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  detailsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  impactDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  impactDetailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  positiveImpact: {
    color: '#10B981',
  },
  negativeImpact: {
    color: '#EF4444',
  },
  assetClassTable: {
    marginTop: 8,
  },
  assetClassRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  assetClassName: {
    fontSize: 14,
    color: '#374151',
  },
  assetClassImpact: {
    fontSize: 14,
    fontWeight: '600',
  },
  barChartImage: {
    width: '100%',
    height: 200,
    marginTop: 12,
  },
  factorTable: {
    marginTop: 8,
  },
  factorTableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  factorHeaderCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  factorTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  factorCell: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  actionButtonsContainer: {
    paddingVertical: 20,
    gap: 12,
  },
  runAgainButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  runAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for calculation explanation icons
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    padding: 4,
    marginLeft: 8,
  },
});

export default ScenarioDetailsModal;
export type { ScenarioRunData }; 
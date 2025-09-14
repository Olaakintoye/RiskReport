import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SubscriptionPlan } from '../../services/subscriptionService';

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  isSelected?: boolean;
  isCurrentPlan?: boolean;
  onSelect?: () => void;
  showPrice?: boolean;
}

const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({
  plan,
  isSelected = false,
  isCurrentPlan = false,
  onSelect,
  showPrice = true
}) => {
  const formatPrice = (price: number, cycle: string) => {
    if (cycle === 'yearly') {
      const monthlyEquivalent = Math.round(price / 12);
      return `$${monthlyEquivalent}/mo`;
    }
    return `$${price}/mo`;
  };

  const getFullPrice = (price: number, cycle: string) => {
    if (cycle === 'yearly') {
      return `$${price}/year`;
    }
    return `$${price}/month`;
  };

  const getSavingsText = (plan: SubscriptionPlan) => {
    if (plan.billingCycle === 'yearly' && plan.badge) {
      return plan.badge;
    }
    return null;
  };

  return (
    <Pressable
      style={[
        styles.container,
        isSelected && styles.selectedContainer,
        isCurrentPlan && styles.currentPlanContainer,
        plan.popular && styles.popularContainer
      ]}
      onPress={onSelect}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}

      {/* Savings Badge */}
      {plan.badge && (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsBadgeText}>{plan.badge}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.planInfo}>
          <Text style={styles.planName}>{plan.name}</Text>
          {showPrice && (
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{formatPrice(plan.price, plan.billingCycle)}</Text>
              <Text style={styles.fullPrice}>{getFullPrice(plan.price, plan.billingCycle)}</Text>
            </View>
          )}
        </View>
        
        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        )}
      </View>

      {/* Description */}
      <Text style={styles.description}>{plan.description}</Text>

      {/* Features */}
      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Ionicons 
              name="checkmark-circle" 
              size={16} 
              color={plan.popular ? "#10b981" : "#3b82f6"} 
              style={styles.checkIcon}
            />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* Limits Summary */}
      <View style={styles.limitsContainer}>
        <View style={styles.limitItem}>
          <Text style={styles.limitLabel}>Portfolios:</Text>
          <Text style={styles.limitValue}>
            {typeof plan.limits.portfolios === 'number' ? plan.limits.portfolios : plan.limits.portfolios}
          </Text>
        </View>
        <View style={styles.limitItem}>
          <Text style={styles.limitLabel}>Historical Data:</Text>
          <Text style={styles.limitValue}>{plan.limits.historicalData}</Text>
        </View>
        <View style={styles.limitItem}>
          <Text style={styles.limitLabel}>Support:</Text>
          <Text style={styles.limitValue}>{plan.limits.support}</Text>
        </View>
      </View>

      {/* Selection Indicator */}
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedContainer: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  currentPlanContainer: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  popularContainer: {
    borderColor: '#10b981',
    borderWidth: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  savingsBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    marginTop: 8,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  fullPrice: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  currentBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  currentBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    flex: 1,
  },
  limitsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  limitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  limitLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  limitValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});

export default SubscriptionPlanCard;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

// Import services and components
import subscriptionService, {
  SubscriptionPlan,
  UserSubscription,
  PaymentMethod,
  BillingHistory
} from '../../services/subscriptionService';
import SubscriptionPlanCard from '../../components/subscription/SubscriptionPlanCard';
import PaymentMethodCard from '../../components/subscription/PaymentMethodCard';
import BillingHistoryItem from '../../components/subscription/BillingHistoryItem';

interface SubscriptionManagementScreenProps {}

const SubscriptionManagementScreen: React.FC<SubscriptionManagementScreenProps> = () => {
  const navigation = useNavigation();

  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'billing' | 'history'>('plans');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly'); // Default to yearly to show savings
  
  // Data state
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  
  // Modal states
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        userSubscription,
        subscriptionPlans,
        userPaymentMethods,
        userBillingHistory
      ] = await Promise.all([
        subscriptionService.getUserSubscription(),
        subscriptionService.getSubscriptionPlans(),
        subscriptionService.getPaymentMethods(),
        subscriptionService.getBillingHistory()
      ]);

      setSubscription(userSubscription);
      setPlans(subscriptionPlans);
      setPaymentMethods(userPaymentMethods);
      setBillingHistory(userBillingHistory);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleTabPress = (tab: 'plans' | 'billing' | 'history') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleBillingCycleToggle = (cycle: 'monthly' | 'yearly') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBillingCycle(cycle);
  };

  const getCurrentPlan = (): SubscriptionPlan | null => {
    if (!subscription) return null;
    return plans.find(plan => plan.id === subscription.planId) || null;
  };

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    const currentPlan = getCurrentPlan();
    if (currentPlan?.id === plan.id) return;

    setSelectedPlan(plan);
    setShowPlanSelection(true);
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) return;

    try {
      Alert.alert(
        'Change Plan',
        `Are you sure you want to change to ${selectedPlan.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Change Plan',
            onPress: async () => {
              try {
                await subscriptionService.changePlan(selectedPlan.id);
                await loadData();
                setShowPlanSelection(false);
                Alert.alert('Success', 'Your plan has been updated');
              } catch (error) {
                Alert.alert('Error', 'Failed to change plan');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to change plan');
    }
  };

  const handleCancelSubscription = () => {
    if (!subscription) return;

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              await subscriptionService.cancelSubscription(subscription.id);
              await loadData();
              Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription');
            }
          }
        }
      ]
    );
  };

  const handleReactivateSubscription = async () => {
    if (!subscription) return;

    try {
      await subscriptionService.reactivateSubscription(subscription.id);
      await loadData();
      Alert.alert('Success', 'Your subscription has been reactivated');
    } catch (error) {
      Alert.alert('Error', 'Failed to reactivate subscription');
    }
  };

  const handleSetDefaultPaymentMethod = async (methodId: string) => {
    try {
      await subscriptionService.setDefaultPaymentMethod(methodId);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to set default payment method');
    }
  };

  const handleRemovePaymentMethod = async (methodId: string) => {
    try {
      await subscriptionService.removePaymentMethod(methodId);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to remove payment method');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Subscription</Text>
      <View style={styles.backButton} />
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'plans' && styles.activeTab]}
        onPress={() => handleTabPress('plans')}
      >
        <Text style={[styles.tabText, activeTab === 'plans' && styles.activeTabText]}>
          Plans
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'billing' && styles.activeTab]}
        onPress={() => handleTabPress('billing')}
      >
        <Text style={[styles.tabText, activeTab === 'billing' && styles.activeTabText]}>
          Billing
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'history' && styles.activeTab]}
        onPress={() => handleTabPress('history')}
      >
        <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
          History
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentSubscription = () => {
    const currentPlan = getCurrentPlan();
    
    if (!subscription || !currentPlan) {
      return (
        <View style={styles.subscriptionStatusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="information-circle" size={24} color="#f59e0b" />
            <Text style={styles.statusTitle}>No Active Subscription</Text>
          </View>
          <Text style={styles.statusDescription}>
            Choose a plan to access premium features
          </Text>
        </View>
      );
    }

    const isActive = subscription.status === 'active';
    const endDate = new Date(subscription.endDate);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
      <View style={styles.subscriptionStatusCard}>
        <View style={styles.statusHeader}>
          <Ionicons 
            name={isActive ? "checkmark-circle" : "warning"} 
            size={24} 
            color={isActive ? "#10b981" : "#f59e0b"} 
          />
          <Text style={styles.statusTitle}>
            {currentPlan.name} Plan
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? '#10b981' : '#f59e0b' }]}>
            <Text style={styles.statusBadgeText}>
              {subscription.status.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text style={styles.statusDescription}>
          {isActive ? (
            subscription.autoRenew ? 
              `Renews automatically on ${endDate.toLocaleDateString()}` :
              `Expires on ${endDate.toLocaleDateString()} (${daysUntilExpiry} days remaining)`
          ) : (
            'Your subscription is not active'
          )}
        </Text>

        {subscription.status === 'cancelled' && (
          <TouchableOpacity 
            style={styles.reactivateButton}
            onPress={handleReactivateSubscription}
          >
            <Text style={styles.reactivateButtonText}>Reactivate Subscription</Text>
          </TouchableOpacity>
        )}

        {subscription.status === 'active' && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancelSubscription}
          >
            <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderBillingCycleToggle = () => (
    <View style={styles.billingToggleContainer}>
      <View style={styles.billingToggle}>
        <TouchableOpacity
          style={[
            styles.billingOption,
            billingCycle === 'monthly' && styles.activeBillingOption
          ]}
          onPress={() => handleBillingCycleToggle('monthly')}
        >
          <Text style={[
            styles.billingOptionText,
            billingCycle === 'monthly' && styles.activeBillingOptionText
          ]}>
            Monthly
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.billingOption,
            billingCycle === 'yearly' && styles.activeBillingOption
          ]}
          onPress={() => handleBillingCycleToggle('yearly')}
        >
          <Text style={[
            styles.billingOptionText,
            billingCycle === 'yearly' && styles.activeBillingOptionText
          ]}>
            Annual
          </Text>
          {billingCycle === 'yearly' && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsBadgeText}>Save 17%</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlansTab = () => {
    const currentPlan = getCurrentPlan();
    const filteredPlans = plans.filter(plan => plan.billingCycle === billingCycle);
    
    return (
      <View style={styles.tabContent}>
        {renderCurrentSubscription()}
        
        <View style={styles.plansHeader}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          {renderBillingCycleToggle()}
        </View>
        
        {filteredPlans.map((plan) => (
          <SubscriptionPlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={currentPlan?.id === plan.id}
            onSelect={() => handlePlanSelect(plan)}
          />
        ))}
      </View>
    );
  };

  const renderBillingTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddPaymentModal(true)}
        >
          <Ionicons name="add" size={20} color="#3b82f6" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      
      {paymentMethods.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyStateText}>No payment methods added</Text>
          <TouchableOpacity 
            style={styles.emptyStateButton}
            onPress={() => setShowAddPaymentModal(true)}
          >
            <Text style={styles.emptyStateButtonText}>Add Payment Method</Text>
          </TouchableOpacity>
        </View>
      ) : (
        paymentMethods.map((method) => (
          <PaymentMethodCard
            key={method.id}
            paymentMethod={method}
            onSetDefault={() => handleSetDefaultPaymentMethod(method.id)}
            onRemove={() => handleRemovePaymentMethod(method.id)}
          />
        ))
      )}
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Billing History</Text>
      
      {billingHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyStateText}>No billing history</Text>
        </View>
      ) : (
        billingHistory.map((item) => (
          <BillingHistoryItem key={item.id} item={item} />
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading subscription data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'plans' && renderPlansTab()}
        {activeTab === 'billing' && renderBillingTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </ScrollView>

      {/* Plan Selection Modal */}
      <Modal
        visible={showPlanSelection}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPlanSelection(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Change Plan</Text>
            <TouchableOpacity onPress={handleChangePlan}>
              <Text style={styles.modalConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {selectedPlan && (
              <SubscriptionPlanCard
                plan={selectedPlan}
                isSelected={true}
                showPrice={true}
              />
            )}
            
            <View style={styles.changeInfo}>
              <Text style={styles.changeInfoText}>
                Your plan will be changed immediately. Any unused time from your current plan will be prorated.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Payment Method Modal Placeholder */}
      <Modal
        visible={showAddPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddPaymentModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Payment Method</Text>
            <View />
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.comingSoon}>
              <Ionicons name="card-outline" size={64} color="#9ca3af" />
              <Text style={styles.comingSoonText}>Payment integration coming soon</Text>
              <Text style={styles.comingSoonSubtext}>
                This feature will be integrated with Stripe or similar payment providers
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  subscriptionStatusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  reactivateButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  reactivateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  plansHeader: {
    marginBottom: 24,
  },
  billingToggleContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    width: '100%',
    maxWidth: 300,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    position: 'relative',
  },
  activeBillingOption: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  billingOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeBillingOptionText: {
    color: '#111827',
  },
  savingsBadge: {
    position: 'absolute',
    top: -6,
    right: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  changeInfo: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  changeInfoText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SubscriptionManagementScreen;

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limits: {
    portfolios: number | 'unlimited';
    historicalData: string;
    apiCalls: number | 'unlimited';
    support: string;
  };
  popular?: boolean;
  badge?: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentMethod?: PaymentMethod;
  trialDaysRemaining?: number;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  lastFourDigits?: string;
  expiryDate?: string;
  brand?: string;
  isDefault: boolean;
}

export interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  description: string;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl?: string;
}

// Predefined subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'essential-monthly',
    name: 'Essential',
    description: 'Perfect for individual investors getting started with risk management',
    price: 29,
    billingCycle: 'monthly',
    features: [
      'Up to 3 portfolios',
      'Basic VaR calculations',
      'Standard risk alerts',
      '1 year historical data',
      'Email support',
      'Mobile & web access'
    ],
    limits: {
      portfolios: 3,
      historicalData: '1 year',
      apiCalls: 1000,
      support: 'Email support'
    }
  },
  {
    id: 'essential-yearly',
    name: 'Essential',
    description: 'Perfect for individual investors getting started with risk management',
    price: 290,
    billingCycle: 'yearly',
    features: [
      'Up to 3 portfolios',
      'Basic VaR calculations',
      'Standard risk alerts',
      '1 year historical data',
      'Email support',
      'Mobile & web access'
    ],
    limits: {
      portfolios: 3,
      historicalData: '1 year',
      apiCalls: 1000,
      support: 'Email support'
    },
    badge: '2 months free'
  },
  {
    id: 'professional-monthly',
    name: 'Professional',
    description: 'Advanced tools for financial advisors and growing firms',
    price: 99,
    billingCycle: 'monthly',
    features: [
      'Unlimited portfolios',
      'Advanced VaR methodologies',
      'Real-time market data',
      'Comprehensive stress testing',
      'Advanced scenario builder',
      'Full historical data access',
      'Priority support',
      'API access',
      'Custom reports'
    ],
    limits: {
      portfolios: 'unlimited',
      historicalData: 'Full access',
      apiCalls: 10000,
      support: 'Priority support'
    },
    popular: true
  },
  {
    id: 'professional-yearly',
    name: 'Professional',
    description: 'Advanced tools for financial advisors and growing firms',
    price: 990,
    billingCycle: 'yearly',
    features: [
      'Unlimited portfolios',
      'Advanced VaR methodologies',
      'Real-time market data',
      'Comprehensive stress testing',
      'Advanced scenario builder',
      'Full historical data access',
      'Priority support',
      'API access',
      'Custom reports'
    ],
    limits: {
      portfolios: 'unlimited',
      historicalData: 'Full access',
      apiCalls: 10000,
      support: 'Priority support'
    },
    popular: true,
    badge: '2 months free'
  },
  {
    id: 'enterprise-monthly',
    name: 'Enterprise',
    description: 'Complete solution for institutional investors and large firms',
    price: 299,
    billingCycle: 'monthly',
    features: [
      'All Professional features',
      'Custom integrations',
      'API access with higher limits',
      'White-label options',
      'Regulatory reporting',
      'Dedicated account manager',
      'Custom risk models',
      'SLA guarantee',
      'On-premise deployment option'
    ],
    limits: {
      portfolios: 'unlimited',
      historicalData: 'Full access',
      apiCalls: 'unlimited',
      support: 'Dedicated support'
    }
  },
  {
    id: 'enterprise-yearly',
    name: 'Enterprise',
    description: 'Complete solution for institutional investors and large firms',
    price: 2990,
    billingCycle: 'yearly',
    features: [
      'All Professional features',
      'Custom integrations',
      'API access with higher limits',
      'White-label options',
      'Regulatory reporting',
      'Dedicated account manager',
      'Custom risk models',
      'SLA guarantee',
      'On-premise deployment option'
    ],
    limits: {
      portfolios: 'unlimited',
      historicalData: 'Full access',
      apiCalls: 'unlimited',
      support: 'Dedicated support'
    },
    badge: '2 months free'
  }
];

class SubscriptionService {
  private readonly STORAGE_KEYS = {
    USER_SUBSCRIPTION: 'user_subscription',
    PAYMENT_METHODS: 'payment_methods',
    BILLING_HISTORY: 'billing_history',
  };

  // Get all available subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return SUBSCRIPTION_PLANS;
  }

  // Get user's current subscription
  async getUserSubscription(): Promise<UserSubscription | null> {
    try {
      const subscription = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_SUBSCRIPTION);
      return subscription ? JSON.parse(subscription) : null;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  // Update user subscription
  async updateUserSubscription(subscription: UserSubscription): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.USER_SUBSCRIPTION,
        JSON.stringify(subscription)
      );
    } catch (error) {
      console.error('Error updating user subscription:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription();
      if (subscription && subscription.id === subscriptionId) {
        subscription.status = 'cancelled';
        subscription.autoRenew = false;
        await this.updateUserSubscription(subscription);
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Reactivate subscription
  async reactivateSubscription(subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription();
      if (subscription && subscription.id === subscriptionId) {
        subscription.status = 'active';
        subscription.autoRenew = true;
        await this.updateUserSubscription(subscription);
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  // Get payment methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const methods = await AsyncStorage.getItem(this.STORAGE_KEYS.PAYMENT_METHODS);
      return methods ? JSON.parse(methods) : [];
    } catch (error) {
      console.error('Error getting payment methods:', error);
      return [];
    }
  }

  // Add payment method
  async addPaymentMethod(method: PaymentMethod): Promise<void> {
    try {
      const methods = await this.getPaymentMethods();
      
      // If this is the first method or marked as default, make it default
      if (methods.length === 0 || method.isDefault) {
        methods.forEach(m => m.isDefault = false);
        method.isDefault = true;
      }
      
      methods.push(method);
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.PAYMENT_METHODS,
        JSON.stringify(methods)
      );
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  // Remove payment method
  async removePaymentMethod(methodId: string): Promise<void> {
    try {
      const methods = await this.getPaymentMethods();
      const filteredMethods = methods.filter(m => m.id !== methodId);
      
      // If removed method was default and there are other methods, make first one default
      const removedMethod = methods.find(m => m.id === methodId);
      if (removedMethod?.isDefault && filteredMethods.length > 0) {
        filteredMethods[0].isDefault = true;
      }
      
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.PAYMENT_METHODS,
        JSON.stringify(filteredMethods)
      );
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw error;
    }
  }

  // Set default payment method
  async setDefaultPaymentMethod(methodId: string): Promise<void> {
    try {
      const methods = await this.getPaymentMethods();
      methods.forEach(m => {
        m.isDefault = m.id === methodId;
      });
      
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.PAYMENT_METHODS,
        JSON.stringify(methods)
      );
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  // Get billing history
  async getBillingHistory(): Promise<BillingHistory[]> {
    try {
      const history = await AsyncStorage.getItem(this.STORAGE_KEYS.BILLING_HISTORY);
      return history ? JSON.parse(history) : this.getMockBillingHistory();
    } catch (error) {
      console.error('Error getting billing history:', error);
      return [];
    }
  }

  // Subscribe to a plan
  async subscribeToPlan(planId: string, paymentMethodId: string): Promise<UserSubscription> {
    try {
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      const paymentMethods = await this.getPaymentMethods();
      const paymentMethod = paymentMethods.find(m => m.id === paymentMethodId);
      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }

      // Create new subscription
      const startDate = new Date();
      const endDate = new Date();
      if (plan.billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const subscription: UserSubscription = {
        id: `sub_${Date.now()}`,
        userId: 'current_user', // This would come from auth context
        planId: plan.id,
        status: 'active',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        autoRenew: true,
        paymentMethod
      };

      await this.updateUserSubscription(subscription);
      
      // Add billing record
      await this.addBillingRecord({
        id: `bill_${Date.now()}`,
        date: startDate.toISOString(),
        amount: plan.price,
        description: `${plan.name} - ${plan.billingCycle}`,
        status: 'paid'
      });

      return subscription;
    } catch (error) {
      console.error('Error subscribing to plan:', error);
      throw error;
    }
  }

  // Change subscription plan
  async changePlan(newPlanId: string): Promise<UserSubscription> {
    try {
      const currentSubscription = await this.getUserSubscription();
      if (!currentSubscription) {
        throw new Error('No active subscription found');
      }

      const newPlan = SUBSCRIPTION_PLANS.find(p => p.id === newPlanId);
      if (!newPlan) {
        throw new Error('New plan not found');
      }

      // Update subscription
      currentSubscription.planId = newPlanId;
      await this.updateUserSubscription(currentSubscription);

      return currentSubscription;
    } catch (error) {
      console.error('Error changing plan:', error);
      throw error;
    }
  }

  // Add billing record
  private async addBillingRecord(record: BillingHistory): Promise<void> {
    try {
      const history = await this.getBillingHistory();
      history.unshift(record); // Add to beginning
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.BILLING_HISTORY,
        JSON.stringify(history.slice(0, 50)) // Keep only last 50 records
      );
    } catch (error) {
      console.error('Error adding billing record:', error);
    }
  }

  // Get mock billing history for demo
  private getMockBillingHistory(): BillingHistory[] {
    return [
      {
        id: 'bill_1',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 99,
        description: 'Professional - Monthly',
        status: 'paid',
        invoiceUrl: 'https://example.com/invoice/1'
      },
      {
        id: 'bill_2',
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 99,
        description: 'Professional - Monthly',
        status: 'paid',
        invoiceUrl: 'https://example.com/invoice/2'
      },
      {
        id: 'bill_3',
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 99,
        description: 'Professional - Monthly',
        status: 'paid',
        invoiceUrl: 'https://example.com/invoice/3'
      }
    ];
  }

  // Check if user has access to feature based on subscription
  async hasFeatureAccess(feature: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription();
      if (!subscription || subscription.status !== 'active') {
        return false; // No subscription or inactive
      }

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId);
      if (!plan) {
        return false;
      }

      // Feature access logic based on plan
      switch (feature) {
        case 'unlimited_portfolios':
          return plan.limits.portfolios === 'unlimited';
        case 'real_time_data':
          return plan.name !== 'Essential';
        case 'advanced_scenarios':
          return plan.name === 'Professional' || plan.name === 'Enterprise';
        case 'api_access':
          return plan.name === 'Professional' || plan.name === 'Enterprise';
        case 'custom_integrations':
          return plan.name === 'Enterprise';
        default:
          return true; // Basic features available to all
      }
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }
}

export default new SubscriptionService();

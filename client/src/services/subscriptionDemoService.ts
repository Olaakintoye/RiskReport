import subscriptionService, { UserSubscription, PaymentMethod } from './subscriptionService';

/**
 * Demo service to set up mock subscription data for demonstration purposes
 */
class SubscriptionDemoService {
  
  // Set up a demo Professional subscription
  async setupDemoProfessionalSubscription(): Promise<void> {
    try {
      // Create a demo payment method
      const demoPaymentMethod: PaymentMethod = {
        id: 'pm_demo_visa',
        type: 'card',
        lastFourDigits: '4242',
        expiryDate: '12/2026',
        brand: 'Visa',
        isDefault: true
      };

      await subscriptionService.addPaymentMethod(demoPaymentMethod);

      // Create a demo subscription
      const demoSubscription: UserSubscription = {
        id: 'sub_demo_professional',
        userId: 'demo_user',
        planId: 'professional-monthly',
        status: 'active',
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
        autoRenew: true,
        paymentMethod: demoPaymentMethod
      };

      await subscriptionService.updateUserSubscription(demoSubscription);
      
      console.log('Demo subscription data setup complete');
    } catch (error) {
      console.error('Error setting up demo subscription:', error);
    }
  }

  // Set up a demo Essential subscription
  async setupDemoEssentialSubscription(): Promise<void> {
    try {
      // Create a demo payment method
      const demoPaymentMethod: PaymentMethod = {
        id: 'pm_demo_mastercard',
        type: 'card',
        lastFourDigits: '8888',
        expiryDate: '03/2027',
        brand: 'Mastercard',
        isDefault: true
      };

      await subscriptionService.addPaymentMethod(demoPaymentMethod);

      // Create a demo subscription
      const demoSubscription: UserSubscription = {
        id: 'sub_demo_essential',
        userId: 'demo_user',
        planId: 'essential-yearly',
        status: 'active',
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        endDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000).toISOString(), // 275 days from now
        autoRenew: true,
        paymentMethod: demoPaymentMethod
      };

      await subscriptionService.updateUserSubscription(demoSubscription);
      
      console.log('Demo Essential subscription data setup complete');
    } catch (error) {
      console.error('Error setting up demo subscription:', error);
    }
  }

  // Set up a demo cancelled subscription
  async setupDemoCancelledSubscription(): Promise<void> {
    try {
      // Create a demo payment method
      const demoPaymentMethod: PaymentMethod = {
        id: 'pm_demo_amex',
        type: 'card',
        lastFourDigits: '1005',
        expiryDate: '09/2025',
        brand: 'Amex',
        isDefault: true
      };

      await subscriptionService.addPaymentMethod(demoPaymentMethod);

      // Create a demo subscription
      const demoSubscription: UserSubscription = {
        id: 'sub_demo_cancelled',
        userId: 'demo_user',
        planId: 'professional-monthly',
        status: 'cancelled',
        startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        autoRenew: false,
        paymentMethod: demoPaymentMethod
      };

      await subscriptionService.updateUserSubscription(demoSubscription);
      
      console.log('Demo cancelled subscription data setup complete');
    } catch (error) {
      console.error('Error setting up demo subscription:', error);
    }
  }

  // Set up multiple payment methods
  async setupDemoPaymentMethods(): Promise<void> {
    try {
      const paymentMethods: PaymentMethod[] = [
        {
          id: 'pm_demo_visa_primary',
          type: 'card',
          lastFourDigits: '4242',
          expiryDate: '12/2026',
          brand: 'Visa',
          isDefault: true
        },
        {
          id: 'pm_demo_mastercard_backup',
          type: 'card',
          lastFourDigits: '5555',
          expiryDate: '08/2025',
          brand: 'Mastercard',
          isDefault: false
        },
        {
          id: 'pm_demo_paypal',
          type: 'paypal',
          isDefault: false
        }
      ];

      for (const method of paymentMethods) {
        await subscriptionService.addPaymentMethod(method);
      }
      
      console.log('Demo payment methods setup complete');
    } catch (error) {
      console.error('Error setting up demo payment methods:', error);
    }
  }

  // Clear all demo data
  async clearDemoData(): Promise<void> {
    try {
      // This would typically clear AsyncStorage keys
      // For now, we'll just log
      console.log('Demo data cleared');
    } catch (error) {
      console.error('Error clearing demo data:', error);
    }
  }

  // Get subscription status summary for demo
  async getSubscriptionStatusSummary(): Promise<{
    hasActiveSubscription: boolean;
    planName: string | null;
    daysUntilRenewal: number | null;
    isTrialActive: boolean;
  }> {
    try {
      const subscription = await subscriptionService.getUserSubscription();
      
      if (!subscription) {
        return {
          hasActiveSubscription: false,
          planName: null,
          daysUntilRenewal: null,
          isTrialActive: false
        };
      }

      const plans = await subscriptionService.getSubscriptionPlans();
      const currentPlan = plans.find(plan => plan.id === subscription.planId);
      const endDate = new Date(subscription.endDate);
      const daysUntilRenewal = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      return {
        hasActiveSubscription: subscription.status === 'active',
        planName: currentPlan?.name || null,
        daysUntilRenewal: daysUntilRenewal > 0 ? daysUntilRenewal : null,
        isTrialActive: subscription.status === 'trial'
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return {
        hasActiveSubscription: false,
        planName: null,
        daysUntilRenewal: null,
        isTrialActive: false
      };
    }
  }
}

export default new SubscriptionDemoService();

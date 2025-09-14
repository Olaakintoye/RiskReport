import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentMethod } from '../../services/subscriptionService';

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod;
  onSetDefault?: () => void;
  onRemove?: () => void;
  showActions?: boolean;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethod,
  onSetDefault,
  onRemove,
  showActions = true
}) => {
  const getCardIcon = (type: string, brand?: string) => {
    if (type === 'card') {
      switch (brand?.toLowerCase()) {
        case 'visa':
          return 'card';
        case 'mastercard':
          return 'card';
        case 'amex':
          return 'card';
        default:
          return 'card';
      }
    } else if (type === 'paypal') {
      return 'logo-paypal';
    } else if (type === 'bank') {
      return 'business';
    }
    return 'card';
  };

  const getCardDisplay = () => {
    if (paymentMethod.type === 'card') {
      return `•••• •••• •••• ${paymentMethod.lastFourDigits}`;
    } else if (paymentMethod.type === 'paypal') {
      return 'PayPal Account';
    } else if (paymentMethod.type === 'bank') {
      return `Bank •••• ${paymentMethod.lastFourDigits}`;
    }
    return 'Payment Method';
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: onRemove
        }
      ]
    );
  };

  return (
    <View style={[styles.container, paymentMethod.isDefault && styles.defaultContainer]}>
      {/* Payment Method Info */}
      <View style={styles.infoContainer}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={getCardIcon(paymentMethod.type, paymentMethod.brand)} 
            size={24} 
            color={paymentMethod.isDefault ? "#10b981" : "#6b7280"} 
          />
        </View>
        
        <View style={styles.details}>
          <View style={styles.header}>
            <Text style={styles.cardNumber}>{getCardDisplay()}</Text>
            {paymentMethod.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          
          {paymentMethod.type === 'card' && paymentMethod.expiryDate && (
            <Text style={styles.expiry}>Expires {paymentMethod.expiryDate}</Text>
          )}
          
          {paymentMethod.brand && (
            <Text style={styles.brand}>{paymentMethod.brand.toUpperCase()}</Text>
          )}
        </View>
      </View>

      {/* Actions */}
      {showActions && (
        <View style={styles.actionsContainer}>
          {!paymentMethod.isDefault && onSetDefault && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onSetDefault}
            >
              <Text style={styles.actionButtonText}>Set Default</Text>
            </TouchableOpacity>
          )}
          
          {onRemove && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.removeButton]}
              onPress={handleRemove}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  defaultContainer: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  defaultBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  expiry: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  brand: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  removeButton: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
  },
});

export default PaymentMethodCard;

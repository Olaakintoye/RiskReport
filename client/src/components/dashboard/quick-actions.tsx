import { useToast } from "@/hooks/use-toast";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface QuickActionsProps {
  onDeposit: () => void;
  onWithdraw: () => void;
  onRedeem: () => void;
}

export default function QuickActions({ onDeposit, onWithdraw, onRedeem }: QuickActionsProps) {
  const { toast } = useToast();

  const handleAction = (action: string, callback: () => void) => {
    if (action === "deposit") {
      callback();
    } else {
      toast({
        title: "Feature coming soon",
        description: `The ${action} feature will be available in a future update.`,
        variant: "default",
      });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={() => handleAction("deposit", onDeposit)}
        style={styles.actionButton}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>+</Text>
        </View>
        <Text style={styles.actionText}>Deposit</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => handleAction("withdraw", onWithdraw)}
        style={styles.actionButton}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>→</Text>
        </View>
        <Text style={styles.actionText}>Withdraw</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => handleAction("redeem", onRedeem)}
        style={styles.actionButton}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>↻</Text>
        </View>
        <Text style={styles.actionText}>Redeem CD</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconText: {
    fontSize: 16,
    color: '#007AFF',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

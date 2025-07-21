import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { View, Text, StyleSheet } from "react-native";

interface PortfolioSummaryProps {
  userId: number;
}

interface PortfolioSummary {
  totalInvested: number;
  interestEarned: number;
}

export default function PortfolioSummary({ userId }: PortfolioSummaryProps) {
  const { data: summary, isLoading } = useQuery<PortfolioSummary>({
    queryKey: [`/api/users/${userId}/portfolio-summary`],
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingTitle} />
        <View style={styles.loadingAmount} />
        <View style={styles.loadingFooter} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Total Balance</Text>
        <Text style={styles.eyeIcon}>👁️</Text>
      </View>
      <Text style={styles.amount}>
        {formatCurrency(summary?.totalInvested || 0)}
      </Text>
      <View style={styles.footer}>
        <View style={styles.growthContainer}>
          <Text style={styles.growthText}>
            <Text style={styles.arrow}>↑</Text> 3.2% this month
          </Text>
        </View>
        <View>
          <Text style={styles.interestLabel}>Interest earned: </Text>
          <Text style={styles.interestAmount}>
            {formatCurrency(summary?.interestEarned || 0)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  eyeIcon: {
    color: 'white',
    fontSize: 16,
  },
  amount: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  growthContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  growthText: {
    color: 'white',
    fontSize: 12,
  },
  arrow: {
    fontSize: 12,
  },
  interestLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  interestAmount: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  loadingContainer: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  loadingTitle: {
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    width: '33%',
    marginBottom: 16,
  },
  loadingAmount: {
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    width: '66%',
    marginBottom: 16,
  },
  loadingFooter: {
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    width: '100%',
  },
});

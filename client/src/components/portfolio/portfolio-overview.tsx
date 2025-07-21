import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import ProgressBar from "@/components/ui/progress-bar";
import { View, Text, StyleSheet } from "react-native";

interface PortfolioOverviewProps {
  userId: number;
}

interface PortfolioSummary {
  totalValue: number;
  avgApy: number;
}

export default function PortfolioOverview({ userId }: PortfolioOverviewProps) {
  const { data: summary, isLoading } = useQuery<PortfolioSummary>({
    queryKey: [`/api/users/${userId}/portfolio-summary`],
  });
  
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.gridContainer}>
          <View style={styles.gridItem}>
            <View style={styles.skeletonText} />
            <View style={styles.skeletonValue} />
          </View>
          <View style={styles.gridItem}>
            <View style={styles.skeletonText} />
            <View style={styles.skeletonValue} />
          </View>
        </View>
        <View style={styles.divider}>
          <View style={styles.progressHeader}>
            <View style={styles.skeletonText} />
            <View style={styles.skeletonText} />
          </View>
          <View style={styles.skeletonProgressBar} />
          <View style={styles.progressFooter}>
            <View style={styles.skeletonText} />
            <View style={styles.skeletonText} />
          </View>
        </View>
      </View>
    );
  }
  
  if (!summary) {
    return null;
  }
  
  const performancePercentage = Math.min(100, (summary.avgApy / 5) * 100);
  
  return (
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Total Value</Text>
          <Text style={styles.value}>{formatCurrency(summary.totalValue)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Avg. APY</Text>
          <Text style={styles.value}>{formatPercentage(summary.avgApy)}</Text>
        </View>
      </View>
      <View style={styles.divider}>
        <View style={styles.progressHeader}>
          <Text style={styles.label}>Performance</Text>
          <Text style={styles.percentage}>{formatPercentage(performancePercentage)}</Text>
        </View>
        <ProgressBar progress={performancePercentage / 100} />
        <View style={styles.progressFooter}>
          <Text style={styles.footerText}>Based on average APY</Text>
          <Text style={styles.footerText}>Goal: 5%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridItem: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 4,
    width: 100,
  },
  skeletonValue: {
    height: 24,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    width: 140,
  },
  skeletonProgressBar: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    marginBottom: 8,
  },
});

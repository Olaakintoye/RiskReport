import { useQuery } from "@tanstack/react-query";
import DonutChart from "@/components/ui/donut-chart";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface AllocationChartProps {
  userId: number;
}

interface ChartSegment {
  value: number;
  color: string;
  label: string;
  percentage: number;
}

interface Investment {
  id: number;
  amount: number;
  type: string;
  // Add other investment properties as needed
}

export default function AllocationChart({ userId }: AllocationChartProps) {
  const { toast } = useToast();
  
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: [`/api/users/${userId}/active-investments`],
  });
  
  const handleRebalance = () => {
    toast({
      title: "Coming Soon",
      description: "Portfolio rebalancing will be available in a future update.",
      variant: "default",
    });
  };
  
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Investment Allocation</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartContent}>
            <View style={styles.chartLeft}>
              <View style={styles.skeletonChart} />
            </View>
            <View style={styles.chartRight}>
              {[...Array(4)].map((_, i) => (
                <View key={i} style={styles.skeletonItem} />
              ))}
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <View style={styles.skeletonButton} />
          </View>
        </View>
      </View>
    );
  }
  
  if (!investments || investments.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Investment Allocation</Text>
        <View style={styles.chartContainer}>
          <Text style={styles.emptyText}>No investments found</Text>
          <TouchableOpacity onPress={() => {/* Handle navigation to investment page */}} style={styles.button}>
            <Text style={styles.buttonText}>Start Investing</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Process investments data for the chart
  const segments: ChartSegment[] = [];
  let totalValue = 0;
  
  investments.forEach((inv: Investment) => {
    totalValue += inv.amount;
  });
  
  investments.forEach((inv: Investment) => {
    segments.push({
      value: inv.amount,
      color: getColorForType(inv.type),
      label: inv.type,
      percentage: (inv.amount / totalValue) * 100,
    });
  });
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Investment Allocation</Text>
      <View style={styles.chartContainer}>
        <View style={styles.chartContent}>
          <View style={styles.chartLeft}>
            <DonutChart 
              segments={segments.map(s => ({ value: s.value, color: s.color }))}
              total={totalValue}
              size={140}
            />
          </View>
          <View style={styles.chartRight}>
            {segments.map((segment, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: segment.color }]} />
                <Text style={styles.legendLabel}>{segment.label}</Text>
                <Text style={styles.legendPercentage}>{segment.percentage.toFixed(2)}%</Text>
              </View>
            ))}
          </View>
        </View>
        <TouchableOpacity onPress={handleRebalance} style={styles.button}>
          <Text style={styles.buttonText}>Rebalance Portfolio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getColorForType(type: string): string {
  // Add your color mapping logic here
  return '#10b981'; // Default color
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chartContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chartLeft: {
    width: '50%',
    paddingRight: 8,
    alignItems: 'center',
  },
  chartRight: {
    width: '50%',
    paddingLeft: 8,
  },
  skeletonChart: {
    width: 128,
    height: 128,
    backgroundColor: '#e5e7eb',
    borderRadius: 64,
  },
  skeletonItem: {
    height: 24,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  skeletonButton: {
    height: 32,
    width: 160,
    backgroundColor: '#e5e7eb',
    borderRadius: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  legendPercentage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});

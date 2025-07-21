import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import CDCard from "@/components/ui/cd-card";

interface Bank {
  id: number;
  name: string;
  rating: number;
  fdic_insured: boolean;
  logo_type: string;
  color: string;
}

interface CDProduct {
  id: number;
  bankId: number;
  name: string;
  termMonths: number;
  apy: number;
  minimumDeposit: number;
  earlyWithdrawalPenalty: string;
  description?: string;
}

interface Investment {
  id: number;
  amount: number;
  startDate: string;
  maturityDate: string;
  interestEarned: number;
  status: string;
  cdProduct?: CDProduct;
  bank?: Bank;
}

interface ActiveInvestmentsProps {
  userId: number;
  limit?: number;
}

export default function ActiveInvestments({ userId, limit }: ActiveInvestmentsProps) {
  const navigation = useNavigation();
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: [`/api/users/${userId}/active-investments`],
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Active Investments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Rank' as never)}>
            <Text style={styles.link}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          {[...Array(2)].map((_, i) => (
            <View key={i} style={styles.loadingCard}>
              <View style={styles.loadingHeader}>
                <View style={styles.loadingLeft}>
                  <View style={styles.loadingIcon} />
                  <View>
                    <View style={styles.loadingText} />
                    <View style={styles.loadingSubtext} />
                  </View>
                </View>
                <View style={styles.loadingRight}>
                  <View style={styles.loadingText} />
                  <View style={styles.loadingSubtext} />
                </View>
              </View>
              <View style={styles.loadingProgress} />
              <View style={styles.loadingFooter}>
                <View style={styles.loadingText} />
                <View style={styles.loadingText} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const displayInvestments = limit && investments ? investments.slice(0, limit) : investments;

  if (!displayInvestments || displayInvestments.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Active Investments</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>You have no active investments.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Marketplace' as never)}>
            <Text style={styles.marketplaceLink}>Browse the Marketplace</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Active Investments</Text>
        {investments && investments.length > (limit || 0) && (
          <TouchableOpacity onPress={() => navigation.navigate('Rank' as never)}>
            <Text style={styles.link}>See All</Text>
          </TouchableOpacity>
        )}
      </View>

      {displayInvestments.map((investment) => (
        <CDCard 
          key={investment.id} 
          investment={investment} 
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    gap: 12,
  },
  loadingCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 16,
  },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  loadingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingRight: {
    alignItems: 'flex-end',
  },
  loadingIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginRight: 12,
  },
  loadingText: {
    height: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    marginBottom: 8,
    width: 100,
  },
  loadingSubtext: {
    height: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    width: 80,
  },
  loadingProgress: {
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    marginBottom: 16,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyState: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  marketplaceLink: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

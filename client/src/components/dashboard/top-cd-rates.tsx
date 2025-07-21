import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { formatCurrency, formatPercentage } from "@/lib/utils";

interface Bank {
  name: string;
}

interface CDProduct {
  id: number;
  bank: Bank;
  termMonths: number;
  apy: number;
  minimumDeposit: number;
}

export default function TopCDRates() {
  const navigation = useNavigation();
  const { data: topCDs, isLoading } = useQuery<CDProduct[]>({
    queryKey: ['/api/cd-products/top'],
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Top CD Rates Today</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Marketplace' as never)}>
            <Text style={styles.marketplaceLink}>Marketplace</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingCard}>
          <View style={styles.loadingHeader}>
            <View style={styles.loadingRow}>
              <View style={styles.loadingCell} />
              <View style={styles.loadingCell} />
              <View style={styles.loadingCell} />
              <View style={styles.loadingCell} />
            </View>
          </View>
          <View style={styles.loadingBody}>
            {[...Array(3)].map((_, i) => (
              <View key={i} style={styles.loadingRow}>
                <View style={styles.loadingCell} />
                <View style={styles.loadingCell} />
                <View style={styles.loadingCell} />
                <View style={styles.loadingCell} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (!topCDs || topCDs.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Top CD Rates Today</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Marketplace' as never)}>
          <Text style={styles.marketplaceLink}>Marketplace</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={styles.headerCell}>Bank</Text>
          <Text style={styles.headerCell}>Term</Text>
          <Text style={styles.headerCell}>APY</Text>
          <Text style={styles.headerCell}>Min. Deposit</Text>
        </View>
        <View style={styles.tableBody}>
          {topCDs.map((cd, index) => (
            <View 
              key={cd.id} 
              style={[
                styles.tableRow,
                index < topCDs.length - 1 && styles.borderBottom
              ]}
            >
              <Text style={styles.cell}>{cd.bank.name}</Text>
              <Text style={styles.cell}>{cd.termMonths} Mo</Text>
              <Text style={[styles.cell, styles.successText]}>{formatPercentage(cd.apy)}</Text>
              <Text style={styles.cell}>{formatCurrency(cd.minimumDeposit)}</Text>
            </View>
          ))}
        </View>
      </View>
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
  marketplaceLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  loadingCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  loadingHeader: {
    backgroundColor: '#F2F2F7',
    padding: 12,
  },
  loadingBody: {
    padding: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  loadingCell: {
    height: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    width: '20%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    padding: 12,
  },
  headerCell: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'left',
  },
  tableBody: {
    padding: 12,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  cell: {
    flex: 1,
    fontSize: 14,
    textAlign: 'left',
  },
  successText: {
    color: '#34C759',
    fontWeight: '500',
  },
});

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatPercentage } from "@/lib/utils";
import { User, Investment } from "@/lib/queryClient";

import PortfolioOverview from "@/components/portfolio/portfolio-overview";
import AllocationChart from "@/components/portfolio/allocation-chart";
import CDCard from "@/components/ui/cd-card";
import SP500PortfolioWizard from "./portfolio/SP500PortfolioWizard";

export default function Portfolio() {
  const navigation = useNavigation();
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showSP500Wizard, setShowSP500Wizard] = useState(false);
  const { toast } = useToast();
  
  // Get current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/current-user'],
  });
  
  const userId = currentUser?.id || 1; // Default to ID 1 for demo
  
  // Get user's active investments
  const { data: investments, isLoading, refetch } = useQuery<Investment[]>({
    queryKey: [`/api/users/${userId}/active-investments`],
    enabled: !!userId,
  });
  
  // Refresh investments when returning from wizard
  useEffect(() => {
    if (!showSP500Wizard) {
      console.log('Portfolio wizard closed, refreshing investments');
      refetch();
    }
  }, [showSP500Wizard, refetch]);
  
  const handleViewDetails = (investment: Investment) => {
    setSelectedInvestment(investment);
    setShowDetailsDialog(true);
  };
  
  const handleViewStatements = () => {
    toast({
      title: "Statements",
      description: "Statements feature will be available in a future update.",
    });
  };
  
  const handleRedeem = () => {
    toast({
      title: "Redeem CD",
      description: "CD redemption feature will be available in a future update.",
    });
  };
  
  const handleOpenSP500Wizard = () => {
    console.log('Opening SP500 Portfolio Wizard');
    setShowSP500Wizard(true);
  };

  const handleCloseSP500Wizard = () => {
    console.log('Closing SP500 Portfolio Wizard');
    setShowSP500Wizard(false);
  };

  // Render the main portfolio content or the wizard
  return (
    <>
      {showSP500Wizard ? (
        <SP500PortfolioWizard onBackToPortfolios={handleCloseSP500Wizard} />
      ) : (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Portfolio</Text>
          <Text style={styles.subtitle}>Manage your investments</Text>
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => {
            toast({
              title: "Menu",
              description: "Menu feature will be available in a future update.",
            });
          }}
        >
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>
      </View>
      
      <PortfolioOverview userId={userId} />
      
      <AllocationChart userId={userId} />
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Investments</Text>
              <View style={styles.sectionActions}>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleOpenSP500Wizard}
                >
                  <Text style={styles.createButtonText}>+ S&P 500 Portfolio</Text>
                </TouchableOpacity>
          <TouchableOpacity 
                  style={styles.filterButton}
            onPress={() => {
              toast({
                title: "Filter",
                description: "Filtering feature will be available in a future update.",
              });
            }}
          >
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
              </View>
        </View>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            {[...Array(3)].map((_, i) => (
              <View key={i} style={styles.loadingCard}>
                <View style={styles.loadingHeader}>
                  <View style={styles.loadingIcon} />
                  <View>
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
        ) : investments && investments.length > 0 ? (
          <View>
            {investments.map((investment: Investment) => (
              <CDCard 
                key={investment.id} 
                investment={investment}
                showActions={true}
                onViewDetails={() => handleViewDetails(investment)}
                onViewStatements={handleViewStatements}
                onRedeem={handleRedeem}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              You don't have any active investments yet.
            </Text>
            <Button
              style={styles.browseButton}
              onPress={() => navigation.navigate('Marketplace' as never)}
            >
              Browse CD Options
            </Button>
          </View>
        )}
      </View>
      
      {/* Investment Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Investment Details</DialogTitle>
          </DialogHeader>
          {selectedInvestment && (
            <View style={styles.dialogContent}>
              <View style={styles.investmentHeader}>
                <View style={[styles.bankIcon, { backgroundColor: selectedInvestment.cdProduct?.bank?.color || '#007AFF' }]}>
                  <Text style={styles.bankIconText}>🏦</Text>
                </View>
                <View>
                  <Text style={styles.bankName}>{selectedInvestment.cdProduct?.bank?.name}</Text>
                  <Text style={styles.cdName}>{selectedInvestment.cdProduct?.name}</Text>
                </View>
              </View>
              
              <View style={styles.investmentDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Principal Amount</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedInvestment.amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Interest Rate</Text>
                  <Text style={[styles.detailValue, styles.successText]}>
                    {formatPercentage(selectedInvestment.cdProduct?.apy)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Start Date</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedInvestment.startDate)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Maturity Date</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedInvestment.maturityDate)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Interest Earned</Text>
                  <Text style={[styles.detailValue, styles.successText]}>
                    {formatCurrency(selectedInvestment.interestEarned)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{selectedInvestment.status}</Text>
                </View>
              </View>
              
              <View style={styles.maturityOptions}>
                <Text style={styles.maturityOptionsTitle}>Maturity Options</Text>
                <Text style={styles.maturityOptionsText}>
                  At maturity, you can choose to withdraw funds, renew at the current rate, or roll over into a new CD. 
                  Set your preference up to 30 days before maturity date.
                </Text>
              </View>
              
              <View style={styles.dialogActions}>
                <Button
                  variant="outline"
                  style={styles.actionButton}
                  onPress={handleRedeem}
                >
                  Redeem Early
                </Button>
                <Button
                  style={styles.actionButton}
                  onPress={() => setShowDetailsDialog(false)}
                >
                  Close
                </Button>
              </View>
            </View>
          )}
        </DialogContent>
      </Dialog>
    </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  menuButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  filterButton: {
    paddingVertical: 6,
  },
  filterText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  loadingContainer: {
    marginTop: 8,
  },
  loadingCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  loadingHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  loadingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
    marginRight: 12,
  },
  loadingText: {
    height: 12,
    width: 120,
    backgroundColor: '#E5E5EA',
    borderRadius: 6,
    marginBottom: 8,
  },
  loadingSubtext: {
    height: 8,
    width: 80,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
  },
  loadingProgress: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginBottom: 16,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
  },
  browseButton: {
    backgroundColor: '#007AFF',
  },
  dialogContent: {
    padding: 16,
  },
  investmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bankIconText: {
    fontSize: 16,
  },
  bankName: {
    fontSize: 14,
    color: '#666',
  },
  cdName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  investmentDetails: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#666',
  },
  detailValue: {
    fontWeight: '600',
  },
  successText: {
    color: '#34C759',
  },
  maturityOptions: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  maturityOptionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  maturityOptionsText: {
    color: '#666',
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

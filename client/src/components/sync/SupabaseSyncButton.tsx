/**
 * Supabase Sync Button Component
 * 
 * Allows users to manually sync their portfolios to Supabase
 * Shows sync status and diagnostics
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { syncAllPortfoliosToSupabase, checkPortfolioSync } from '../../services/supabaseSync';
import portfolioService from '../../services/portfolioService';

interface SyncStatus {
  total: number;
  synced: number;
  failed: number;
  portfolios: Array<{
    name: string;
    status: 'synced' | 'failed' | 'checking';
    positionsCount?: number;
    error?: string;
  }>;
}

export default function SupabaseSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(null);

    try {
      console.log('🔄 Starting manual portfolio sync...');
      
      // Get all portfolios from AsyncStorage
      const portfolios = await portfolioService.getAllPortfolios();
      
      const status: SyncStatus = {
        total: portfolios.length,
        synced: 0,
        failed: 0,
        portfolios: portfolios.map(p => ({
          name: p.name,
          status: 'checking' as const
        }))
      };

      setSyncStatus(status);

      // Sync all portfolios
      const result = await syncAllPortfoliosToSupabase();

      // Check each portfolio's sync status
      const fullPortfolios = await portfolioService.getPortfoliosWithPrices();
      for (let i = 0; i < fullPortfolios.length; i++) {
        const portfolio = fullPortfolios[i];
        const syncCheck = await checkPortfolioSync(portfolio.id);
        
        status.portfolios[i] = {
          name: portfolio.name,
          status: syncCheck.existsInSupabase ? 'synced' : 'failed',
          positionsCount: syncCheck.positionsCount,
          error: syncCheck.existsInSupabase ? undefined : 'Not found in database'
        };
      }

      status.synced = result.synced;
      status.failed = result.failed;

      setSyncStatus(status);

      if (result.failed === 0) {
        Alert.alert(
          'Sync Complete! ✅',
          `Successfully synced ${result.synced} portfolio(s) to Supabase.\n\nYou can now run VaR analysis!`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sync Issues ⚠️',
          `Synced: ${result.synced}\nFailed: ${result.failed}\n\nErrors:\n${result.errors.join('\n')}`,
          [{ text: 'OK' }]
        );
      }

    } catch (error: any) {
      console.error('Sync error:', error);
      Alert.alert('Sync Failed', error.message || 'Failed to sync portfolios');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
        onPress={handleSync}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
        )}
        <Text style={styles.syncButtonText}>
          {syncing ? 'Syncing...' : 'Sync to Supabase'}
        </Text>
      </TouchableOpacity>

      {syncStatus && (
        <View style={styles.statusContainer}>
          <TouchableOpacity
            style={styles.statusHeader}
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={styles.statusText}>
              📊 {syncStatus.synced}/{syncStatus.total} synced
              {syncStatus.failed > 0 && ` (${syncStatus.failed} failed)`}
            </Text>
            <Ionicons 
              name={showDetails ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>

          {showDetails && (
            <View style={styles.detailsContainer}>
              {syncStatus.portfolios.map((portfolio, idx) => (
                <View key={idx} style={styles.portfolioRow}>
                  <Ionicons 
                    name={portfolio.status === 'synced' ? 'checkmark-circle' : 
                          portfolio.status === 'failed' ? 'close-circle' : 
                          'time-outline'}
                    size={16}
                    color={portfolio.status === 'synced' ? '#4CAF50' : 
                           portfolio.status === 'failed' ? '#F44336' : 
                           '#FFA726'}
                  />
                  <View style={styles.portfolioInfo}>
                    <Text style={styles.portfolioName}>{portfolio.name}</Text>
                    {portfolio.positionsCount !== undefined && (
                      <Text style={styles.portfolioDetails}>
                        {portfolio.positionsCount} position{portfolio.positionsCount !== 1 ? 's' : ''}
                      </Text>
                    )}
                    {portfolio.error && (
                      <Text style={styles.errorText}>{portfolio.error}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  detailsContainer: {
    padding: 12,
    paddingTop: 0,
    gap: 8,
  },
  portfolioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  portfolioInfo: {
    flex: 1,
  },
  portfolioName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  portfolioDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 2,
  },
});


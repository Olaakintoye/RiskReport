import { useApi } from './useApi';
import { getTransactions, createTransaction } from '@/lib/api';
import { Database } from '@/types/database';

type Transaction = Database['public']['Tables']['transactions']['Row'];

export function useTransactions(investmentId: string) {
  return useApi(() => getTransactions(investmentId));
}

export function useCreateTransaction() {
  return useApi(createTransaction);
}

export function useTransactionManagement(investmentId: string) {
  const transactions = useTransactions(investmentId);
  const create = useCreateTransaction();

  return {
    transactions: transactions.data || [],
    isLoading: transactions.isLoading || create.isLoading,
    error: transactions.error || create.error,
    createTransaction: create.execute,
    refreshTransactions: transactions.execute,
  };
} 
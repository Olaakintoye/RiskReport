import { useApi } from './useApi';
import { getInvestments, createInvestment, updateInvestment } from '@/lib/api';
import { Database } from '@/types/database';

type Investment = Database['public']['Tables']['investments']['Row'];

export function useInvestments(userId: string) {
  return useApi(() => getInvestments(userId));
}

export function useCreateInvestment() {
  return useApi(createInvestment);
}

export function useUpdateInvestment() {
  return useApi(updateInvestment);
}

export function useInvestmentManagement(userId: string) {
  const investments = useInvestments(userId);
  const create = useCreateInvestment();
  const update = useUpdateInvestment();

  return {
    investments: investments.data || [],
    isLoading: investments.isLoading || create.isLoading || update.isLoading,
    error: investments.error || create.error || update.error,
    createInvestment: create.execute,
    updateInvestment: update.execute,
    refreshInvestments: investments.execute,
  };
} 
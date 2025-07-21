import { useState, useCallback } from 'react';
import { PostgrestError } from '@supabase/supabase-js';

type ApiFunction<T, Args extends any[]> = (...args: Args) => Promise<T>;

export function useApi<T, Args extends any[]>(
  apiFunction: ApiFunction<T, Args>
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (...args: Args) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await apiFunction(...args);
        setData(result);
        return result;
      } catch (err) {
        const apiError = err as PostgrestError;
        setError(apiError);
        throw apiError;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFunction]
  );

  return {
    data,
    error,
    isLoading,
    execute,
  };
} 
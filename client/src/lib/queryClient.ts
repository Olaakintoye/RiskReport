import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Add type definitions for our API responses
export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Bank {
  id: number;
  name: string;
  rating: number;
  fdic_insured: boolean;
  logo_type: string;
  color: string;
}

export interface CDProduct {
  id: number;
  bankId: number;
  name: string;
  termMonths: number;
  apy: number;
  minimumDeposit: number;
  earlyWithdrawalPenalty: string;
  description?: string;
  isFeatured: boolean;
  bank?: Bank;
}

export interface Investment {
  id: number;
  userId: number;
  cdProductId: number;
  amount: number;
  startDate: string;
  maturityDate: string;
  interestEarned: number;
  status: string;
  cdProduct?: CDProduct;
}

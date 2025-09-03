import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import API_BASE from '../config/api';

// Create a shared axios instance for the app
const http: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

let apiBaseLogged = false;
http.interceptors.request.use((config) => {
  if (!apiBaseLogged) {
    // Log the resolved API base once per session for easier debugging
    console.log('Resolved API_BASE (axios):', API_BASE);
    apiBaseLogged = true;
  }
  return config;
});

export async function healthCheck(timeoutMs: number = 5000) {
  return http.get('/api/status', { timeout: timeoutMs, headers: { 'Accept': 'application/json' } });
}

function isTransientNetworkError(error: any): boolean {
  const axiosErr = error as AxiosError;
  if (!axiosErr || !axiosErr.code) return false;
  return (
    axiosErr.code === 'ECONNABORTED' || // timeout
    axiosErr.code === 'ERR_NETWORK'
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function postWithRetry<T = any>(
  url: string,
  data?: any,
  options?: { timeout?: number; retries?: number; retryDelayBase?: number; config?: AxiosRequestConfig }
): Promise<T> {
  const timeout = options?.timeout ?? 120000;
  const retries = Math.max(0, options?.retries ?? 2);
  const retryDelayBase = options?.retryDelayBase ?? 300; // ms
  const config = options?.config ?? {};

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const resp = await http.post(url, data, { timeout, ...config });
      return resp.data as T;
    } catch (err: any) {
      const shouldRetry = attempt < retries && isTransientNetworkError(err);
      if (!shouldRetry) throw err;
      const delay = retryDelayBase * Math.pow(2, attempt); // exponential backoff: 300ms, 600ms, 1200ms
      console.log(`Network error on ${url}. Retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(delay);
      attempt += 1;
    }
  }
}

export default http;



// Centralized API base URL resolution for mobile and web
// Priority: EXPO_PUBLIC_API_BASE env → app.json extra.apiBase → derive from packager host → localhost fallback

import { Platform } from 'react-native';
import Constants from 'expo-constants';

function deriveFromDebuggerHost(): string | null {
  try {
    const host = (Constants as any)?.debuggerHost || (Constants as any)?.expoConfig?.hostUri;
    if (typeof host === 'string' && host.length > 0) {
      // host may be like "192.168.1.100:19000" or "localhost:19000"
      const ip = host.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:3001`;
      }
    }
  } catch {}
  return null;
}

function deriveFromDebuggerHostForPort(port: number): string | null {
  try {
    const host = (Constants as any)?.debuggerHost || (Constants as any)?.expoConfig?.hostUri;
    if (typeof host === 'string' && host.length > 0) {
      const ip = host.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:${port}`;
      }
    }
  } catch {}
  return null;
}

function fromExtra(): string | null {
  try {
    const extra = (Constants as any)?.expoConfig?.extra || (Constants as any)?.manifest?.extra;
    if (extra?.apiBase && typeof extra.apiBase === 'string') return extra.apiBase;
  } catch {}
  return null;
}

function stressFromExtra(): string | null {
  try {
    const extra = (Constants as any)?.expoConfig?.extra || (Constants as any)?.manifest?.extra;
    if (extra?.stressBase && typeof extra.stressBase === 'string') return extra.stressBase;
  } catch {}
  return null;
}

const envBase = process.env.EXPO_PUBLIC_API_BASE || process.env.API_BASE;
const derivedBase = deriveFromDebuggerHost();
const extraBase = fromExtra();

// Prefer the live packager host IP over a possibly stale app.json extra.apiBase
export const API_BASE: string =
  (envBase as string) ||
  (derivedBase as string) ||
  (extraBase as string) ||
  (Platform.select({ web: 'http://localhost:3001', default: 'http://localhost:3001' }) as string);

// Dedicated base for the Stress Test server (runs on port 3000)
const envStressBase = process.env.EXPO_PUBLIC_STRESS_BASE || process.env.STRESS_BASE;
const derivedStressBase = deriveFromDebuggerHostForPort(3000);
const extraStressBase = stressFromExtra();

export const STRESS_BASE: string =
  (envStressBase as string) ||
  (derivedStressBase as string) ||
  (extraStressBase as string) ||
  (Platform.select({ web: 'http://localhost:3000', default: 'http://localhost:3000' }) as string);

export default API_BASE;



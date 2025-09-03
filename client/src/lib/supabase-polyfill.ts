// Polyfills for Supabase React Native compatibility

declare global {
  var stripTrailingSlash: ((url: string) => string) | undefined;
  var helpers_1: { stripTrailingSlash: (url: string) => string } | undefined;
  interface Window {
    helpers_1?: { stripTrailingSlash: (url: string) => string };
  }
}

// Add missing stripTrailingSlash function to global helpers
if (typeof global !== 'undefined' && !(global as any).stripTrailingSlash) {
  (global as any).stripTrailingSlash = (url: string): string => {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  };
}

// Polyfill for helpers module
if (typeof global !== 'undefined' && typeof window !== 'undefined') {
  const helpers = {
    stripTrailingSlash: (url: string): string => {
      return url.endsWith('/') ? url.slice(0, -1) : url;
    }
  };
  
  // Add to global scope for CommonJS modules
  if (!(global as any).helpers_1) {
    (global as any).helpers_1 = helpers;
  }
  
  // Add to window for browser-like environments
  if (!window.helpers_1) {
    window.helpers_1 = helpers;
  }
}

export {};

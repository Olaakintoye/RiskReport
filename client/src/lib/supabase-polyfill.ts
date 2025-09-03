// Polyfills for Supabase React Native compatibility

// Add missing stripTrailingSlash function to global helpers
if (typeof global !== 'undefined' && !global.stripTrailingSlash) {
  global.stripTrailingSlash = (url: string): string => {
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
  if (!global.helpers_1) {
    global.helpers_1 = helpers;
  }
  
  // Add to window for browser-like environments
  if (!window.helpers_1) {
    (window as any).helpers_1 = helpers;
  }
}

export {};

// Authentication Configuration
export const AUTH_CONFIG = {
  // Google OAuth Configuration
  google: {
    // These will be configured in Supabase dashboard
    clientId: {
      ios: 'your-ios-client-id.googleusercontent.com',
      android: 'your-android-client-id.googleusercontent.com',
      web: 'your-web-client-id.googleusercontent.com',
    },
    // Redirect URLs for OAuth flow
    redirectUrls: {
      development: 'com.riskreport.app://auth/callback',
      production: 'com.riskreport.app://auth/callback',
    },
  },
  
  // Supabase Configuration
  supabase: {
    // Site URL for redirects
    siteUrl: 'https://your-app-domain.com',
    // Additional redirect URLs
    additionalRedirectUrls: [
      'com.riskreport.app://auth/callback',
      'exp://localhost:19000/--/auth/callback', // For Expo development
    ],
  },
  
  // Password Requirements
  password: {
    minLength: 6,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
  },
  
  // Session Configuration
  session: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
};

// Helper function to get the appropriate redirect URL
export const getRedirectUrl = () => {
  if (__DEV__) {
    return AUTH_CONFIG.google.redirectUrls.development;
  }
  return AUTH_CONFIG.google.redirectUrls.production;
};

// Helper function to validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to validate password strength
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < AUTH_CONFIG.password.minLength) {
    errors.push(`Password must be at least ${AUTH_CONFIG.password.minLength} characters long`);
  }
  
  if (AUTH_CONFIG.password.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (AUTH_CONFIG.password.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (AUTH_CONFIG.password.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (AUTH_CONFIG.password.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}; 
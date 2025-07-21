# Risk Report - Onboarding & Authentication Setup Guide

## 🎯 Overview

This guide covers the complete setup of the modern onboarding system for the Risk Report application, including:

- **Slideshow Introduction**: 5-slide presentation explaining the app's features
- **Authentication Flow**: Sign up, sign in, forgot password, and Google OAuth
- **Supabase Integration**: Complete backend authentication setup
- **Google OAuth Configuration**: Step-by-step Google Cloud setup

## 🚀 Features Implemented

### ✅ Onboarding Slideshow
- **5 Professional Slides** with gradient backgrounds and animations
- **Smooth Transitions** with haptic feedback
- **Skip Functionality** for returning users
- **Responsive Design** for all screen sizes
- **Feature Highlights** for each app capability

### ✅ Authentication System
- **Sign Up** with email verification
- **Sign In** with error handling
- **Forgot Password** with email reset
- **Google OAuth** integration
- **Form Validation** with real-time feedback
- **Password Visibility Toggle**
- **Modern UI** with glassmorphism effects

### ✅ Backend Integration
- **Supabase Authentication** fully configured
- **User Session Management** with AsyncStorage
- **Automatic State Synchronization**
- **Error Handling** with user-friendly messages

## 📱 User Experience Flow

```
App Launch
    ↓
First Time User?
    ↓ YES                    ↓ NO
Slideshow (5 slides)    →   Authentication Screen
    ↓                           ↓
Authentication Screen       Already Signed In?
    ↓                           ↓ YES
Sign Up/Sign In/Google      →   Main App
    ↓
Email Verification (if sign up)
    ↓
Main App Dashboard
```

## 🛠 Setup Instructions

### 1. Supabase Configuration

#### A. Enable Authentication Providers

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Providers**
3. Enable the following providers:
   - ✅ Email (already enabled)
   - ✅ Google OAuth

#### B. Configure Site URL and Redirect URLs

1. Go to **Authentication > URL Configuration**
2. Set **Site URL**: `https://your-domain.com` (or your production URL)
3. Add **Redirect URLs**:
   ```
   com.riskreport.app://auth/callback
   exp://localhost:19000/--/auth/callback
   https://your-domain.com/auth/callback
   ```

### 2. Google OAuth Setup

#### A. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API** and **Google Identity API**

#### B. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type
3. Fill in required information:
   - **App name**: Risk Report
   - **User support email**: your-email@domain.com
   - **Developer contact**: your-email@domain.com
   - **App domain**: your-domain.com
   - **Privacy policy**: https://your-domain.com/privacy
   - **Terms of service**: https://your-domain.com/terms

#### C. Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Create credentials for each platform:

**Web Application:**
```
Name: Risk Report Web
Authorized redirect URIs:
- https://qkrdpqkrywjaiahexnwk.supabase.co/auth/v1/callback
```

**iOS Application:**
```
Name: Risk Report iOS
Bundle ID: com.riskreport.app
```

**Android Application:**
```
Name: Risk Report Android
Package name: com.riskreport.app
SHA-1 certificate fingerprint: [Your SHA-1 fingerprint]
```

#### D. Configure Supabase with Google Credentials

1. In Supabase Dashboard, go to **Authentication > Providers > Google**
2. Enable Google provider
3. Add your Google OAuth credentials:
   - **Client ID**: Your web client ID from Google Cloud
   - **Client Secret**: Your web client secret from Google Cloud

### 3. Update Configuration Files

#### A. Update `client/src/config/auth.ts`

```typescript
export const AUTH_CONFIG = {
  google: {
    clientId: {
      ios: 'your-ios-client-id.googleusercontent.com',
      android: 'your-android-client-id.googleusercontent.com',
      web: 'your-web-client-id.googleusercontent.com',
    },
    redirectUrls: {
      development: 'com.riskreport.app://auth/callback',
      production: 'com.riskreport.app://auth/callback',
    },
  },
  // ... rest of config
};
```

#### B. Update `app.json` for Expo

```json
{
  "expo": {
    "scheme": "com.riskreport.app",
    "ios": {
      "bundleIdentifier": "com.riskreport.app",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "package": "com.riskreport.app",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

### 4. Install Required Dependencies

```bash
cd client
npm install expo-linear-gradient --legacy-peer-deps
npm install @react-native-async-storage/async-storage
npm install expo-haptics
```

### 5. Database Setup

#### A. User Profiles Table

The following table should be created in Supabase:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'fullName');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## 🎨 Design Features

### Visual Elements
- **Gradient Backgrounds**: Modern gradient combinations for each slide
- **Glassmorphism**: Semi-transparent containers with blur effects
- **Smooth Animations**: Fade, scale, and slide transitions
- **Haptic Feedback**: Tactile responses for all interactions
- **Professional Icons**: Ionicons for consistent iconography

### User Experience
- **Progressive Disclosure**: Information revealed step by step
- **Clear Navigation**: Intuitive flow between screens
- **Error Handling**: Friendly error messages with solutions
- **Loading States**: Visual feedback during async operations
- **Accessibility**: Screen reader support and proper contrast

## 🔧 Customization Options

### Slideshow Content
Edit `client/src/components/onboarding/OnboardingSlideshow.tsx`:
- Modify slide content in the `slides` array
- Change gradient colors
- Update feature lists
- Customize animations

### Authentication Flow
Edit `client/src/components/onboarding/AuthenticationScreen.tsx`:
- Modify form validation rules
- Update error messages
- Customize UI colors and styling
- Add additional OAuth providers

### Branding
- Update app name and descriptions
- Change color schemes in gradients
- Replace icons with custom ones
- Modify typography and spacing

## 🚨 Security Considerations

### Password Security
- Minimum 6 characters (configurable)
- Optional complexity requirements
- Secure transmission via HTTPS
- Hashed storage in Supabase

### OAuth Security
- Secure redirect URLs
- State parameter validation
- Token expiration handling
- Proper scope limitations

### Session Management
- Automatic token refresh
- Secure storage in AsyncStorage
- Session timeout handling
- Logout functionality

## 📱 Testing Checklist

### Onboarding Flow
- [ ] Slideshow displays correctly on all screen sizes
- [ ] Skip button works properly
- [ ] Animations are smooth
- [ ] Haptic feedback works on device
- [ ] Navigation between slides is intuitive

### Authentication
- [ ] Sign up creates new user account
- [ ] Email verification works
- [ ] Sign in with valid credentials
- [ ] Error handling for invalid credentials
- [ ] Forgot password sends reset email
- [ ] Google OAuth redirects properly
- [ ] Session persistence works
- [ ] Logout clears session

### Integration
- [ ] Supabase connection established
- [ ] User data syncs properly
- [ ] Navigation to main app works
- [ ] Returning user experience
- [ ] Offline handling (graceful degradation)

## 🐛 Troubleshooting

### Common Issues

**Google OAuth not working:**
- Check redirect URLs match exactly
- Verify Google Cloud project configuration
- Ensure Supabase Google provider is enabled
- Check client ID/secret are correct

**Slideshow not displaying:**
- Verify expo-linear-gradient is installed
- Check for console errors
- Ensure proper import paths

**Authentication errors:**
- Check Supabase URL and anon key
- Verify network connectivity
- Check email verification settings
- Review RLS policies

**Navigation issues:**
- Verify React Navigation setup
- Check screen names match
- Ensure proper navigation structure

## 📞 Support

For additional support:
1. Check the console for error messages
2. Verify all configuration steps
3. Test on both iOS and Android
4. Review Supabase dashboard logs
5. Check Google Cloud Console for OAuth issues

## 🎉 Conclusion

The onboarding system provides a professional, modern experience that:
- **Educates users** about app capabilities
- **Streamlines authentication** with multiple options
- **Ensures security** with proper validation
- **Delivers smooth UX** with animations and feedback
- **Scales easily** with configurable options

The system is production-ready and provides an excellent first impression for new users while maintaining security and performance standards. 
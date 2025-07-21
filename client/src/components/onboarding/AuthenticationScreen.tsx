import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/use-auth';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

type AuthMode = 'signin' | 'signup' | 'forgot';

interface AuthenticationScreenProps {
  onAuthSuccess: () => void;
  onBack: () => void;
}

export default function AuthenticationScreen({ onAuthSuccess, onBack }: AuthenticationScreenProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signIn, signUp, user } = useAuth();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (user) {
      onAuthSuccess();
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (authMode === 'signup') {
      if (!fullName) {
        Alert.alert('Error', 'Please enter your full name');
        return;
      }
      if (!username) {
        Alert.alert('Error', 'Please enter a username');
        return;
      }
      if (username.length < 3 || username.length > 50) {
        Alert.alert('Error', 'Username must be between 3 and 50 characters');
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (authMode === 'signin') {
        await signIn(email, password);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onAuthSuccess(); // Navigate to main app after successful sign in
      } else if (authMode === 'signup') {
        await signUp(email, password, fullName, username);
        Alert.alert(
          'Account Created',
          'Your account has been created successfully. Please check your email to verify your account.',
          [{ text: 'OK', onPress: () => setAuthMode('signin') }]
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        Alert.alert(
          'Reset Email Sent',
          'Please check your email for password reset instructions.',
          [{ text: 'OK', onPress: () => setAuthMode('signin') }]
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      
      let displayMessage = errorMessage;
      if (errorMessage.includes('duplicate key value')) {
        displayMessage = 'An account with this email already exists';
      } else if (errorMessage.includes('Invalid login')) {
        displayMessage = 'Invalid email or password. Please try again.';
      } else if (errorMessage.includes('verify your account')) {
        displayMessage = 'Please check your email to verify your account before signing in.';
      }

      Alert.alert('Authentication Error', displayMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'com.riskreport.app://auth/callback',
        },
      });

      if (error) throw error;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Google auth error:', error);
      Alert.alert('Google Sign In Error', 'Failed to sign in with Google. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchAuthMode = (mode: AuthMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAuthMode(mode);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setUsername('');
  };

  const getTitle = () => {
    switch (authMode) {
      case 'signin': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'forgot': return 'Reset Password';
    }
  };

  const getSubtitle = () => {
    switch (authMode) {
      case 'signin': return 'Sign in to access your risk analysis dashboard';
      case 'signup': return 'Join thousands of professionals managing portfolio risk';
      case 'forgot': return 'Enter your email to receive reset instructions';
    }
  };

  const getButtonText = () => {
    switch (authMode) {
      case 'signin': return 'Sign In';
      case 'signup': return 'Create Account';
      case 'forgot': return 'Send Reset Email';
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2'] as any}
        style={styles.gradient}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="analytics" size={50} color="white" />
              </View>
              <Text style={styles.title}>{getTitle()}</Text>
              <Text style={styles.subtitle}>{getSubtitle()}</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Full Name (Sign Up only) */}
              {authMode === 'signup' && (
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.7)" />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              {/* Username (Sign Up only) */}
              {authMode === 'signup' && (
                <View style={styles.inputContainer}>
                  <Ionicons name="at-outline" size={20} color="rgba(255,255,255,0.7)" />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              {/* Email */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.7)" />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {/* Password (not for forgot password) */}
              {authMode !== 'forgot' && (
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.7)" />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="rgba(255,255,255,0.7)"
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Confirm Password (Sign Up only) */}
              {authMode === 'signup' && (
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.7)" />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="rgba(255,255,255,0.7)"
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#667eea" />
                ) : (
                  <Text style={styles.submitButtonText}>{getButtonText()}</Text>
                )}
              </TouchableOpacity>

              {/* Google Auth (not for forgot password) */}
              {authMode !== 'forgot' && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleAuth}
                    disabled={isLoading}
                  >
                    <Ionicons name="logo-google" size={20} color="#667eea" />
                    <Text style={styles.googleButtonText}>
                      Continue with Google
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Footer Links */}
            <View style={styles.footer}>
              {authMode === 'signin' && (
                <>
                  <TouchableOpacity onPress={() => switchAuthMode('forgot')}>
                    <Text style={styles.linkText}>Forgot Password?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => switchAuthMode('signup')}>
                    <Text style={styles.linkText}>
                      Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {authMode === 'signup' && (
                <TouchableOpacity onPress={() => switchAuthMode('signin')}>
                  <Text style={styles.linkText}>
                    Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              )}

              {authMode === 'forgot' && (
                <TouchableOpacity onPress={() => switchAuthMode('signin')}>
                  <Text style={styles.linkText}>
                    Remember your password? <Text style={styles.linkTextBold}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 100,
    paddingBottom: 50,
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  eyeButton: {
    padding: 8,
  },
  submitButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  googleButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
  },
  linkText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  linkTextBold: {
    fontWeight: '600',
    color: 'white',
  },
}); 
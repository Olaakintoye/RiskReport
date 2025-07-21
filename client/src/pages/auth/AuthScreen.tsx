import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../../hooks/use-auth';
import { useToast } from '../../hooks/use-toast';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation-types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AuthScreen(props: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get navigation prop either from props or from hook
  const hookNavigation = useNavigation<NavigationProp>();
  const navigation = props?.navigation || hookNavigation;
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();

  // Handle navigation when user is authenticated
  useEffect(() => {
    if (user) {
      console.log('User authenticated, navigating to main app:', user);
      
      // Give a slight delay to ensure state is updated
      setTimeout(() => {
        try {
          // Use React Navigation's direct navigation
          if (navigation) {
            // Reset navigation stack to prevent going back to login
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              })
            );
          } else {
            // Fallback if navigation prop is not available
            try {
              const { navigationRef } = require('@react-navigation/native');
              if (navigationRef && navigationRef.isReady && navigationRef.isReady()) {
                navigationRef.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                  })
                );
              }
            } catch (e) {
              console.error('Navigation fallback failed:', e);
            }
          }
        } catch (error) {
          console.error('Navigation error during auth redirect:', error);
        }
      }, 500);
    }
  }, [user, navigation]);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin && !fullName) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        console.log('Attempting sign in with:', email);
        await signIn(email, password);
        console.log('Sign in successful');
      } else {
        console.log('Attempting sign up with:', email);
        await signUp(email, password, fullName);
        Alert.alert(
          'Account Created',
          'Your account has been created successfully. Please check your email to verify your account.'
        );
        setIsLogin(true); // Switch back to login form
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      
      // Handle specific Supabase error messages
      let displayMessage = errorMessage;
      if (errorMessage.includes('duplicate key value')) {
        displayMessage = 'An account with this email already exists';
      } else if (errorMessage.includes('password')) {
        displayMessage = 'Password must be at least 6 characters';
      } else if (errorMessage.includes('email')) {
        displayMessage = 'Please enter a valid email address';
      } else if (errorMessage.includes('verify your account')) {
        displayMessage = 'Please check your email to verify your account before signing in.';
      } else if (errorMessage.includes('Invalid login')) {
        displayMessage = 'Invalid email or password. Please try again.';
      }

      Alert.alert('Authentication Error', displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </Text>
        
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        )}
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={styles.switchText}>
            {isLogin
              ? "Don't have an account? Sign Up"
              : 'Already have an account? Sign In'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#007AFF',
    fontSize: 16,
  },
}); 
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Test AsyncStorage functionality
 */
export const testAsyncStorage = async (): Promise<void> => {
  try {
    console.log('Testing AsyncStorage...');
    
    // Test writing to AsyncStorage
    await AsyncStorage.setItem('test_key', 'test_value');
    console.log('Successfully wrote to AsyncStorage');
    
    // Test reading from AsyncStorage
    const value = await AsyncStorage.getItem('test_key');
    console.log('Read from AsyncStorage:', value);
    
    if (value === 'test_value') {
      console.log('AsyncStorage test passed!');
    } else {
      console.error('AsyncStorage test failed - value mismatch');
    }
  } catch (error) {
    console.error('AsyncStorage test failed with error:', error);
  }
};

export default {
  testAsyncStorage
}; 
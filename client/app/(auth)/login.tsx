import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  Platform, 
  ScrollView,
  KeyboardAvoidingView,
  Dimensions
} from 'react-native';

import { Link, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

// Assuming context and store are two levels up from app/(auth)/
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/AuthStore';

const { width } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const { login } = useAuthStore();
  const { colors, theme } = useTheme();
  const router = useRouter();
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Login Failed', 'Please enter both email and password.');
      return;
    }
    try {
      await login(email, password);
      router.push('/(tabs)')
    } catch (error) {
      Alert.alert('Login Failed', 'Please check your credentials.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={[styles.heading, { color: colors.text }]}>
              Welcome Back!
            </Text>
            <Text style={[styles.description, { color: colors.subtleText }]}>
              Log in to continue your health journey.
            </Text>
          </View>

          {/* Animation Section */}
          <View style={styles.animationSection}>
            <View style={styles.animatedImageContainer}>
              <LottieView
                style={styles.lottieAnimation}
                source={require('../../assets/Illustration Medication Packets Sent/animations/dbb250ea-46c7-441f-9697-268ba866bfaf.json')}
                autoPlay
                loop
              />
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: colors.card, 
                  color: colors.text, 
                  borderColor: colors.borderColor 
                }
              ]}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor={colors.subtleText}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: colors.card, 
                  color: colors.text, 
                  borderColor: colors.borderColor 
                }
              ]}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={colors.subtleText}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: colors.buttonBg }]} 
              onPress={handleLogin}
            >
              <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
                Login
              </Text>
            </TouchableOpacity>

            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity style={styles.linkButton}>
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  Don&apos;t have an account? Sign Up
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heading: {
    fontSize: width > 400 ? 40 : 36,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginBottom: 12,
    lineHeight: width > 400 ? 44 : 40,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'left',
    lineHeight: 24,
  },
  animationSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  animatedImageContainer: {
    width: width * 0.65,
    height: width * 0.65,
    maxWidth: 280,
    maxHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  formSection: {
    width: '100%',
    gap: 16,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    fontFamily: 'Manrope_400Regular',
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
  },
  linkButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
});

export default LoginScreen;
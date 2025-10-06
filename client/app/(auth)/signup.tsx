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
import { useAuthStore } from '@/store/AuthStore';
import { Link } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;

const SignupScreen: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { signup } = useAuthStore();
  const { colors, theme } = useTheme();

  const handleSignup = async () => {
    // Check if all fields are filled
    if (!name || !email || !password || !emergencyContact) {
      Alert.alert('Signup Failed', 'Please fill in all fields.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Basic password validation
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }
    
    // Basic phone number validation (simple check for digits)
    const phoneRegex = /^\d{10,}$/; // Example: checks for at least 10 digits
    if (!phoneRegex.test(emergencyContact)) {
        Alert.alert('Invalid Phone Number', 'Please enter a valid emergency contact number.');
        return;
    }

    setIsLoading(true);
    try {
      // Pass the new fields to your signup function
      await signup(name, email, password, emergencyContact);
    } catch (error: any) {
      const errorMessage = error.response?.data?.msg || 'Could not connect to the server.';
      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setIsLoading(false);
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
          <View style={[styles.headerSection, isSmallScreen && styles.headerSectionSmall]}>
            <Text style={[styles.heading, { color: colors.text }]}>
              Create Account
            </Text>
            <Text style={[styles.description, { color: colors.subtleText }]}>
              Start tracking your medications today.
            </Text>
          </View>

          {/* Animation Section */}
          <View style={[styles.animationSection, isSmallScreen && styles.animationSectionSmall]}>
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
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.card, 
                    color: colors.text, 
                    borderColor: colors.borderColor 
                  }
                ]}
                placeholder="Full Name"
                placeholderTextColor={colors.subtleText}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
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
                placeholder="Email Address"
                placeholderTextColor={colors.subtleText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
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
                placeholderTextColor={colors.subtleText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
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
                placeholder="Emergency Contact (Friend or Family)"
                placeholderTextColor={colors.subtleText}
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity 
              style={[
                styles.primaryButton, 
                { backgroundColor: colors.buttonBg },
                isLoading && styles.buttonDisabled
              ]} 
              onPress={handleSignup}
              disabled={isLoading}
            >
              <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.linkButton} disabled={isLoading}>
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  Already have an account? Log In
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
    justifyContent: 'center', // Changed to center to better handle various screen sizes
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 30,
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingTop: 10,
  },
  headerSectionSmall: {
    marginBottom: 10,
    paddingTop: 0,
  },
  heading: {
    fontSize: width > 400 ? 40 : width > 350 ? 36 : 32,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginBottom: 12,
    lineHeight: width > 400 ? 44 : width > 350 ? 40 : 36,
  },
  description: {
    fontSize: width > 400 ? 16 : 14,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'left',
    lineHeight: width > 400 ? 24 : 20,
  },
  animationSection: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10, // Added vertical margin for spacing
    minHeight: isSmallScreen ? 120 : 180,
    maxHeight: isSmallScreen ? 150 : 250,
  },
  animationSectionSmall: {
    minHeight: 100,
    maxHeight: 120,
  },
  animatedImageContainer: {
    width: width * (isSmallScreen ? 0.45 : 0.6),
    height: width * (isSmallScreen ? 0.45 : 0.6),
    maxWidth: isSmallScreen ? 180 : 260,
    maxHeight: isSmallScreen ? 180 : 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  formSection: {
    width: '100%',
    gap: width > 400 ? 16 : 12,
    paddingTop: 10,
  },
  inputContainer: {
    gap: width > 400 ? 16 : 12,
  },
  input: {
    height: width > 400 ? 56 : 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: width > 400 ? 16 : 15,
    borderWidth: 1,
    fontFamily: 'Manrope_400Regular',
  },
  primaryButton: {
    paddingVertical: width > 400 ? 18 : 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: width > 400 ? 12 : 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: width > 400 ? 17 : 16,
  },
  linkButton: {
    marginTop: width > 400 ? 16 : 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryButtonText: {
    textAlign: 'center',
    fontSize: width > 400 ? 15 : 14,
    fontFamily: 'Manrope_500Medium',
  },
});

export default SignupScreen;
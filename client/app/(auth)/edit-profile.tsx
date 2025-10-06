import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,

  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/AuthStore';
import { useTheme } from '../../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const EditProfileScreen: React.FC = () => {
  // --- Hooks and State ---
  const { user, updateUserProfile } = useAuthStore();
  const { colors } = useTheme();
  const router = useRouter();

  // Form state, initialized as empty strings
  const [name, setName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Effects ---
  // Pre-populate the form with the user's current data when the component loads
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmergencyContact(user.emergencyContact);
    }
  }, [user]);

  // --- Handlers ---
  const handleUpdate = async () => {
    // Basic validation
    if (!name.trim() || !emergencyContact.trim()) {
      Alert.alert('Validation Error', 'Fields cannot be empty.');
      return;
    }

    // Check if any data has actually changed
    if (name.trim() === user?.name && emergencyContact.trim() === user?.emergencyContact) {
      Alert.alert('No Changes', 'You have not made any changes to your profile.');
      return;
    }

    setIsLoading(true);
    try {
      // Call the updateUserProfile function from the Zustand store
      await updateUserProfile({
        name: name.trim(),
        emergencyContact: emergencyContact.trim(),
      });

      Alert.alert('Success', 'Your profile has been updated successfully.');
      router.back(); // Navigate back to the previous screen
    } catch (error) {
      Alert.alert('Update Failed', 'Could not update your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render ---
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
          <View style={{ width: 40 }} /> {/* Spacer to center the title */}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.subtleText }]}>Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.borderColor,
                  },
                ]}
                placeholderTextColor={colors.subtleText}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.subtleText }]}>Emergency Contact</Text>
              <TextInput
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                placeholder="Enter a phone number"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.borderColor,
                  },
                ]}
                placeholderTextColor={colors.subtleText}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleUpdate}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Updating...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB', 
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Manrope_700Bold',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  formContainer: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    fontFamily: 'Manrope_400Regular',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto', 
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default EditProfileScreen;

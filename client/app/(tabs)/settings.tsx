import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/AuthStore';
import { useTheme } from '../../context/ThemeContext';

const SettingsScreen: React.FC = () => {
  const { logout } = useAuthStore();
  const { theme, colors, setTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
     
      router.replace('/(auth)/login'); 
    } catch (error) {
      Alert.alert("Logout Failed", "Could not log out. Please try again.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* --- Theme Settings --- */}
      <View style={[styles.settingRow, { borderBottomColor: colors.borderColor }]}>
        <View style={styles.textContainer}>
            <Ionicons name="moon-outline" size={24} color={colors.text} />
            <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
        </View>
        <Switch
          value={theme === 'dark'}
          onValueChange={(isOn) => setTheme(isOn ? 'dark' : 'light')}
          trackColor={{ false: '#767577', true: colors.primary }}
          thumbColor={"#f4f3f4"}
        />
      </View>

      {/* --- Profile Settings --- */}
      <TouchableOpacity 
        style={[styles.settingRow, { borderBottomColor: colors.borderColor }]}
        onPress={() => router.push('/(auth)/edit-profile')} // Navigate to your edit profile screen
      >
        <View style={styles.textContainer}>
            <Ionicons name="person-outline" size={24} color={colors.text} />
            <Text style={[styles.settingText, { color: colors.text }]}>Edit Profile</Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={24} color={colors.subtleText} />
      </TouchableOpacity>

      {/* --- Logout Button --- */}
      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: colors.error }]} 
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingText: {
    fontSize: 18,
    fontFamily: 'Manrope_500Medium',
  },
  logoutButton: {
    marginTop: 50,
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
  },
});

export default SettingsScreen;
import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native'; // Import Lottie
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
  
  // Placeholder function for new menu items
  const handleComingSoon = () => {
    Alert.alert("Coming Soon!", "This feature is currently under development.");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* --- Lottie Animation --- */}
        <View style={styles.lottieContainer}>
          <LottieView
            source={require('@/assets/health insurance/animations/0eb9b269-4d19-4626-ad38-059ef4888364.json')} // Path to your animation
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
        </View>

        {/* --- General Settings Group --- */}
        <Text style={[styles.groupTitle, { color: colors.subtleText }]}>General</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.borderColor }]}>
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
                style={styles.settingRow} // Last item in group has no border
                onPress={() => router.push('/(auth)/edit-profile')}
            >
                <View style={styles.textContainer}>
                    <Ionicons name="person-outline" size={24} color={colors.text} />
                    <Text style={[styles.settingText, { color: colors.text }]}>Edit Profile</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={24} color={colors.subtleText} />
            </TouchableOpacity>
        </View>

        {/* --- More Settings Group --- */}
        <Text style={[styles.groupTitle, { color: colors.subtleText }]}>More</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.borderColor }]}>
            <TouchableOpacity 
                style={[styles.settingRow, { borderBottomColor: colors.borderColor }]}
                onPress={handleComingSoon}
            >
                <View style={styles.textContainer}>
                    <Ionicons name="notifications-outline" size={24} color={colors.text} />
                    <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={24} color={colors.subtleText} />
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.settingRow} // Last item in group has no border
                onPress={handleComingSoon}
            >
                <View style={styles.textContainer}>
                    <Ionicons name="shield-checkmark-outline" size={24} color={colors.text} />
                    <Text style={[styles.settingText, { color: colors.text }]}>Privacy Policy</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={24} color={colors.subtleText} />
            </TouchableOpacity>
        </View>


        {/* --- Logout Button --- */}
        <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: colors.error }]} 
            onPress={handleLogout}
        >
            <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* --- Footer --- */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.subtleText }]}>
          Crafted with ❤️ by Parth Verma
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lottieContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  groupTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  settingsGroup: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingText: {
    fontSize: 17,
    fontFamily: 'Manrope_500Medium',
  },
  logoutButton: {
    marginTop: 30,
    marginHorizontal: 15,
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
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
});

export default SettingsScreen;

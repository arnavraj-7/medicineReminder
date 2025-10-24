import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext'; // 1. Import the useTheme hook

const TabsLayout = () => {
  const { colors } = useTheme(); // 2. Get the colors from your theme context

  return (
    <Tabs 
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,      // 3. Set the active icon/label color
        tabBarInactiveTintColor: colors.subtleText, // 4. Set the inactive icon/label color
        tabBarStyle: {
          backgroundColor: colors.card,             // 5. Set the tab bar background color
          borderTopColor: colors.borderColor,       // Set the top border color
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'analytics' : 'analytics-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="medicine"
        options={{
          title: 'Medicine',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'medkit' : 'medkit-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;

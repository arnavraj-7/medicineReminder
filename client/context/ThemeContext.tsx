import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

// Define the expanded shape of our color palettes
interface ThemeColors {
  background: string;
  card: string;
  text: string;
  primary: string; // Used for highlights, focused icons, etc.
  accent: string;  // Used for success states
  subtleText: string;
  ripple: string;
  icon: string;
  borderColor: string;
  buttonBg: string;
  buttonText: string;
  success: string;
  error: string;
  warning: string;
}

// Define the themes using the palette you provided
const LightTheme: ThemeColors = {
  background: '#FFFFFF',
  card: '#F1F5F5',
  text: '#0A1514',
  primary: '#3B82F6', // Using infoColor as the main theme color
  accent: '#10B981',  // Using successColor as accent
  subtleText: '#4A5A59',
  ripple: 'rgba(59, 130, 246, 0.1)',
  icon: '#0A1514',
  borderColor: '#D4D4D4',
  buttonBg: '#D4E6E4', // primaryActionBg
  buttonText: '#0A1514', // primaryActionText
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B', 
};

const DarkTheme: ThemeColors = {
  background: '#0A1514',
  card: '#1C2A29',
  text: '#D4E6E4',
  primary: '#3B82F6', // Using infoColor as the main theme color
  accent: '#10B981',  // Using successColor as accent
  subtleText: '#838F8E',
  ripple: 'rgba(59, 130, 246, 0.1)',
  icon: '#D4E6E4',
  borderColor: '#4A5A59',
  buttonBg: '#D4E6E4', // primaryActionBg (High contrast light button on dark bg)
  buttonText: '#0A1514', // primaryActionText
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B', 
};

// Define the shape of the context value
interface ThemeContextType {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = 'dark'; // 'dark', 'light', or 'null'
  const [themeMode, setThemeMode] = React.useState<'light' | 'dark' | 'system'>('system');

  const theme = themeMode === 'system' ? colorScheme || 'light' : themeMode;
  const colors = theme === 'dark' ? DarkTheme : LightTheme;

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };
  
  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeMode(newTheme);
  }

  const value = { theme, colors, toggleTheme, setTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Custom hook to easily access theme properties
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};


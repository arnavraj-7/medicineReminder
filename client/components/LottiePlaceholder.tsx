import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface LottiePlaceholderProps {
  width?: number;
  height?: number;
  text?: string;
}

const LottiePlaceholder: React.FC<LottiePlaceholderProps> = ({ width = 250, height = 250, text = "Lottie Animation" }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { width, height, backgroundColor: colors.card, borderColor: colors.primary }]}>
      <Text style={[styles.text, { color: colors.subtleText }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginVertical: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LottiePlaceholder;

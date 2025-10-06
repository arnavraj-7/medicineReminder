import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiClient from '../../api/apiClient';
import { useTheme } from '../../context/ThemeContext';
// import NotificationService from '../../services/NotificationService';

const { width } = Dimensions.get('window');

const AddMedicineScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [foodTiming, setFoodTiming] = useState<'before' | 'after' | 'with' | 'anytime'>('anytime');
  const [description, setDescription] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const { colors, theme } = useTheme();
  const router = useRouter();

  const frequencyOptions = [
    { label: 'Once daily', value: 'Once daily', times: 1, icon: '1️⃣' },
    { label: 'Twice daily', value: 'Twice daily', times: 2, icon: '2️⃣' },
    { label: 'Three times daily', value: 'Three times daily', times: 3, icon: '3️⃣' },
    { label: 'Four times daily', value: 'Four times daily', times: 4, icon: '4️⃣' },
    { label: 'Every 8 hours', value: 'Every 8 hours', times: 3, icon: '⏰' },
    { label: 'Every 12 hours', value: 'Every 12 hours', times: 2, icon: '⏰' },
    { label: 'As needed', value: 'As needed', times: 1, icon: '💊' },
  ];

  const foodTimingOptions = [
    { label: 'Anytime', value: 'anytime', icon: 'checkmark-circle-outline', description: 'No food requirement' },
    { label: 'Before Food', value: 'before', icon: 'restaurant-outline', description: 'Take on empty stomach' },
    { label: 'After Food', value: 'after', icon: 'restaurant', description: 'Take after eating' },
    { label: 'With Food', value: 'with', icon: 'fast-food-outline', description: 'Take while eating' },
  ];

  const updateTimesForFrequency = (selectedFrequency: string) => {
    const option = frequencyOptions.find(opt => opt.value === selectedFrequency);
    if (option) {
      const newTimes = [];
      for (let i = 0; i < option.times; i++) {
        if (i < times.length) {
          newTimes.push(times[i]);
        } else {
          switch (option.times) {
            case 1:
              newTimes.push('08:00');
              break;
            case 2:
              newTimes.push(i === 0 ? '08:00' : '20:00');
              break;
            case 3:
              newTimes.push(i === 0 ? '08:00' : i === 1 ? '14:00' : '20:00');
              break;
            case 4:
              newTimes.push(i === 0 ? '08:00' : i === 1 ? '12:00' : i === 2 ? '16:00' : '20:00');
              break;
          }
        }
      }
      setTimes(newTimes);
    }
  };

  const handleFrequencyChange = (selectedFrequency: string) => {
    setFrequency(selectedFrequency);
    updateTimesForFrequency(selectedFrequency);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const timeString = selectedTime.toTimeString().slice(0, 5);
      const newTimes = [...times];
      newTimes[editingTimeIndex] = timeString;
      setTimes(newTimes);
    }
  };

  const openTimePicker = (index: number) => {
    setEditingTimeIndex(index);
    setShowTimePicker(true);
  };

  const validateInputs = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter medicine name');
      return false;
    }
    if (!dosage.trim()) {
      Alert.alert('Validation Error', 'Please enter dosage');
      return false;
    }
    if (times.length === 0) {
      Alert.alert('Validation Error', 'Please set at least one time');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      const medicineData = {
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        times,
        foodTiming,
        description: description.trim() || undefined,
      };

      await apiClient.post('/medicines', medicineData);
      Alert.alert('Success', 'Medicine added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Failed to add medicine:', error);
      Alert.alert('Error', 'Failed to add medicine. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTimeInputs = () => {
    return times.map((time, index) => (
      <TouchableOpacity
        key={index}
        style={[
          styles.timeButton,
          { 
            backgroundColor: colors.primary + '15',
            borderColor: colors.primary,
          }
        ]}
        onPress={() => openTimePicker(index)}
        activeOpacity={0.7}
      >
        <Ionicons name="time" size={24} color={colors.primary} />
        <Text style={[styles.timeButtonText, { color: colors.primary }]}>
          {time}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.primary} />
      </TouchableOpacity>
    ));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Add Medicine
        </Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.form}>
            {/* Medicine Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="medical" size={20} color={colors.primary} />
                <Text style={[styles.label, { color: colors.text }]}>
                  Medicine Name
                </Text>
                <Text style={styles.required}>*</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.borderColor }
                ]}
                placeholder="e.g., Aspirin, Vitamin D"
                placeholderTextColor={colors.subtleText}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Dosage */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="flask" size={20} color={colors.primary} />
                <Text style={[styles.label, { color: colors.text }]}>
                  Dosage
                </Text>
                <Text style={styles.required}>*</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.borderColor }
                ]}
                placeholder="e.g., 500mg, 1 tablet, 5ml"
                placeholderTextColor={colors.subtleText}
                value={dosage}
                onChangeText={setDosage}
              />
            </View>

            {/* Frequency */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="repeat" size={20} color={colors.primary} />
                <Text style={[styles.label, { color: colors.text }]}>
                  Frequency
                </Text>
                <Text style={styles.required}>*</Text>
              </View>
              <View style={styles.optionsGrid}>
                {frequencyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionCard,
                      { 
                        backgroundColor: frequency === option.value ? colors.primary : colors.card,
                        borderColor: frequency === option.value ? colors.primary : colors.borderColor,
                      }
                    ]}
                    onPress={() => handleFrequencyChange(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionIcon}>{option.icon}</Text>
                    <Text style={[
                      styles.optionText,
                      { color: frequency === option.value ? '#FFFFFF' : colors.text }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Times */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="alarm" size={20} color={colors.primary} />
                <Text style={[styles.label, { color: colors.text }]}>
                  Reminder Times
                </Text>
                <Text style={styles.required}>*</Text>
              </View>
              <Text style={[styles.helperText, { color: colors.subtleText }]}>
                Tap to set when you want to be reminded
              </Text>
              <View style={styles.timesContainer}>
                {renderTimeInputs()}
              </View>
            </View>

            {/* Food Timing */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="restaurant" size={20} color={colors.primary} />
                <Text style={[styles.label, { color: colors.text }]}>
                  Food Timing
                </Text>
              </View>
              <View style={styles.foodTimingGrid}>
                {foodTimingOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.foodTimingCard,
                      { 
                        backgroundColor: foodTiming === option.value ? colors.primary : colors.card,
                        borderColor: foodTiming === option.value ? colors.primary : colors.borderColor,
                      }
                    ]}
                    onPress={() => setFoodTiming(option.value as any)}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={28} 
                      color={foodTiming === option.value ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[
                      styles.foodTimingLabel,
                      { color: foodTiming === option.value ? '#FFFFFF' : colors.text }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.foodTimingDescription,
                      { color: foodTiming === option.value ? '#FFFFFF' : colors.subtleText }
                    ]}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
                <Text style={[styles.label, { color: colors.text }]}>
                  Additional Notes
                </Text>
                <Text style={[styles.optional, { color: colors.subtleText }]}>(Optional)</Text>
              </View>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.borderColor }
                ]}
                placeholder="Side effects, special instructions, doctor's notes..."
                placeholderTextColor={colors.subtleText}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                isLoading && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Adding Medicine...' : 'Add Medicine'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={new Date(`2023-01-01T${times[editingTimeIndex]}:00`)}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Manrope_700Bold',
  },
  placeholder: {
    width: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  form: {
    padding: 20,
    gap: 28,
  },
  inputGroup: {
    gap: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 17,
    fontFamily: 'Manrope_600SemiBold',
  },
  required: {
    color: '#EF4444',
    fontSize: 17,
    fontFamily: 'Manrope_600SemiBold',
  },
  optional: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    marginLeft: 4,
  },
  helperText: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    marginTop: -4,
  },
  input: {
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1.5,
    fontFamily: 'Manrope_500Medium',
  },
  textArea: {
    minHeight: 120,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1.5,
    fontFamily: 'Manrope_400Regular',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: '47%',
  },
  optionIcon: {
    fontSize: 20,
  },
  optionText: {
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    flex: 1,
  },
  foodTimingGrid: {
    gap: 12,
  },
  foodTimingCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    gap: 6,
  },
  foodTimingLabel: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    marginTop: 4,
  },
  foodTimingDescription: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
  },
  timesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 10,
    minWidth: 140,
  },
  timeButtonText: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
  },
});

export default AddMedicineScreen;
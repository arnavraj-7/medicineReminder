import React, { useState, useEffect } from 'react';
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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiClient from '../../api/apiClient';
import { useTheme } from '../../context/ThemeContext';
import NotificationService from '../../services/NotificationService';

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
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  const { colors, theme } = useTheme();
  const router = useRouter();

  // Check notification permissions on mount
  useEffect(() => {
    checkNotificationPermissions();
  }, []);

  const checkNotificationPermissions = async () => {
    const hasPermission = await NotificationService.requestPermissions();
    setHasNotificationPermission(hasPermission);
    if (!hasPermission) {
      setEnableNotifications(false);
    }
  };

  const frequencyOptions = [
    { label: 'Once daily', value: 'Once daily', times: 1, icon: 'timer-outline' },
    { label: 'Twice daily', value: 'Twice daily', times: 2, icon: 'time-outline' },
    { label: 'Three times', value: 'Three times daily', times: 3, icon: 'alarm-outline' },
    { label: 'Four times', value: 'Four times daily', times: 4, icon: 'notifications-outline' },
    { label: 'Every 8 hrs', value: 'Every 8 hours', times: 3, icon: 'refresh-outline' },
    { label: 'Every 12 hrs', value: 'Every 12 hours', times: 2, icon: 'repeat-outline' },
    { label: 'As needed', value: 'As needed', times: 1, icon: 'medkit-outline' },
  ];

  const foodTimingOptions = [
    { 
      label: 'Anytime', 
      value: 'anytime', 
      icon: 'checkmark-circle', 
      color: '#10B981',
      description: 'No food required' 
    },
    { 
      label: 'Before Food', 
      value: 'before', 
      icon: 'restaurant-outline',
      color: '#F59E0B',
      description: 'Empty stomach' 
    },
    { 
      label: 'After Food', 
      value: 'after', 
      icon: 'restaurant',
      color: '#3B82F6',
      description: 'After eating' 
    },
    { 
      label: 'With Food', 
      value: 'with', 
      icon: 'fast-food',
      color: '#8B5CF6',
      description: 'While eating' 
    },
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
      // Prepare medicine data
      const medicineData = {
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        times,
        foodTiming,
        description: description.trim() || undefined,
      };

      const response = await apiClient.post('/medicines', medicineData);
      const newMedicine = response.data;

      // Schedule notifications if enabled
      if (enableNotifications && hasNotificationPermission) {
        try {
          const notificationIds = await NotificationService.scheduleMedicineReminders(
            name.trim(),
            times,
            newMedicine._id
          );

          console.log(`✅ Scheduled ${notificationIds.length} notifications for ${name.trim()}`);

          // Optional: Debug scheduled notifications
          // await NotificationService.debugScheduledNotifications();

          Alert.alert(
            'Success',
            `Medicine added successfully!\n\nYou'll receive ${times.length} daily reminder${times.length > 1 ? 's' : ''} at:\n${times.join(', ')}`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } catch (notificationError) {
          console.error('Failed to schedule notifications:', notificationError);
          Alert.alert(
            'Partial Success',
            'Medicine added but notifications could not be scheduled. You can try again from the medicine details.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }
      } else {
        Alert.alert(
          'Success',
          'Medicine added successfully!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Failed to add medicine:', error);
      Alert.alert('Error', 'Failed to add medicine. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    if (value && !hasNotificationPermission) {
      Alert.alert(
        'Notification Permission Required',
        'Please enable notifications in your device settings to receive medicine reminders.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Check Permission',
            onPress: async () => {
              const hasPermission = await NotificationService.requestPermissions();
              setHasNotificationPermission(hasPermission);
              if (hasPermission) {
                setEnableNotifications(true);
              } else {
                Alert.alert(
                  'Permission Denied',
                  'You need to enable notifications in your device settings to use this feature.'
                );
              }
            }
          }
        ]
      );
      return;
    }
    setEnableNotifications(value);
  };

  const renderTimeInputs = () => {
    return times.map((time, index) => (
      <TouchableOpacity
        key={index}
        style={[
          styles.timeChip,
          { 
            backgroundColor: colors.primary + '10',
            borderColor: colors.primary + '30',
          }
        ]}
        onPress={() => openTimePicker(index)}
        activeOpacity={0.7}
      >
        <View style={[styles.timeIconWrapper, { backgroundColor: colors.primary }]}>
          <Ionicons name="time" size={18} color="#FFFFFF" />
        </View>
        <Text style={[styles.timeChipText, { color: colors.primary }]}>
          {time}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.primary} />
      </TouchableOpacity>
    ));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Premium Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="medical" size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Add Medicine
          </Text>
        </View>
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
            <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="medical" size={20} color={colors.primary} />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Medicine Name
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.subtleText }]}>
                    What medicine are you taking?
                  </Text>
                </View>
                <Text style={styles.required}>*</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderColor }
                ]}
                placeholder="e.g., Aspirin, Vitamin D, Paracetamol"
                placeholderTextColor={colors.subtleText}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Dosage */}
            <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconBadge, { backgroundColor: '#3B82F6' + '15' }]}>
                  <Ionicons name="flask" size={20} color="#3B82F6" />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Dosage
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.subtleText }]}>
                    How much do you need to take?
                  </Text>
                </View>
                <Text style={styles.required}>*</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderColor }
                ]}
                placeholder="e.g., 500mg, 1 tablet, 5ml, 2 capsules"
                placeholderTextColor={colors.subtleText}
                value={dosage}
                onChangeText={setDosage}
              />
            </View>

            {/* Frequency */}
            <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconBadge, { backgroundColor: '#10B981' + '15' }]}>
                  <Ionicons name="repeat" size={20} color="#10B981" />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Frequency
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.subtleText }]}>
                    How often should you take it?
                  </Text>
                </View>
                <Text style={styles.required}>*</Text>
              </View>
              <View style={styles.frequencyGrid}>
                {frequencyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyCard,
                      { 
                        backgroundColor: frequency === option.value ? colors.primary : colors.background,
                        borderColor: frequency === option.value ? colors.primary : colors.borderColor,
                      }
                    ]}
                    onPress={() => handleFrequencyChange(option.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={22} 
                      color={frequency === option.value ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[
                      styles.frequencyText,
                      { color: frequency === option.value ? '#FFFFFF' : colors.text }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reminder Times */}
            <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconBadge, { backgroundColor: '#F59E0B' + '15' }]}>
                  <Ionicons name="alarm" size={20} color="#F59E0B" />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Reminder Times
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.subtleText }]}>
                    When should we remind you?
                  </Text>
                </View>
                <Text style={styles.required}>*</Text>
              </View>
              <View style={styles.timesGrid}>
                {renderTimeInputs()}
              </View>
            </View>

            {/* Notification Toggle */}
            <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
              <View style={styles.notificationToggle}>
                <View style={styles.notificationToggleLeft}>
                  <View style={[styles.iconBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons 
                      name={enableNotifications ? "notifications" : "notifications-off"} 
                      size={20} 
                      color={colors.primary} 
                    />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Enable Reminders
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.subtleText }]}>
                      {hasNotificationPermission 
                        ? 'Get notified at scheduled times'
                        : 'Permission required for notifications'
                      }
                    </Text>
                  </View>
                </View>
                <Switch
                  value={enableNotifications}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: colors.borderColor, true: colors.primary + '40' }}
                  thumbColor={enableNotifications ? colors.primary : colors.subtleText}
                  ios_backgroundColor={colors.borderColor}
                />
              </View>
              {!hasNotificationPermission && (
                <View style={[styles.warningBanner, { backgroundColor: colors.warning + '15' }]}>
                  <Ionicons name="warning" size={16} color={colors.warning} />
                  <Text style={[styles.warningText, { color: colors.warning }]}>
                    Notification permission not granted. Please enable in settings.
                  </Text>
                </View>
              )}
            </View>

            {/* Food Timing */}
            <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconBadge, { backgroundColor: '#8B5CF6' + '15' }]}>
                  <Ionicons name="restaurant" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Food Timing
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.subtleText }]}>
                    Any food requirements?
                  </Text>
                </View>
              </View>
              <View style={styles.foodTimingGrid}>
                {foodTimingOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.foodTimingCard,
                      { 
                        backgroundColor: foodTiming === option.value ? option.color + '15' : colors.background,
                        borderColor: foodTiming === option.value ? option.color : colors.borderColor,
                      }
                    ]}
                    onPress={() => setFoodTiming(option.value as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.foodTimingIconWrapper,
                      { backgroundColor: foodTiming === option.value ? option.color : colors.background }
                    ]}>
                      <Ionicons 
                        name={option.icon as any} 
                        size={24} 
                        color={foodTiming === option.value ? '#FFFFFF' : option.color}
                      />
                    </View>
                    <Text style={[
                      styles.foodTimingLabel,
                      { color: foodTiming === option.value ? option.color : colors.text }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.foodTimingDescription,
                      { color: colors.subtleText }
                    ]}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Additional Notes */}
            <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconBadge, { backgroundColor: '#6366F1' + '15' }]}>
                  <Ionicons name="document-text" size={20} color="#6366F1" />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Additional Notes
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.subtleText }]}>
                    Any special instructions? (Optional)
                  </Text>
                </View>
              </View>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderColor }
                ]}
                placeholder="Side effects, doctor's notes, special instructions..."
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
              <Ionicons 
                name={isLoading ? "hourglass-outline" : "checkmark-circle"} 
                size={24} 
                color="#FFFFFF" 
              />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
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
    gap: 20,
  },
  inputSection: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 18,
  },
  required: {
    color: '#EF4444',
    fontSize: 20,
    fontFamily: 'Manrope_700Bold',
  },
  input: {
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    borderWidth: 2,
    fontFamily: 'Manrope_600SemiBold',
  },
  textArea: {
    minHeight: 120,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    borderWidth: 2,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 22,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  frequencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 10,
    minWidth: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  frequencyText: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    flex: 1,
  },
  timesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    paddingLeft: 10,
    borderRadius: 14,
    borderWidth: 2,
    gap: 10,
    minWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  timeIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipText: {
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
    flex: 1,
  },
  notificationToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    flex: 1,
    lineHeight: 16,
  },
  foodTimingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  foodTimingCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  foodTimingIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  foodTimingLabel: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
  foodTimingDescription: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.5,
  },
});

export default AddMedicineScreen;
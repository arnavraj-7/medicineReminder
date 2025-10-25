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
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiClient from '../../api/apiClient';
import { useTheme } from '../../context/ThemeContext';
import NotificationService from '../../services/NotificationService';

interface Medicine {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  foodTiming?: 'before' | 'after' | 'with' | 'anytime';
  description?: string;
  history: HistoryEntry[];
  createdAt?: string;
}

interface HistoryEntry {
  timestamp: string;
  status: 'taken' | 'skipped';
  _id?: string;
}

const MedicineDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, theme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  
  // Edit form states
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [foodTiming, setFoodTiming] = useState<'before' | 'after' | 'with' | 'anytime'>('anytime');
  const [description, setDescription] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    fetchMedicine();
  }, [id]);

  const fetchMedicine = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/medicines/${id}`);
      const medicineData = response.data;
      setMedicine(medicineData);
      
      // Set form values
      setName(medicineData.name);
      setDosage(medicineData.dosage);
      setFrequency(medicineData.frequency);
      setTimes(medicineData.times);
      setFoodTiming(medicineData.foodTiming || 'anytime');
      setDescription(medicineData.description || '');
    } catch (error) {
      console.error('Failed to fetch medicine:', error);
      Alert.alert('Error', 'Failed to load medicine details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const updatedData = {
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        times,
        foodTiming,
        description: description.trim(),
      };

      const response = await apiClient.put(`/medicines/${id}`, updatedData);
      setMedicine(response.data);
      
      // Cancel old notifications and schedule new ones
      try {
        await NotificationService.cancelNotificationsByMedicineId(id as string);
        await NotificationService.scheduleMedicineReminders(
          updatedData.name,
          updatedData.times,
          id as string
        );
        console.log('✅ Updated notifications for medicine');
      } catch (notificationError) {
        console.error('Failed to update notifications:', notificationError);
      }
      
      setIsEditing(false);
      Alert.alert('Success', 'Medicine updated successfully!');
    } catch (error) {
      console.error('Failed to update medicine:', error);
      Alert.alert('Error', 'Failed to update medicine');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to delete ${medicine?.name}? All reminders will be cancelled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancel all notifications for this medicine FIRST
              await NotificationService.cancelNotificationsByMedicineId(id as string);
              console.log('✅ Cancelled all notifications for medicine');
              
              // Then delete the medicine from database
              await apiClient.delete(`/medicines/${id}`);
              
              Alert.alert('Success', 'Medicine and all reminders deleted successfully', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Failed to delete medicine:', error);
              Alert.alert('Error', 'Failed to delete medicine');
            }
          }
        }
      ]
    );
  };

  const markAsTaken = async () => {
    try {
      await apiClient.post(`/medicines/history/${id}`, { status: 'taken' });
      await fetchMedicine();
      Alert.alert('Success', 'Marked as taken!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const markAsSkipped = async () => {
    try {
      await apiClient.post(`/medicines/history/${id}`, { status: 'skipped' });
      await fetchMedicine();
      Alert.alert('Success', 'Marked as skipped');
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const getHistoryStats = () => {
    if (!medicine?.history || medicine.history.length === 0) {
      return { taken: 0, skipped: 0, adherence: 0 };
    }

    const taken = medicine.history.filter(h => h.status === 'taken').length;
    const skipped = medicine.history.filter(h => h.status === 'skipped').length;
    const total = taken + skipped;
    const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;

    return { taken, skipped, adherence };
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!medicine) {
    return null;
  }

  const stats = getHistoryStats();

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
          {isEditing ? 'Edit Medicine' : 'Medicine Details'}
        </Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isEditing ? 'close' : 'create-outline'} 
            size={24} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!isEditing ? (
            // View Mode
            <View style={styles.content}>
              {/* Medicine Info Card */}
              <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                <View style={styles.medicineHeader}>
                  <Ionicons name="medical" size={32} color={colors.primary} />
                  <View style={styles.medicineHeaderText}>
                    <Text style={[styles.medicineName, { color: colors.text }]}>
                      {medicine.name}
                    </Text>
                    <Text style={[styles.medicineDosage, { color: colors.subtleText }]}>
                      {medicine.dosage}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="repeat" size={20} color={colors.primary} />
                  <Text style={[styles.infoLabel, { color: colors.subtleText }]}>Frequency:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{medicine.frequency}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="time" size={20} color={colors.primary} />
                  <Text style={[styles.infoLabel, { color: colors.subtleText }]}>Times:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {medicine.times.join(', ')}
                  </Text>
                </View>

                {medicine.foodTiming && medicine.foodTiming !== 'anytime' && (
                  <View style={styles.infoRow}>
                    <Ionicons name="restaurant" size={20} color={colors.primary} />
                    <Text style={[styles.infoLabel, { color: colors.subtleText }]}>Food Timing:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {medicine.foodTiming.charAt(0).toUpperCase() + medicine.foodTiming.slice(1)} food
                    </Text>
                  </View>
                )}

                {medicine.description && (
                  <View style={styles.descriptionContainer}>
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                    <Text style={[styles.descriptionText, { color: colors.subtleText }]}>
                      {medicine.description}
                    </Text>
                  </View>
                )}
              </View>

              {/* Stats Cards */}
              <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.statNumber, { color: colors.success }]}>{stats.taken}</Text>
                  <Text style={[styles.statLabel, { color: colors.subtleText }]}>Taken</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.statNumber, { color: colors.warning }]}>{stats.skipped}</Text>
                  <Text style={[styles.statLabel, { color: colors.subtleText }]}>Skipped</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.adherence}%</Text>
                  <Text style={[styles.statLabel, { color: colors.subtleText }]}>Adherence</Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: colors.success }]}
                  onPress={markAsTaken}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Mark as Taken</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: colors.warning }]}
                  onPress={markAsSkipped}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Mark as Skipped</Text>
                </TouchableOpacity>
              </View>

              {/* History */}
              {medicine.history && medicine.history.length > 0 && (
                <View style={styles.historySection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent History</Text>
                  <View style={[styles.historyCard, { backgroundColor: colors.card }]}>
                    {medicine.history.slice(-10).reverse().map((entry, index) => (
                      <View 
                        key={entry._id || index} 
                        style={[
                          styles.historyItem,
                          index !== 0 && { borderTopWidth: 1, borderTopColor: colors.borderColor }
                        ]}
                      >
                        <View style={styles.historyLeft}>
                          <Ionicons 
                            name={entry.status === 'taken' ? 'checkmark-circle' : 'close-circle'} 
                            size={24} 
                            color={entry.status === 'taken' ? colors.success : colors.warning} 
                          />
                          <View>
                            <Text style={[styles.historyStatus, { color: colors.text }]}>
                              {entry.status === 'taken' ? 'Taken' : 'Skipped'}
                            </Text>
                            <Text style={[styles.historyDate, { color: colors.subtleText }]}>
                              {new Date(entry.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.historyTime, { color: colors.subtleText }]}>
                          {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Delete Button */}
              <TouchableOpacity 
                style={[styles.deleteButton, { backgroundColor: colors.error + '15', borderColor: colors.error }]}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={20} color={colors.error} />
                <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                  Delete Medicine
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Edit Mode
            <View style={styles.form}>
              {/* Medicine Name */}
              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Ionicons name="medical" size={20} color={colors.primary} />
                  <Text style={[styles.label, { color: colors.text }]}>Medicine Name</Text>
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
                  <Text style={[styles.label, { color: colors.text }]}>Dosage</Text>
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
                  <Text style={[styles.label, { color: colors.text }]}>Frequency</Text>
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
                  <Text style={[styles.label, { color: colors.text }]}>Reminder Times</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <Text style={[styles.helperText, { color: colors.subtleText }]}>
                  Tap to set when you want to be reminded
                </Text>
                <View style={styles.timesContainer}>
                  {times.map((time, index) => (
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
                  ))}
                </View>
              </View>

              {/* Food Timing */}
              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Ionicons name="restaurant" size={20} color={colors.primary} />
                  <Text style={[styles.label, { color: colors.text }]}>Food Timing</Text>
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
                  <Text style={[styles.label, { color: colors.text }]}>Additional Notes</Text>
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

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  isSaving && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  editButton: {
    padding: 8,
    marginRight: -8,
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
  content: {
    padding: 20,
    gap: 20,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  medicineHeaderText: {
    flex: 1,
  },
  medicineName: {
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 4,
  },
  medicineDosage: {
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    minWidth: 100,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    flex: 1,
  },
  descriptionContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 22,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
  historySection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_700Bold',
  },
  historyCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyStatus: {
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
  },
  historyTime: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 2,
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
  // Edit form styles
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
  saveButton: {
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
  },
});

export default MedicineDetailScreen;
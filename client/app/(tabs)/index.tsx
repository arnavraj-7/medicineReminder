import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  RefreshControl,
  Alert,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import apiClient from '../../api/apiClient';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/AuthStore';
import NotificationService from '../../services/NotificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const isToday = (someDate: Date) => {
  const today = new Date();
  return someDate.getDate() === today.getDate() &&
    someDate.getMonth() === today.getMonth() &&
    someDate.getFullYear() === today.getFullYear();
};

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
  notificationIds?: string[];
}

interface HistoryEntry {
  timestamp: string;
  status: 'taken' | 'skipped';
}

interface MedicineByTime {
  time: string;
  medicine: Medicine;
  status: 'pending' | 'taken' | 'skipped' | 'overdue';
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

const DashboardScreen: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicinesByTimeOfDay, setMedicinesByTimeOfDay] = useState<{
    morning: MedicineByTime[];
    afternoon: MedicineByTime[];
    evening: MedicineByTime[];
    night: MedicineByTime[];
  }>({
    morning: [],
    afternoon: [],
    evening: [],
    night: []
  });
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<TimeOfDay>('morning');
  const { colors: themeColors, theme } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();

  // Map theme colors to match what the component expects
  const colors = {
    bg: themeColors.background,
    cardBg: themeColors.card,
    text: themeColors.text,
    subtleText: themeColors.subtleText,
    primary: themeColors.primary,
    headerBg: themeColors.card,
  };

  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications();
    setupNotificationListeners();
  }, []);

  const initializeNotifications = async () => {
    const hasPermission = await NotificationService.requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Notifications Disabled',
        'Enable notifications to receive medicine reminders',
        [{ text: 'OK' }]
      );
    }
  };

  const setupNotificationListeners = () => {
    // Listen for notifications when app is in foreground
    const notificationListener = NotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    // Listen for notification taps
    const responseListener = NotificationService.addNotificationResponseReceivedListener(
      (response) => {
        const medicineId = response.notification.request.content.data?.medicineId;
        if (medicineId) {
          router.push(`/medicine/${medicineId}`);
        }
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  const getCurrentTimeOfDay = (): TimeOfDay => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  };

  const getTimeOfDayForTime = (timeString: string): TimeOfDay => {
    const [hours] = timeString.split(':').map(Number);
    if (hours >= 5 && hours < 12) return 'morning';
    if (hours >= 12 && hours < 17) return 'afternoon';
    if (hours >= 17 && hours < 21) return 'evening';
    return 'night';
  };

  const organizeMedicinesByTime = (medicinesList: Medicine[]) => {
    const now = new Date();
    const organized: {
      morning: MedicineByTime[];
      afternoon: MedicineByTime[];
      evening: MedicineByTime[];
      night: MedicineByTime[];
    } = {
      morning: [],
      afternoon: [],
      evening: [],
      night: []
    };

    medicinesList.forEach((medicine) => {
      medicine.times.forEach((time) => {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        const takenToday = medicine.history.some(entry => {
          const entryDate = new Date(entry.timestamp);
          return isToday(entryDate) && 
                 entryDate.getHours() === hours &&
                 Math.abs(entryDate.getMinutes() - minutes) < 30 &&
                 entry.status === 'taken';
        });

        const skippedToday = medicine.history.some(entry => {
          const entryDate = new Date(entry.timestamp);
          return isToday(entryDate) && 
                 entryDate.getHours() === hours &&
                 Math.abs(entryDate.getMinutes() - minutes) < 30 &&
                 entry.status === 'skipped';
        });

        let status: 'pending' | 'taken' | 'skipped' | 'overdue' = 'pending';
        
        if (takenToday) {
          status = 'taken';
        } else if (skippedToday) {
          status = 'skipped';
        } else if (scheduledTime < now && (now.getTime() - scheduledTime.getTime()) > 30 * 60 * 1000) {
          status = 'overdue';
        }

        const timeOfDay = getTimeOfDayForTime(time);
        organized[timeOfDay].push({
          time,
          medicine,
          status
        });
      });
    });

    Object.keys(organized).forEach(key => {
      organized[key as TimeOfDay].sort((a, b) => a.time.localeCompare(b.time));
    });

    setMedicinesByTimeOfDay(organized);
  };

  const fetchMedicines = async () => {
    try {
      const response = await apiClient.get('/medicines');
      const medicinesData = response.data;
      setMedicines(medicinesData);
      organizeMedicinesByTime(medicinesData);
    } catch (error) {
      console.error('Failed to fetch medicines:', error);
      Alert.alert('Error', 'Failed to load medicines');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMedicines();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMedicines();
      setGreeting(getGreeting());
      setCurrentTimeOfDay(getCurrentTimeOfDay());
    }, [])
  );

  const handleEmergencyCall = () => {
    const emergencyContactNumber = user?.emergencyContact;
    const ambulanceNumber = '102';

    const alertButtons = [];

    if (emergencyContactNumber) {
      alertButtons.push({
        text: `Emergency Contact`,
        onPress: () => {
          Linking.openURL(`tel:${emergencyContactNumber}`).catch(() => {
            Alert.alert('Error', 'Could not open the phone dialer.');
          });
        },
      });
    }

    alertButtons.push({
      text: 'Call Ambulance (102)',
      onPress: () => {
        Linking.openURL(`tel:${ambulanceNumber}`).catch(() => {
          Alert.alert('Error', 'Could not open the phone dialer.');
        });
      },
    });

    alertButtons.push({
      text: 'Cancel',
      style: 'cancel' as 'cancel',
    });

    Alert.alert(
      '🚨 Emergency',
      'Choose who to call for immediate help',
      alertButtons,
      { cancelable: true }
    );
  };

  const markAsTaken = async (medicineId: string, time: string) => {
    try {
      await apiClient.post(`/medicines/history/${medicineId}`, { status: 'taken' });
      
      // Send confirmation notification
      await NotificationService.sendImmediateNotification({
        title: '✅ Medicine Taken',
        body: `Great! You've taken your medicine at ${time}`,
        data: { medicineId, action: 'taken' }
      });
      
      await fetchMedicines();
    } catch (error) {
      Alert.alert('Error', 'Failed to update medicine status');
    }
  };

  const markAsSkipped = async (medicineId: string, time: string) => {
    try {
      await apiClient.post(`/medicines/history/${medicineId}`, { status: 'skipped' });
      
      // Send reminder notification
      await NotificationService.sendImmediateNotification({
        title: '⚠️ Medicine Skipped',
        body: `You skipped your medicine at ${time}. Don't forget next time!`,
        data: { medicineId, action: 'skipped' }
      });
      
      await fetchMedicines();
    } catch (error) {
      Alert.alert('Error', 'Failed to update medicine status');
    }
  };

  const getTimeOfDayIcon = (timeOfDay: TimeOfDay) => {
    switch (timeOfDay) {
      case 'morning': return 'sunny';
      case 'afternoon': return 'partly-sunny';
      case 'evening': return 'moon';
      case 'night': return 'moon-outline';
    }
  };

  const getTimeOfDayColor = (timeOfDay: TimeOfDay) => {
    switch (timeOfDay) {
      case 'morning': return '#F59E0B';
      case 'afternoon': return '#F97316';
      case 'evening': return '#8B5CF6';
      case 'night': return '#6366F1';
    }
  };

  const getTimeRangeText = (timeOfDay: TimeOfDay) => {
    switch (timeOfDay) {
      case 'morning': return '5:00 AM - 12:00 PM';
      case 'afternoon': return '12:00 PM - 5:00 PM';
      case 'evening': return '5:00 PM - 9:00 PM';
      case 'night': return '9:00 PM - 5:00 AM';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken': return '#10B981';
      case 'skipped': return '#EF4444';
      case 'overdue': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken': return 'checkmark-circle';
      case 'skipped': return 'close-circle';
      case 'overdue': return 'alert-circle';
      default: return 'time';
    }
  };

  const totalDosesToday = Object.values(medicinesByTimeOfDay).reduce(
    (acc, timeSlot) => acc + timeSlot.length,
    0
  );

  const takenDosesToday = Object.values(medicinesByTimeOfDay).reduce(
    (acc, timeSlot) => acc + timeSlot.filter(m => m.status === 'taken').length,
    0
  );

  const pendingDosesToday = Object.values(medicinesByTimeOfDay).reduce(
    (acc, timeSlot) => acc + timeSlot.filter(m => m.status === 'pending' || m.status === 'overdue').length,
    0
  );

  const renderTimeSection = (timeOfDay: TimeOfDay) => {
    const medicines = medicinesByTimeOfDay[timeOfDay];
    if (medicines.length === 0) return null;

    const sectionColor = getTimeOfDayColor(timeOfDay);
    const pendingCount = medicines.filter(m => m.status === 'pending' || m.status === 'overdue').length;
    const takenCount = medicines.filter(m => m.status === 'taken').length;
    const isCurrentTime = currentTimeOfDay === timeOfDay;

    return (
      <View key={timeOfDay} style={styles.timeSection}>
        <View style={[
          styles.timeSectionHeader,
          { backgroundColor: colors.cardBg },
          isCurrentTime && { borderWidth: 2, borderColor: sectionColor }
        ]}>
          <View style={styles.timeSectionHeaderLeft}>
            <View style={[styles.timeSectionIcon, { backgroundColor: `${sectionColor}25` }]}>
              <Ionicons name={getTimeOfDayIcon(timeOfDay)} size={24} color={sectionColor} />
            </View>
            <View style={styles.timeSectionTextContainer}>
              <Text style={[styles.timeSectionTitle, { color: colors.text }]}>
                {timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}
              </Text>
              <Text style={[styles.timeSectionSubtitle, { color: colors.subtleText }]}>
                {getTimeRangeText(timeOfDay)}
              </Text>
            </View>
          </View>
          <View style={styles.timeSectionStats}>
            {takenCount > 0 && (
              <View style={[styles.statPill, { backgroundColor: '#10B98115' }]}>
                <Text style={[styles.statPillText, { color: '#10B981' }]}>
                  {takenCount}
                </Text>
              </View>
            )}
            {pendingCount > 0 && (
              <View style={[styles.pendingPill, { backgroundColor: `${sectionColor}25` }]}>
                <Text style={[styles.pendingPillText, { color: sectionColor }]}>
                  {pendingCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.medicineList}>
          {medicines.map((item, index) => (
            <View key={`${item.medicine._id}-${item.time}-${index}`} style={[
              styles.medicineItem,
              { backgroundColor: colors.cardBg }
            ]}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
              <View style={styles.medicineItemContent}>
                <View style={styles.medicineItemHeader}>
                  <View style={styles.medicineItemLeft}>
                    <Ionicons name="time-outline" size={18} color={colors.subtleText} />
                    <Text style={[styles.medicineItemTime, { color: colors.text }]}>
                      {item.time}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
                    <Ionicons name={getStatusIcon(item.status)} size={14} color={getStatusColor(item.status)} />
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <Text 
                  style={[styles.medicineItemName, { color: colors.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.medicine.name}
                </Text>

                <View style={styles.medicineItemDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="medical-outline" size={14} color={colors.subtleText} />
                    <Text 
                      style={[styles.detailText, { color: colors.subtleText }]}
                      numberOfLines={1}
                    >
                      {item.medicine.dosage}
                    </Text>
                  </View>
                  {item.medicine.foodTiming && (
                    <View style={styles.detailItem}>
                      <Ionicons name="restaurant-outline" size={14} color={colors.subtleText} />
                      <Text 
                        style={[styles.detailText, { color: colors.subtleText }]}
                        numberOfLines={1}
                      >
                        {item.medicine.foodTiming}
                      </Text>
                    </View>
                  )}
                </View>

                {item.medicine.description && (
                  <Text 
                    style={[styles.medicineItemDescription, { color: colors.subtleText }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.medicine.description}
                  </Text>
                )}

                {item.status !== 'taken' && item.status !== 'skipped' && (
                  <View style={styles.medicineItemActions}>
                    <TouchableOpacity
                      style={[styles.miniActionButton, { backgroundColor: '#10B981' }]}
                      onPress={() => markAsTaken(item.medicine._id, item.time)}
                    >
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      <Text style={styles.miniActionText}>Taken</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.miniActionButton, { backgroundColor: '#EF4444' }]}
                      onPress={() => markAsSkipped(item.medicine._id, item.time)}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                      <Text style={styles.miniActionText}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.headerBg}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
          <View style={styles.headerTop}>
            <View style={styles.greetingContainer}>
              <Text style={[styles.greeting, { color: colors.text }]} numberOfLines={1}>
                {greeting}
              </Text>
              <Text 
                style={[styles.userName, { color: colors.subtleText }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {user?.name || 'User'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.emergencyButton, { backgroundColor: '#EF4444' }]}
              onPress={handleEmergencyCall}
              activeOpacity={0.8}
            >
              <Ionicons name="medkit" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.compactStats}>
            <View style={styles.compactStatItem}>
              <Text style={[styles.compactStatNumber, { color: colors.primary }]}>
                {totalDosesToday}
              </Text>
              <Text style={[styles.compactStatLabel, { color: colors.subtleText }]}>
                Total
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.compactStatItem}>
              <Text style={[styles.compactStatNumber, { color: '#10B981' }]}>
                {takenDosesToday}
              </Text>
              <Text style={[styles.compactStatLabel, { color: colors.subtleText }]}>
                Taken
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.compactStatItem}>
              <Text style={[styles.compactStatNumber, { color: '#F59E0B' }]}>
                {pendingDosesToday}
              </Text>
              <Text style={[styles.compactStatLabel, { color: colors.subtleText }]}>
                Pending
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {totalDosesToday === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={80} color={colors.subtleText} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                No Medicines Yet
              </Text>
              <Text style={[styles.emptyStateText, { color: colors.subtleText }]}>
                Start your health journey by adding your first medicine
              </Text>
              <TouchableOpacity 
                style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/medicine/add')}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addFirstButtonText}>Add Medicine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {renderTimeSection('morning')}
              {renderTimeSection('afternoon')}
              {renderTimeSection('evening')}
              {renderTimeSection('night')}
            </>
          )}
        </View>
      </ScrollView>

      {medicines.length > 0 && (
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/medicine/add')}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingContainer: {
    flex: 1,
    marginRight: 12,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    marginBottom: 4,
  },
  userName: {
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
  },
  emergencyButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  compactStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  compactStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  compactStatNumber: {
    fontSize: 24,
    fontFamily: 'Manrope_800ExtraBold',
    marginBottom: 4,
  },
  compactStatLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    opacity: 0.3,
  },
  content: {
    padding: 16,
  },
  timeSection: {
    marginBottom: 24,
  },
  timeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  timeSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  timeSectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  timeSectionTextContainer: {
    flex: 1,
  },
  timeSectionTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 2,
  },
  timeSectionSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
  },
  timeSectionStats: {
    flexDirection: 'row',
    gap: 6,
  },
  statPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    minWidth: 32,
    alignItems: 'center',
  },
  statPillText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  pendingPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    minWidth: 32,
    alignItems: 'center',
  },
  pendingPillText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  medicineList: {
    gap: 10,
  },
  medicineItem: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusIndicator: {
    width: 4,
  },
  medicineItemContent: {
    flex: 1,
    padding: 14,
  },
  medicineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  medicineItemTime: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
  },
  medicineItemName: {
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 6,
  },
  medicineItemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: SCREEN_WIDTH * 0.4,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    flexShrink: 1,
  },
  medicineItemDescription: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 17,
    marginBottom: 10,
  },
  medicineItemActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  miniActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  miniActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontFamily: 'Manrope_700Bold',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  addFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default DashboardScreen;
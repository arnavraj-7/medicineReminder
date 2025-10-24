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

const { width } = Dimensions.get('window');

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
  const { colors, theme } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();

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
      case 'morning': return '#FFA726';
      case 'afternoon': return '#42A5F5';
      case 'evening': return '#AB47BC';
      case 'night': return '#5C6BC0';
    }
  };

  const getTimeOfDayLabel = (timeOfDay: TimeOfDay) => {
    switch (timeOfDay) {
      case 'morning': return 'Morning (5 AM - 12 PM)';
      case 'afternoon': return 'Afternoon (12 PM - 5 PM)';
      case 'evening': return 'Evening (5 PM - 9 PM)';
      case 'night': return 'Night (9 PM - 5 AM)';
    }
  };

  const getFoodTimingIcon = (foodTiming?: string) => {
    switch (foodTiming) {
      case 'before': return 'restaurant-outline';
      case 'after': return 'restaurant';
      case 'with': return 'fast-food-outline';
      default: return 'checkmark-circle-outline';
    }
  };

  const renderMedicineItem = ({ item }: { item: MedicineByTime }) => {
    const statusConfig = {
      pending: { color: colors.warning, icon: 'time-outline', label: 'Pending' },
      taken: { color: colors.success, icon: 'checkmark-circle', label: 'Taken' },
      skipped: { color: colors.subtleText, icon: 'close-circle', label: 'Skipped' },
      overdue: { color: colors.error, icon: 'alert-circle', label: 'Overdue' }
    };

    const config = statusConfig[item.status];

    return (
      <TouchableOpacity 
        style={[styles.medicineItem, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/medicine/${item.medicine._id}`)}
        activeOpacity={0.7}
      >
        <View style={[styles.statusIndicator, { backgroundColor: config.color }]} />
        
        <View style={styles.medicineItemContent}>
          <View style={styles.medicineItemHeader}>
            <View style={styles.medicineItemLeft}>
              <Text style={[styles.medicineItemTime, { color: colors.primary }]}>
                {item.time}
              </Text>
              <Ionicons 
                name={getFoodTimingIcon(item.medicine.foodTiming)} 
                size={16} 
                color={colors.subtleText} 
              />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
              <Ionicons name={config.icon as any} size={14} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
          </View>

          <Text style={[styles.medicineItemName, { color: colors.text }]}>
            {item.medicine.name}
          </Text>
          
          <View style={styles.medicineItemDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="flask-outline" size={14} color={colors.subtleText} />
              <Text style={[styles.detailText, { color: colors.subtleText }]}>
                {item.medicine.dosage}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="repeat-outline" size={14} color={colors.subtleText} />
              <Text style={[styles.detailText, { color: colors.subtleText }]}>
                {item.medicine.frequency}
              </Text>
            </View>
          </View>

          {item.medicine.description && (
            <Text style={[styles.medicineItemDescription, { color: colors.subtleText }]} numberOfLines={2}>
              {item.medicine.description}
            </Text>
          )}

          {item.status === 'pending' && (
            <View style={styles.medicineItemActions}>
              <TouchableOpacity 
                style={[styles.miniActionButton, { backgroundColor: colors.success }]}
                onPress={() => markAsTaken(item.medicine._id, item.time)}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.miniActionText}>Take</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.miniActionButton, { backgroundColor: colors.warning }]}
                onPress={() => markAsSkipped(item.medicine._id, item.time)}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
                <Text style={styles.miniActionText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTimeSection = (timeOfDay: TimeOfDay) => {
    const items = medicinesByTimeOfDay[timeOfDay];
    if (items.length === 0) return null;

    const pendingCount = items.filter(i => i.status === 'pending' || i.status === 'overdue').length;
    const takenCount = items.filter(i => i.status === 'taken').length;
    const isCurrentPeriod = currentTimeOfDay === timeOfDay;

    return (
      <View style={styles.timeSection}>
        <View style={[
          styles.timeSectionHeader,
          isCurrentPeriod && { backgroundColor: getTimeOfDayColor(timeOfDay) + '15' }
        ]}>
          <View style={styles.timeSectionHeaderLeft}>
            <View style={[styles.timeSectionIcon, { backgroundColor: getTimeOfDayColor(timeOfDay) + '20' }]}>
              <Ionicons 
                name={getTimeOfDayIcon(timeOfDay)} 
                size={24} 
                color={getTimeOfDayColor(timeOfDay)} 
              />
            </View>
            <View>
              <Text style={[styles.timeSectionTitle, { color: colors.text }]}>
                {timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}
              </Text>
              <Text style={[styles.timeSectionSubtitle, { color: colors.subtleText }]}>
                {getTimeOfDayLabel(timeOfDay)}
              </Text>
            </View>
          </View>
          <View style={styles.timeSectionStats}>
            <View style={styles.statPill}>
              <Text style={[styles.statPillText, { color: colors.text }]}>
                {takenCount}/{items.length}
              </Text>
            </View>
            {pendingCount > 0 && (
              <View style={[styles.pendingPill, { backgroundColor: colors.error + '20' }]}>
                <Text style={[styles.pendingPillText, { color: colors.error }]}>
                  {pendingCount} pending
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.medicine._id}-${item.time}`}
          renderItem={renderMedicineItem}
          scrollEnabled={false}
          contentContainerStyle={styles.medicineList}
        />
      </View>
    );
  };

  const totalMedicines = medicines.length;
  const totalDosesToday = Object.values(medicinesByTimeOfDay).flat().length;
  const takenToday = Object.values(medicinesByTimeOfDay).flat().filter(m => m.status === 'taken').length;
  const overdueCount = Object.values(medicinesByTimeOfDay).flat().filter(m => m.status === 'overdue').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.greeting, { color: colors.text }]}>
                {greeting}!
              </Text>
              <Text style={[styles.userName, { color: colors.subtleText }]}>
                {user?.name || user?.email || 'User'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.emergencyButton, { backgroundColor: colors.error }]}
              onPress={handleEmergencyCall}
            >
              <Ionicons name="call" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.compactStats}>
            <View style={styles.compactStatItem}>
              <Text style={[styles.compactStatNumber, { color: colors.primary }]}>
                {totalMedicines}
              </Text>
              <Text style={[styles.compactStatLabel, { color: colors.subtleText }]}>
                Medicines
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.compactStatItem}>
              <Text style={[styles.compactStatNumber, { color: colors.success }]}>
                {takenToday}/{totalDosesToday}
              </Text>
              <Text style={[styles.compactStatLabel, { color: colors.subtleText }]}>
                Taken Today
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.compactStatItem}>
              <Text style={[styles.compactStatNumber, { color: colors.error }]}>
                {overdueCount}
              </Text>
              <Text style={[styles.compactStatLabel, { color: colors.subtleText }]}>
                Overdue
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    marginBottom: 20,
  },
  greeting: {
    fontSize: 32,
    fontFamily: 'Manrope_800ExtraBold',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
  },
  emergencyButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    padding: 20,
  },
  timeSection: {
    marginBottom: 28,
  },
  timeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  timeSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeSectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSectionTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 2,
  },
  timeSectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  timeSectionStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  statPillText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
  },
  pendingPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pendingPillText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
  },
  medicineList: {
    gap: 12,
  },
  medicineItem: {
    flexDirection: 'row',
    borderRadius: 16,
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
    padding: 16,
  },
  medicineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  medicineItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medicineItemTime: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  medicineItemName: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 8,
  },
  medicineItemDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
  },
  medicineItemDescription: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 18,
    marginBottom: 12,
  },
  medicineItemActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  miniActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  miniActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
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
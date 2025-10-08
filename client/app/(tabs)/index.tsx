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
  Linking // Import Linking
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router'; // Import useFocusEffect
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/apiClient';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/AuthStore';

const { width } = Dimensions.get('window');

// --- Helper function to check if a date is today ---
const isToday = (someDate: Date) => {
  const today = new Date();
  return someDate.getDate() === today.getDate() &&
    someDate.getMonth() === today.getMonth() &&
    someDate.getFullYear() === today.getFullYear();
};

// Interfaces (Medicine, HistoryEntry, etc.) remain the same
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
}

interface UpcomingMedicine {
  medicine: Medicine;
  nextTime: string;
  timeUntil: string;
  isOverdue: boolean;
}


const DashboardScreen: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [upcomingMedicines, setUpcomingMedicines] = useState<UpcomingMedicine[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  const { colors, theme } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  // --- REVISED AND CORRECTED LOGIC ---
  const calculateUpcomingMedicines = (medicinesList: Medicine[]) => {
    const now = new Date();
    const upcoming: UpcomingMedicine[] = [];

    medicinesList.forEach((medicine) => {
      // Get a mutable count of actions taken today
      let actionsTakenToday = medicine.history.filter(entry => 
        isToday(new Date(entry.timestamp))
      ).length;

      // Sort times chronologically to handle them in order
      const sortedTimes = [...medicine.times].sort();

      sortedTimes.forEach((time) => {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledToday = new Date();
        scheduledToday.setHours(hours, minutes, 0, 0);

        // Check if this specific time slot has passed
        if (scheduledToday < now) {
          // If the time has passed, check if there's an action to account for it
          if (actionsTakenToday > 0) {
            // Assume this action was for this passed time slot
            actionsTakenToday--; // Decrement the count
            return; // Skip this time slot, it's been handled
          }
        }
        
        // --- If the code reaches here, the dose is either upcoming or overdue ---
        
        const nextTime = new Date(scheduledToday);
        // If the time has passed for today, it's for the next day unless it's overdue
        if (nextTime <= now) {
            // Check if it's genuinely overdue or just a past time for a future event
            const isOverdueCheck = (now.getTime() - scheduledToday.getTime()) > 0;
            if(!isOverdueCheck) {
                nextTime.setDate(nextTime.getDate() + 1);
            }
        }
        
        const timeDiff = nextTime.getTime() - now.getTime();
        const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        let timeUntil = '';
        if (hoursUntil > 0) {
          timeUntil = `${hoursUntil}h ${minutesUntil}m`;
        } else {
          timeUntil = `${minutesUntil}m`;
        }
        
        const isOverdue = now > scheduledToday && (now.getTime() - scheduledToday.getTime()) > 30 * 60 * 1000;
        
        upcoming.push({
          medicine,
          nextTime: time,
          timeUntil: isOverdue ? 'Overdue' : (timeDiff < 0 ? 'Upcoming' : timeUntil),
          isOverdue
        });
      });
    });

    // Sort the final list
    upcoming.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return a.nextTime.localeCompare(b.nextTime);
    });

    return upcoming.slice(0, 5);
  };


  const fetchMedicines = async () => {
    try {
      const response = await apiClient.get('/medicines');
      const medicinesData = response.data;
      setMedicines(medicinesData);
      setUpcomingMedicines(calculateUpcomingMedicines(medicinesData));
    } catch (error) {
      if(error.status===401){
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
    }, [])
  );

  const handleEmergencyCall = () => {
    const emergencyContactNumber = user?.emergencyContact;
    // NOTE: This ambulance number should be localized for different regions.
    const ambulanceNumber = '102'; 

    const alertButtons = [];

    // Add the emergency contact option if it exists
    if (emergencyContactNumber) {
        alertButtons.push({
            text: `Call Emergency Contact (${emergencyContactNumber})`,
            onPress: () => {
                Linking.openURL(`tel:${emergencyContactNumber}`).catch(() => {
                    Alert.alert('Error', 'Could not open the phone dialer.');
                });
            },
        });
    }

    // Add the ambulance option
    alertButtons.push({
        text: 'Call Ambulance',
        onPress: () => {
            Linking.openURL(`tel:${ambulanceNumber}`).catch(() => {
                Alert.alert('Error', 'Could not open the phone dialer.');
            });
        },
    });

    // Add the cancel button
    alertButtons.push({
        text: 'Cancel',
        style: 'cancel' as 'cancel',
    });

    Alert.alert(
        'Emergency Call',
        'Select an option to call for help.',
        alertButtons,
        { cancelable: true }
    );
  };

  const markAsTaken = async (medicineId: string) => {
    try {
      await apiClient.post(`/medicines/history/${medicineId}`, { status: 'taken' });
      await fetchMedicines(); 
      Alert.alert('Success', 'Medicine marked as taken!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update medicine status');
    }
  };

  const markAsSkipped = async (medicineId: string) => {
    try {
      await apiClient.post(`/medicines/history/${medicineId}`, { status: 'skipped' });
      await fetchMedicines(); 
      Alert.alert('Medicine Skipped', 'Medicine marked as skipped');
    } catch (error) {
      Alert.alert('Error', 'Failed to update medicine status');
    }
  };

  const deleteMedicine = async (medicineId: string, medicineName: string) => {
    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to delete ${medicineName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/medicines/${medicineId}`);
              await fetchMedicines();
              Alert.alert('Success', 'Medicine deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete medicine');
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setUpcomingMedicines(calculateUpcomingMedicines(medicines));
    }, 60000);

    return () => clearInterval(interval);
  }, [medicines]);

  const renderUpcomingMedicine = ({ item }: { item: UpcomingMedicine }) => (
    <View style={[
      styles.upcomingCard, 
      { 
        backgroundColor: colors.card,
        borderLeftColor: item.isOverdue ? colors.error : colors.primary
      }
    ]}>
      <View style={styles.upcomingHeader}>
        <Text style={[styles.upcomingMedicineName, { color: colors.text }]}>
          {item.medicine.name}
        </Text>
        <Text style={[
          styles.upcomingTime, 
          { color: item.isOverdue ? colors.error : colors.primary }
        ]}>
          {item.nextTime}
        </Text>
      </View>
      <Text style={[styles.upcomingDosage, { color: colors.subtleText }]}>
        {item.medicine.dosage}
      </Text>
      <Text style={[
        styles.timeUntil, 
        { color: item.isOverdue ? colors.error : colors.subtleText }
      ]}>
        {item.timeUntil}
      </Text>
      
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.success }]}
          onPress={() => markAsTaken(item.medicine._id)}
        >
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Take</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.warning }]}
          onPress={() => markAsSkipped(item.medicine._id)}
        >
          <Ionicons name="close" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMedicine = ({ item }: { item: Medicine }) => {
    const lastTaken = item.history.length > 0 
      ? new Date(item.history[item.history.length - 1].timestamp).toLocaleDateString()
      : 'Never';
    
    const foodTimingText = item.foodTiming ? 
      ` • ${item.foodTiming.charAt(0).toUpperCase() + item.foodTiming.slice(1)} food` : '';

    return (
      <TouchableOpacity 
        style={[styles.medicineCard, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/medicine/${item._id}`)}
      >
        <View style={styles.medicineHeader}>
          <View style={styles.medicineInfo}>
            <Text style={[styles.medicineName, { color: colors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.medicineDosage, { color: colors.subtleText }]}>
              {item.dosage} • {item.frequency}{foodTimingText}
            </Text>
            {item.description && (
              <Text style={[styles.medicineDescription, { color: colors.subtleText }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => deleteMedicine(item._id, item.name)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.medicineFooter}>
          <Text style={[styles.medicineTimes, { color: colors.primary }]}>
            Times: {item.times.join(', ')}
          </Text>
          <Text style={[styles.lastTaken, { color: colors.subtleText }]}>
            Last taken: {lastTaken}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>
              {greeting}!
            </Text>
            <Text style={[styles.userName, { color: colors.subtleText }]}>
              {user?.name || user?.email || 'User'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.error }]}
            onPress={handleEmergencyCall}
          >
            <Ionicons name="call-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {medicines.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtleText }]}>
              Total Medicines
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {upcomingMedicines.filter(m => !m.isOverdue).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtleText }]}>
              Upcoming Today
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: colors.error }]}>
              {upcomingMedicines.filter(m => m.isOverdue).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtleText }]}>
              Overdue
            </Text>
          </View>
        </View>

        {/* Upcoming Medicines */}
        {upcomingMedicines.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Next Medicines
            </Text>
            <FlatList
              data={upcomingMedicines}
              keyExtractor={(item) => `${item.medicine._id}-${item.nextTime}`}
              renderItem={renderUpcomingMedicine}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.upcomingList}
            />
          </>
        )}

        {/* All Medicines */}
        <View style={styles.allMedicinesHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            All Medicines
          </Text>
          {medicines.length === 0 && (
            <TouchableOpacity 
              style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/medicine/add')}
            >
              <Text style={styles.addFirstButtonText}>Add First Medicine</Text>
            </TouchableOpacity>
          )}
        </View>

        {medicines.length > 0 ? (
          <FlatList
            data={medicines}
            keyExtractor={(item) => item._id}
            renderItem={renderMedicine}
            scrollEnabled={false}
            contentContainerStyle={styles.medicinesList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={64} color={colors.subtleText} />
            <Text style={[styles.emptyStateText, { color: colors.subtleText }]}>
              No medicines added yet
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.subtleText }]}>
              Start tracking your medications by adding your first medicine
            </Text>
          </View>
        )}
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
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
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_700Bold',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  upcomingList: {
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  upcomingCard: {
    width: width * 0.7,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  upcomingMedicineName: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    flex: 1,
  },
  upcomingTime: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
  },
  upcomingDosage: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    marginBottom: 4,
  },
  timeUntil: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  allMedicinesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  addFirstButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
  },
  medicinesList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  medicineCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 4,
  },
  medicineDosage: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    marginBottom: 4,
  },
  medicineDescription: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 18,
  },
  deleteButton: {
    padding: 8,
  },
  medicineFooter: {
    gap: 4,
  },
  medicineTimes: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
  lastTaken: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default DashboardScreen;


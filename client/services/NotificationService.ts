// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import { Platform } from 'react-native';

// // Type definitions
// interface ScheduledNotificationTrigger {
//   type: 'calendar' | 'timeInterval' | 'daily' | 'weekly' | 'yearly' | 'unknown';
//   repeats: boolean;
//   value?: any;
// }

// interface ScheduledNotification {
//   identifier: string;
//   content: {
//     title: string | null;
//     body: string | null;
//     data: any;
//   };
//   trigger: ScheduledNotificationTrigger;
// }

// // Configure notification behavior
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//     shouldShowBanner: true,
//     shouldShowList: true,
//   }),
// });

// class NotificationService {
//   // Request notification permissions
//   async requestPermissions(): Promise<string | null> {
//     try {
//       if (!Device.isDevice) {
//         console.log('Notifications only work on physical devices');
//         return null;
//       }

//       const { status: existingStatus } = await Notifications.getPermissionsAsync();
//       let finalStatus = existingStatus;

//       if (existingStatus !== 'granted') {
//         const { status } = await Notifications.requestPermissionsAsync();
//         finalStatus = status;
//       }

//       if (finalStatus !== 'granted') {
//         console.log('Failed to get notification permissions');
//         return null;
//       }

//       // Configure notification channel for Android
//       if (Platform.OS === 'android') {
//         await Notifications.setNotificationChannelAsync('medicine-reminders', {
//           name: 'Medicine Reminders',
//           importance: Notifications.AndroidImportance.MAX,
//           vibrationPattern: [0, 250, 250, 250],
//           lightColor: '#FF231F7C',
//           sound: 'default',
//         });
//       }

//       return finalStatus;
//     } catch (error) {
//       console.error('Error requesting notification permissions:', error);
//       return null;
//     }
//   }

//   // Schedule a notification for a specific time
//   async scheduleMedicineNotification(
//     medicineId: string,
//     medicineName: string,
//     dosage: string,
//     time: string,
//     foodTiming?: string
//   ): Promise<string | null> {
//     try {
//       const [hours, minutes] = time.split(':').map(Number);
      
//       let bodyText = `Time to take ${dosage}`;
//       if (foodTiming && foodTiming !== 'anytime') {
//         const timingText = foodTiming === 'before' ? 'before food' :
//                           foodTiming === 'after' ? 'after food' : 'with food';
//         bodyText += ` ${timingText}`;
//       }

//       const trigger = {
//         hour: hours,
//         minute: minutes,
//         repeats: true,
//       };

//       const notificationId = await Notifications.scheduleNotificationAsync({
//         content: {
//           title: `💊 ${medicineName}`,
//           body: bodyText,
//           sound: 'default',
//           priority: Notifications.AndroidNotificationPriority.HIGH,
//           data: {
//             medicineId,
//             time,
//             type: 'medicine-reminder',
//           },
//           ...(Platform.OS === 'android' && {
//             channelId: 'medicine-reminders',
//           }),
//         },
//         trigger,
//       });

//       return notificationId;
//     } catch (error) {
//       console.error('Error scheduling notification:', error);
//       return null;
//     }
//   }

//   // Schedule notifications for all times of a medicine
//   async scheduleMedicineNotifications(medicine: {
//     _id: string;
//     name: string;
//     dosage: string;
//     times: string[];
//     foodTiming?: string;
//   }): Promise<string[]> {
//     try {
//       const notificationIds: string[] = [];

//       for (const time of medicine.times) {
//         const notificationId = await this.scheduleMedicineNotification(
//           medicine._id,
//           medicine.name,
//           medicine.dosage,
//           time,
//           medicine.foodTiming
//         );
//         if (notificationId) {
//           notificationIds.push(notificationId);
//         }
//       }

//       return notificationIds;
//     } catch (error) {
//       console.error('Error scheduling medicine notifications:', error);
//       return [];
//     }
//   }

//   // Cancel all notifications for a medicine
//   async cancelMedicineNotifications(medicineId: string): Promise<number> {
//     try {
//       const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
//       const notificationsToCancel = scheduledNotifications
//         .filter((notification: any) => notification.content.data?.medicineId === medicineId)
//         .map((notification: any) => notification.identifier);

//       for (const id of notificationsToCancel) {
//         await Notifications.cancelScheduledNotificationAsync(id);
//       }

//       return notificationsToCancel.length;
//     } catch (error) {
//       console.error('Error canceling notifications:', error);
//       return 0;
//     }
//   }

//   // Cancel all scheduled notifications
//   async cancelAllNotifications(): Promise<void> {
//     try {
//       await Notifications.cancelAllScheduledNotificationsAsync();
//     } catch (error) {
//       console.error('Error canceling all notifications:', error);
//     }
//   }

//   // Get all scheduled notifications
//   async getAllScheduledNotifications(): Promise<any[]> {
//     try {
//       return await Notifications.getAllScheduledNotificationsAsync();
//     } catch (error) {
//       console.error('Error getting scheduled notifications:', error);
//       return [];
//     }
//   }

//   // Send immediate notification (for testing or immediate reminders)
//   async sendImmediateNotification(title: string, body: string, data?: any): Promise<void> {
//     try {
//       await Notifications.scheduleNotificationAsync({
//         content: {
//           title,
//           body,
//           sound: 'default',
//           data: data || {},
//           ...(Platform.OS === 'android' && {
//             channelId: 'medicine-reminders',
//           }),
//         },
//         trigger: null,
//       });
//     } catch (error) {
//       console.error('Error sending immediate notification:', error);
//     }
//   }

//   // Setup notification response listener
//   setupNotificationListeners(
//     onNotificationReceived?: (notification: Notifications.Notification) => void,
//     onNotificationResponse?: (response: Notifications.NotificationResponse) => void
//   ): () => void {
//     // Listener for when notification is received while app is open
//     const receivedListener = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
//       console.log('Notification received:', notification);
//       if (onNotificationReceived) {
//         onNotificationReceived(notification);
//       }
//     });

//     // Listener for when user taps on notification
//     const responseListener = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
//       console.log('Notification response:', response);
//       if (onNotificationResponse) {
//         onNotificationResponse(response);
//       }
//     });

//     // Return cleanup function
//     return () => {
//       receivedListener.remove();
//       responseListener.remove();
//     };
//   }
// }

// export default new NotificationService();
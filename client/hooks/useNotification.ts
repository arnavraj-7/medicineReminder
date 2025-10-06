// import { useEffect } from 'react';
// import { useRouter } from 'expo-router';
// import * as Notifications from 'expo-notifications';
// import NotificationService from '@/services/NotificationService';

// /**
//  * Custom hook to manage medicine notifications
//  * Place this in your app's root layout or main component
//  */
// export const useNotifications = () => {
//   const router = useRouter();

//   useEffect(() => {
//     // Request permissions when app loads
//     const setupNotifications = async () => {
//       try {
//         const status = await NotificationService.requestPermissions();
//         if (status === 'granted') {
//           console.log('Notification permissions granted');
//         } else {
//           console.log('Notification permissions denied');
//         }
//       } catch (error) {
//         console.error('Error setting up notifications:', error);
//       }
//     };

//     setupNotifications();

//     // Setup listeners for notifications
//     const cleanup = NotificationService.setupNotificationListeners(
//       // When notification is received (app is open)
//       (notification: Notifications.Notification) => {
//         console.log('Notification received:', notification);
//         // You can show a custom in-app notification here if needed
//       },
//       // When user taps on notification
//       (response: Notifications.NotificationResponse) => {
//         console.log('Notification tapped:', response);
//         const data = response.notification.request.content.data;
        
//         // Navigate to medicine detail if medicineId is present
//         if (data?.medicineId) {
//           try {
//             router.push(`/medicine/${data.medicineId}`);
//           } catch (error) {
//             console.error('Navigation error:', error);
//           }
//         }
//       }
//     );

//     return cleanup;
//   }, [router]);

//   return {
//     scheduleNotifications: NotificationService.scheduleMedicineNotifications.bind(NotificationService),
//     cancelNotifications: NotificationService.cancelMedicineNotifications.bind(NotificationService),
//     sendImmediate: NotificationService.sendImmediateNotification.bind(NotificationService),
//   };
// };

// export default useNotifications;
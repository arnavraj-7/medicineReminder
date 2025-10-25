import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  async requestPermissions() {
    try {
      if (!Device.isDevice) {
        console.warn('Notifications only work on physical devices');
        return false;
      }
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async setupAndroidChannel() {
    await Notifications.setNotificationChannelAsync('medicine-reminders', {
      name: 'Medicine Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableVibrate: true,
      lightColor: '#FF6B6B',
    });
  }

  /**
   * THE CORRECT FIX - Uses DailyTriggerInput with proper type
   * 
   * Key: Must include type: Notifications.SchedulableTriggerInputTypes.DAILY
   * This prevents immediate firing!
   */
  async scheduleMedicineReminders(medicineName, times, medicineId) {
    try {
      const notificationIds = [];

      for (const time of times) {
        const [hours, minutes] = time.split(':').map(Number);

        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          console.error(`❌ Invalid time format: ${time}`);
          continue;
        }

        const now = new Date();
        console.log(`\n⏰ Scheduling ${time} for ${medicineName}`);
        console.log(`   Current time: ${now.toLocaleTimeString()}`);

        // Use DAILY trigger with TYPE specified - this is the key!
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 Time for ${medicineName}`,
            body: `Don't forget to take your medicine at ${time}`,
            sound: 'default',
            data: {
              medicineId,
              time,
              type: 'medicine_reminder',
              medicineName,
              scheduledTime: time,
              hours,
              minutes,
            },
            ...(Platform.OS === 'android' && {
              channelId: 'medicine-reminders',
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY, // THIS IS THE KEY!
            hour: hours,
            minute: minutes,
            repeats: true,
          },
        });

        notificationIds.push(notificationId);
        console.log(`   ✅ Notification ID: ${notificationId}`);
        console.log(`   🎯 Will fire daily at ${time}`);
      }

      console.log(`\n✅ COMPLETED: Scheduled ${notificationIds.length} notification(s) for ${medicineName}\n`);
      return notificationIds;
    } catch (error) {
      console.error('❌ Error scheduling medicine reminders:', error);
      throw error;
    }
  }

  async sendImmediateNotification({ title, body, data = {} }) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: { ...data, type: 'immediate' },
          ...(Platform.OS === 'android' && { channelId: 'medicine-reminders' }),
        },
        trigger: null,
      });
      console.log(`✅ Sent immediate notification (ID: ${notificationId})`);
      return notificationId;
    } catch (error) {
      console.error('Error sending immediate notification:', error);
      throw error;
    }
  }

  async cancelNotifications(notificationIds) {
    try {
      for (const id of notificationIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
        console.log(`🗑️ Cancelled notification: ${id}`);
      }
    } catch (error) {
      console.error('Error cancelling notifications:', error);
      throw error;
    }
  }

  async cancelNotificationsByMedicineId(medicineId) {
    try {
      if (!medicineId) {
        console.warn('cancelNotificationsByMedicineId called without a medicineId.');
        return;
      }
      const allScheduledNotifications = await this.getAllScheduledNotifications();
      const notificationIdsToCancel = allScheduledNotifications
        .filter(notif => notif.content.data && notif.content.data.medicineId === medicineId)
        .map(notif => notif.identifier);
      if (notificationIdsToCancel.length > 0) {
        console.log(`Found ${notificationIdsToCancel.length} notifications to cancel for medicineId: ${medicineId}`);
        await this.cancelNotifications(notificationIdsToCancel);
      } else {
        console.log(`No scheduled notifications found for medicineId: ${medicineId}. Nothing to cancel.`);
      }
    } catch (error) {
      console.error(`Failed to cancel notifications for medicineId ${medicineId}:`, error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Cancelled all scheduled notifications');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
      throw error;
    }
  }

  async getAllScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  async updateMedicineReminders(medicineId, medicineName, newTimes) {
    try {
      console.log(`\n🔄 Updating reminders for ${medicineName} (ID: ${medicineId})`);
      await this.cancelNotificationsByMedicineId(medicineId);
      const newNotificationIds = await this.scheduleMedicineReminders(
        medicineName,
        newTimes,
        medicineId
      );
      return newNotificationIds;
    } catch (error) {
      console.error('Error updating medicine reminders:', error);
      throw error;
    }
  }

  addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
  
  async debugScheduledNotifications() {
    try {
      const notifications = await this.getAllScheduledNotifications();
      console.log('\n📋 ===== SCHEDULED NOTIFICATIONS DEBUG =====');
      console.log(`Total scheduled: ${notifications.length}\n`);
      
      if (notifications.length === 0) {
        console.log('No scheduled notifications found.');
      } else {
        notifications.forEach((notif, index) => {
          const data = notif.content.data || {};
          console.log(`Notification ${index + 1}:`);
          console.log(`  ID: ${notif.identifier}`);
          console.log(`  Title: ${notif.content.title}`);
          console.log(`  Body: ${notif.content.body}`);
          console.log(`  Medicine: ${data.medicineName || 'N/A'}`);
          console.log(`  Time: ${data.time || 'N/A'}`);
          console.log(`  Occurrence: ${data.occurrence || 'N/A'}`);
          console.log(`  Trigger:`, JSON.stringify(notif.trigger, null, 2));
          console.log('---');
        });
      }
      
      console.log('==========================================\n');
      return notifications;
    } catch (error) {
      console.error('Error debugging notifications:', error);
      return [];
    }
  }

  /**
   * Test helper - schedules a notification X minutes from now
   */
  async scheduleTestNotification(minutesFromNow = 1) {
    const testTime = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const timeStr = `${testTime.getHours().toString().padStart(2, '0')}:${testTime.getMinutes().toString().padStart(2, '0')}`;
    
    console.log(`🧪 Scheduling test notification for ${timeStr} (${minutesFromNow} minute(s) from now)`);
    
    return await this.scheduleMedicineReminders(
      'Test Medicine',
      [timeStr],
      'test-' + Date.now()
    );
  }
}

export default new NotificationService();
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
         console.warn('Project ID not found in app.json. Ensure you have configured EAS.');
      }
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Push token:', token);
    } catch (e) {
      console.warn(e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return true;
}

export async function scheduleDailyStreakReminder() {
  try {
    // Cancel all previously scheduled notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule a daily reminder at 10:00 AM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔥 Keep your streak alive!",
        body: "Don't forget to complete your daily AI task to maintain your Founder Streak.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 10,
        minute: 0,
      },
    });
    console.log('Daily streak reminder scheduled for 10:00 AM');
  } catch (error) {
    console.warn('Failed to schedule streak reminder:', error);
  }
}



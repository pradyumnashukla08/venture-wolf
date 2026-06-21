import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<boolean> {
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
    // Note: We are just getting permissions for LOCAL notifications right now,
    // so we don't strictly need to grab and store an ExpoPushToken, but it's
    // standard practice if we ever move to remote pushes.
    return true;
  } else {
    console.log('Must use physical device for Push Notifications');
    // We can still return true for simulators to test local notifications on iOS simulators
    return true; 
  }
}

export async function scheduleDailyStreakReminder() {
  // Clear any existing notifications so we don't stack them up if this is called multiple times
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Keep your momentum going! 🔥",
      body: "Log in to complete your daily startup task and build your streak.",
      sound: true,
    },
    trigger: {
      hour: 10,
      minute: 0,
      repeats: true,
    } as any,
  });
  
  console.log("Daily streak reminder scheduled for 10:00 AM.");
}

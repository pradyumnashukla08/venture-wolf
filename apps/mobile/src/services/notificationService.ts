import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import Constants from 'expo-constants';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
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
      return undefined;
    }
    
    // Get the token that uniquely identifies this device
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      if (!projectId) {
         console.warn('Project ID not found in app.json for push notifications');
      }
      
      const tokenObj = await Notifications.getExpoPushTokenAsync({ projectId });
      token = tokenObj.data;
      
      // Save token to Firestore so the backend can send notifications
      if (auth.currentUser && token) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), { pushToken: token }, { merge: true });
      }
      
    } catch (e) {
      console.error('Error getting push token', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function scheduleDailyStreakReminder() {
  // Cancel existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule a daily reminder at 10:00 AM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔥 Keep Your Streak Alive!",
      body: "Don't forget to log in today to maintain your founder streak and unlock AI insights.",
      data: { type: 'streak_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 10,
      minute: 0,
    },
  });
}

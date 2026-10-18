import { useState, useEffect } from 'react';
import type * as NotificationsType from 'expo-notifications';
import Constants from 'expo-constants';

export interface PushNotificationState {
  expoPushToken?: NotificationsType.ExpoPushToken;
  notification?: NotificationsType.Notification;
}

export const usePushNotifications = (): PushNotificationState => {
  const [expoPushToken, setExpoPushToken] = useState<NotificationsType.ExpoPushToken>();
  const [notification, setNotification] = useState<NotificationsType.Notification>();

  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  useEffect(() => {
    if (isExpoGo) {
      console.log('Push notifications are not supported in Expo Go. Bypassing safely.');
      return;
    }

    // Dynamic require to prevent Metro from executing the module at startup
    // which causes a hard crash in Expo Go SDK 53+.
    try {
      const Notifications = require('expo-notifications');
      
      Notifications.getPermissionsAsync().then((statusObj: any) => {
         if (statusObj.status === 'granted') {
             Notifications.getExpoPushTokenAsync().then((token: any) => setExpoPushToken(token));
         }
      });
    } catch (e) {
      console.log('Push notifications disabled.');
    }
  }, [isExpoGo]);

  return {
    expoPushToken,
    notification,
  };
};

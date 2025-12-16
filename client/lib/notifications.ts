import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Geofence } from './zeke-api-adapter';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function checkNotificationPermissions(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  if (Platform.OS === 'web') {
    return { granted: false, canAskAgain: false };
  }

  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return {
    granted: status === 'granted',
    canAskAgain: canAskAgain ?? true,
  };
}

export async function showGeofenceNotification(
  geofence: Geofence,
  event: 'enter' | 'exit'
): Promise<void> {
  const action = event === 'enter' ? 'entered' : 'left';
  const title = `Location Alert`;
  const body = `You have ${action} ${geofence.name}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        type: 'geofence',
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        event,
      },
    },
    trigger: null,
  });
}

export async function showGroceryPromptNotification(
  geofence: Geofence
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Grocery Reminder',
      body: `You're near ${geofence.name}. Don't forget to check your grocery list!`,
      data: {
        type: 'grocery_prompt',
        geofenceId: geofence.id,
        geofenceName: geofence.name,
      },
    },
    trigger: null,
  });
}

export async function showCustomGeofenceNotification(
  geofence: Geofence,
  event: 'enter' | 'exit'
): Promise<void> {
  const action = event === 'enter' ? 'arrived at' : 'left';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: geofence.name,
      body: `You ${action} this location`,
      data: {
        type: 'custom',
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        event,
        actionData: geofence.actionData,
      },
    },
    trigger: null,
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import api from './api';

/**
 * Request notification permissions
 */
export async function requestPermission() {
  try {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (!enabled) {
        console.warn('Notification permission denied');
        return false;
      }
      return true;
    } else {
      // Android permissions are handled automatically
      return true;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get FCM token
 */
export async function getFCMToken() {
  try {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      return null;
    }

    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Register FCM token with backend
 */
export async function registerFCMToken() {
  try {
    const token = await getFCMToken();
    if (!token) {
      return false;
    }

    // Store token locally
    await AsyncStorage.setItem('fcmToken', token);

    // Register with backend
    try {
      await api.post('/users/me/tokens', {
        token,
        tokenType: 'fcm',
        deviceType: Platform.OS,
        deviceId: Platform.OS === 'ios' ? await messaging().getAPNSToken() : null
      });
      console.log('✅ FCM token registered');
      return true;
    } catch (error) {
      console.error('Error registering FCM token:', error);
      return false;
    }
  } catch (error) {
    console.error('Error in registerFCMToken:', error);
    return false;
  }
}

/**
 * Setup push notification handlers
 */
export function setupPushHandlers(navigation, onEmergencyReceived) {
  // Handle notification when app is in foreground
  messaging().onMessage(async remoteMessage => {
    console.log('📬 Push notification received (foreground):', remoteMessage);
    
    const { notification, data } = remoteMessage;
    
    if (data?.type === 'emergency' && data?.emergencyId) {
      // Emergency notification
      if (onEmergencyReceived) {
        onEmergencyReceived({
          emergencyId: data.emergencyId,
          bloodGroup: data.bloodGroup,
          urgency: data.urgency,
          hospitalName: data.hospitalName,
          hospitalBedNumber: data.hospitalBedNumber,
          notification
        });
      }
    } else {
      // Other notifications
      // Show in-app notification
      console.log('Notification:', notification);
    }
  });

  // Handle notification when app is opened from background/quit state
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('📬 Notification opened app:', remoteMessage);
    
    const { data } = remoteMessage;
    
    if (data?.type === 'emergency' && data?.emergencyId) {
      // Navigate to emergency screen
      navigation.navigate('BloodRequest', { 
        emergencyId: data.emergencyId 
      });
    }
  });

  // Check if app was opened from a notification
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('📬 App opened from notification:', remoteMessage);
        
        const { data } = remoteMessage;
        if (data?.type === 'emergency' && data?.emergencyId) {
          navigation.navigate('BloodRequest', { 
            emergencyId: data.emergencyId 
          });
        }
      }
    });

  // Handle token refresh
  messaging().onTokenRefresh(token => {
    console.log('📬 FCM token refreshed:', token);
    registerFCMToken();
  });
}

/**
 * Unregister FCM token
 */
export async function unregisterFCMToken() {
  try {
    const token = await AsyncStorage.getItem('fcmToken');
    if (token) {
      // Remove from backend
      try {
        await api.delete(`/users/me/tokens/fcm/${token}`);
      } catch (error) {
        console.error('Error unregistering FCM token:', error);
      }
      
      // Remove local token
      await AsyncStorage.removeItem('fcmToken');
      
      // Delete token from FCM
      await messaging().deleteToken();
    }
  } catch (error) {
    console.error('Error in unregisterFCMToken:', error);
  }
}

export default {
  requestPermission,
  getFCMToken,
  registerFCMToken,
  setupPushHandlers,
  unregisterFCMToken
};


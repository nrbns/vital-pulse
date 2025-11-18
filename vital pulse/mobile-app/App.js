/**
 * Pulse - Global Emergency Health Platform
 * React Native Mobile App
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './src/i18n';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';
import BloodRequestScreen from './src/screens/BloodRequestScreen';
import DonorScreen from './src/screens/DonorScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { initializeSocket } from './src/services/websocket';
import { registerFCMToken, setupPushHandlers } from './src/services/pushNotifications';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#e63946',
        tabBarInactiveTintColor: '#6c757d',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => null, // Add icons later
        }}
      />
      <Tab.Screen 
        name="Emergency" 
        component={EmergencyScreen}
        options={{
          title: t('tabs.emergency'),
          tabBarIcon: ({ color, size }) => null,
        }}
      />
      <Tab.Screen 
        name="Donate" 
        component={DonorScreen}
        options={{
          title: t('tabs.donate'),
          tabBarIcon: ({ color, size }) => null,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => null,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [navigationRef, setNavigationRef] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check authentication status
      const token = await AsyncStorage.getItem('authToken');
      
      if (token) {
        // Initialize WebSocket with existing token
        try {
          initializeSocket(token);
          await registerFCMToken();
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error initializing socket:', error);
          // Token might be invalid, clear it
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('refreshToken');
        }
      }

      // Setup push notification handlers
      if (navigationRef) {
        setupPushHandlers(navigationRef, (emergency) => {
          // Handled in HomeScreen
        });
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer
        ref={(ref) => {
          setNavigationRef(ref);
          if (ref && !isLoading) {
            setupPushHandlers(ref, (emergency) => {
              // Emergency notification handler
            });
          }
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen 
                name="BloodRequest" 
                component={BloodRequestScreen}
                options={{ 
                  headerShown: true, 
                  title: 'Blood Request',
                  headerStyle: { backgroundColor: '#e63946' },
                  headerTintColor: '#ffffff'
                }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}


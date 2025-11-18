// Mock AsyncStorage
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock Firebase
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: () => ({
    requestPermission: jest.fn().mockResolvedValue(1),
    getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
    onMessage: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn().mockResolvedValue(null),
    onTokenRefresh: jest.fn(),
    deleteToken: jest.fn().mockResolvedValue(true)
  })
}));

// Mock Geolocation
jest.mock('react-native-geolocation-service', () => ({
  requestAuthorization: jest.fn().mockResolvedValue('granted'),
  getCurrentPosition: jest.fn((success) => {
    success({
      coords: {
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 10
      }
    });
  }),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn()
}));

// Mock Socket.IO
jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true
  }))
}));

// Mock Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn()
  }),
  useRoute: () => ({
    params: {}
  }),
  NavigationContainer: ({ children }) => children
}));

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};


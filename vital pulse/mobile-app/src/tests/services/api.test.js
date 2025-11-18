import { auth, emergencies, donors } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage');

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue('mock-token');
  });

  describe('auth', () => {
    test('requestOTP should call correct endpoint', async () => {
      axios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({
          success: true,
          message: 'OTP sent'
        })
      });

      await auth.requestOTP('+911234567890', 'IN');
      expect(axios.create).toHaveBeenCalled();
    });
  });

  describe('emergencies', () => {
    test('create should call POST /blood-requests', async () => {
      const mockAxios = {
        post: jest.fn().mockResolvedValue({
          success: true,
          request: { id: '123' }
        })
      };
      axios.create.mockReturnValue(mockAxios);

      await emergencies.create({
        bloodGroup: 'O+',
        hospitalName: 'Test Hospital',
        hospitalBedNumber: 'ICU-205'
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        '/blood-requests',
        expect.objectContaining({
          bloodGroup: 'O+',
          hospitalName: 'Test Hospital',
          hospitalBedNumber: 'ICU-205'
        })
      );
    });
  });
});


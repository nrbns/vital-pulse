const { checkRateLimit, validateBloodRequest, maskPhoneNumber } = require('../../src/utils/safety');

describe('Safety Utilities', () => {
  describe('checkRateLimit', () => {
    test('should allow request within rate limit', async () => {
      const userId = 'test-user-id';
      const result = await checkRateLimit(userId, 'request', 3, 24 * 60 * 60 * 1000);
      expect(result.allowed).toBe(true);
    });

    test('should reject request exceeding rate limit', async () => {
      const userId = 'test-user-id-exceed';
      // Simulate multiple requests
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(userId, 'request', 3, 24 * 60 * 60 * 1000);
      }
      const result = await checkRateLimit(userId, 'request', 3, 24 * 60 * 60 * 1000);
      expect(result.allowed).toBe(false);
    });
  });

  describe('validateBloodRequest', () => {
    test('should validate correct blood request', () => {
      const request = {
        bloodGroup: 'O+',
        hospitalName: 'Test Hospital',
        hospitalBedNumber: 'ICU-205',
        urgency: 'high',
        hospitalLatitude: 12.9716,
        hospitalLongitude: 77.5946
      };

      const result = validateBloodRequest(request);
      expect(result.valid).toBe(true);
    });

    test('should reject request without hospital name', () => {
      const request = {
        bloodGroup: 'O+',
        hospitalBedNumber: 'ICU-205',
        urgency: 'high'
      };

      const result = validateBloodRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('hospitalName is required');
    });

    test('should reject request without bed number', () => {
      const request = {
        bloodGroup: 'O+',
        hospitalName: 'Test Hospital',
        urgency: 'high'
      };

      const result = validateBloodRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('hospitalBedNumber is required');
    });
  });

  describe('maskPhoneNumber', () => {
    test('should mask phone number correctly', () => {
      const phone = '+911234567890';
      const masked = maskPhoneNumber(phone);
      expect(masked).toMatch(/\*\*\*\*\*\*\*890/);
      expect(masked).not.toContain('123456');
    });

    test('should handle short phone numbers', () => {
      const phone = '+91123';
      const masked = maskPhoneNumber(phone);
      expect(masked).toContain('***');
    });
  });
});


import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { auth, tokens } from '../services/api';
import { initializeSocket } from '../services/websocket';
import { registerFCMToken } from '../services/pushNotifications';
import { useRegion, getRegionColors } from '../hooks/useRegion';

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { region } = useRegion();
  const colors = getRegionColors(region?.code || 'default');
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState(region?.code || 'IN');

  useEffect(() => {
    // Check if already logged in
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const token = await tokens.get();
      if (token) {
        // Token exists, try to initialize socket and navigate
        initializeSocket(token);
        navigation.replace('Main');
      }
    } catch (error) {
      // No existing auth
    }
  };

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert(t('common.error'), 'Please enter a valid phone number');
      return;
    }

    // Format phone number (add country code if not present)
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      formattedPhone = countryCode === 'IN' ? `+91${phone}` : `+${phone}`;
    }

    setLoading(true);
    try {
      await auth.requestOTP(formattedPhone, countryCode);
      setStep('otp');
      Alert.alert(t('common.success'), t('auth.otpSent', { phone: formattedPhone }));
    } catch (error) {
      Alert.alert(t('common.error'), error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert(t('common.error'), 'Please enter a valid OTP');
      return;
    }

    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      formattedPhone = countryCode === 'IN' ? `+91${phone}` : `+${phone}`;
    }

    setLoading(true);
    try {
      const result = await auth.verifyOTP(formattedPhone, otp);
      
      // Store tokens
      await tokens.save(result.token, result.refreshToken);
      
      // Initialize WebSocket
      initializeSocket(result.token);
      
      // Register FCM token
      await registerFCMToken();
      
      // Navigate to home
      navigation.replace('Main');
    } catch (error) {
      Alert.alert(t('common.error'), error.message || t('auth.invalidOTP'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🩸 Pulse</Text>
      
      {step === 'phone' ? (
        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.phoneNumber')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.enterPhoneNumber')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoFocus
          />
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleSendOTP}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('common.loading') : t('auth.sendOTP')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.enterOTP')}</Text>
          <TextInput
            style={styles.input}
            placeholder="000000"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleVerifyOTP}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('common.loading') : t('auth.verifyOTP')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep('phone')} style={styles.linkButton}>
            <Text style={styles.linkText}>{t('auth.resendOTP')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#e63946',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#212529',
  },
  input: {
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    minHeight: 56,
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    minHeight: 56,
    justifyContent: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#e63946',
    fontSize: 14,
  },
});


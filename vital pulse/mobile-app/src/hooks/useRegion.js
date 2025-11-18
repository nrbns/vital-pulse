import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import Geolocation from 'react-native-geolocation-service';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Regional Adaptation Hook
 * Auto-detects country from device/GPS and loads region config
 */
export function useRegion() {
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { i18n } = useTranslation();

  useEffect(() => {
    detectRegion();
  }, []);

  const detectRegion = async () => {
    try {
      setLoading(true);
      
      // Priority: Saved preference > GPS > Device locale > Default
      const savedRegion = await AsyncStorage.getItem('user_region');
      if (savedRegion) {
        await loadRegion(savedRegion);
        setLoading(false);
        return;
      }

      // Try GPS location
      try {
        const hasPermission = await Geolocation.requestAuthorization('whenInUse');
        if (hasPermission === 'granted') {
          Geolocation.getCurrentPosition(
            async (position) => {
              const countryCode = await getCountryFromCoordinates(
                position.coords.latitude,
                position.coords.longitude
              );
              if (countryCode) {
                await loadRegion(countryCode);
              } else {
                await loadRegionFromDevice();
              }
            },
            async () => {
              // GPS failed, fallback to device locale
              await loadRegionFromDevice();
            },
            { enableHighAccuracy: false, timeout: 5000 }
          );
        } else {
          await loadRegionFromDevice();
        }
      } catch (error) {
        console.warn('GPS detection failed:', error);
        await loadRegionFromDevice();
      }
    } catch (error) {
      console.error('Region detection error:', error);
      setError(error);
      // Fallback to default
      await loadRegion('US'); // Default to US/English
    } finally {
      setLoading(false);
    }
  };

  const loadRegionFromDevice = async () => {
    try {
      // Get device locale
      const locale = Platform.OS === 'ios' 
        ? require('react-native-localize').getLocales()[0]?.countryCode
        : require('react-native-localize').getLocales()[0]?.countryCode;
      
      if (locale) {
        await loadRegion(locale.toUpperCase());
      } else {
        await loadRegion('US'); // Default fallback
      }
    } catch (error) {
      console.warn('Device locale detection failed:', error);
      await loadRegion('US'); // Default fallback
    }
  };

  const getCountryFromCoordinates = async (lat, lng) => {
    try {
      // Use reverse geocoding API (free tier available)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      return data.countryCode;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return null;
    }
  };

  const loadRegion = async (countryCode) => {
    try {
      // Load region config from API or local cache
      const regionConfig = await loadRegionConfig(countryCode);
      
      // Update i18n language based on region
      if (regionConfig?.languages?.default) {
        await i18n.changeLanguage(regionConfig.languages.default);
      }

      // Save region preference
      await AsyncStorage.setItem('user_region', countryCode);
      
      setRegion({
        code: countryCode,
        ...regionConfig
      });
    } catch (error) {
      console.error('Failed to load region config:', error);
      // Fallback to default config
      setRegion({
        code: countryCode || 'US',
        emergencyNumbers: { ambulance: '911', police: '911' },
        languages: { default: 'en' }
      });
    }
  };

  const loadRegionConfig = async (countryCode) => {
    try {
      // Try API first
      const response = await fetch(
        `http://localhost:3000/api/v1/regions/${countryCode}/config`
      );
      if (response.ok) {
        const config = await response.json();
        return config;
      }
    } catch (error) {
      console.warn('API config load failed, using cache:', error);
    }

    // Fallback to cached config
    try {
      const cached = await AsyncStorage.getItem(`region_config_${countryCode}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache load failed:', error);
    }

    // Default config
    return {
      emergencyNumbers: { ambulance: '911', police: '911' },
      languages: { default: 'en', supported: ['en'] },
      bloodRules: {
        minAge: 18,
        maxAge: 65,
        donationIntervalDays: 56
      }
    };
  };

  const updateRegion = async (countryCode) => {
    await loadRegion(countryCode);
  };

  return {
    region,
    loading,
    error,
    updateRegion,
    reloadRegion: detectRegion
  };
}

/**
 * Get region-specific color scheme
 */
export function getRegionColors(regionCode) {
  const colorSchemes = {
    IN: {
      primary: '#E63946', // Indian red
      secondary: '#F1FAEE',
      accent: '#A8DADC',
      emergency: '#D32F2F',
      trust: '#457B9D'
    },
    NG: {
      primary: '#008751', // Nigerian green
      secondary: '#FFFFFF',
      accent: '#FFCE00',
      emergency: '#D32F2F',
      trust: '#1E88E5'
    },
    BR: {
      primary: '#FFE4E1', // Brazilian pink tint
      secondary: '#F0F8FF',
      accent: '#FF6B6B',
      emergency: '#D32F2F',
      trust: '#4ECDC4'
    },
    US: {
      primary: '#1E88E5', // American blue
      secondary: '#FFFFFF',
      accent: '#43A047',
      emergency: '#D32F2F',
      trust: '#5E35B1'
    },
    default: {
      primary: '#E3F2FD', // Universal calm blue
      secondary: '#FFFFFF',
      accent: '#A8DADC',
      emergency: '#D32F2F',
      trust: '#2196F3'
    }
  };

  return colorSchemes[regionCode] || colorSchemes.default;
}

/**
 * Get emergency number for region
 */
export function getEmergencyNumber(regionCode, type = 'ambulance') {
  const numbers = {
    IN: { ambulance: '108', police: '100', fire: '101' },
    NG: { ambulance: '767', police: '112', fire: '112' },
    BR: { ambulance: '192', police: '190', fire: '193' },
    US: { ambulance: '911', police: '911', fire: '911' },
    EU: { ambulance: '112', police: '112', fire: '112' },
    default: { ambulance: '911', police: '911', fire: '911' }
  };

  return numbers[regionCode]?.[type] || numbers.default[type];
}

export default useRegion;


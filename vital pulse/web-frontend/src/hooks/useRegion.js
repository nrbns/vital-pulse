import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Regional Adaptation Hook (Web Version)
 */
export function useRegion() {
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectRegion();
  }, []);

  const detectRegion = async () => {
    try {
      // Try to get from localStorage first
      const savedRegion = localStorage.getItem('user_region');
      if (savedRegion) {
        await loadRegion(savedRegion);
        setLoading(false);
        return;
      }

      // Try geolocation API
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const countryCode = await getCountryFromCoordinates(
              position.coords.latitude,
              position.coords.longitude
            );
            if (countryCode) {
              await loadRegion(countryCode);
            } else {
              await loadRegionFromBrowser();
            }
            setLoading(false);
          },
          async () => {
            await loadRegionFromBrowser();
            setLoading(false);
          }
        );
      } else {
        await loadRegionFromBrowser();
        setLoading(false);
      }
    } catch (error) {
      console.warn('Region detection failed:', error);
      await loadRegion('US'); // Default
      setLoading(false);
    }
  };

  const loadRegionFromBrowser = async () => {
    const locale = navigator.language || navigator.userLanguage;
    const countryCode = locale.split('-')[1]?.toUpperCase() || 'US';
    await loadRegion(countryCode);
  };

  const getCountryFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      return data.countryCode;
    } catch (error) {
      return null;
    }
  };

  const loadRegion = async (countryCode) => {
    try {
      // Load from API or default config
      const response = await fetch(`http://localhost:3000/api/v1/regions/${countryCode}/config`);
      const config = response.ok ? await response.json() : getDefaultConfig(countryCode);
      
      if (config?.languages?.default && i18n) {
        i18n.changeLanguage(config.languages.default);
      }

      localStorage.setItem('user_region', countryCode);
      setRegion({ code: countryCode, ...config });
    } catch (error) {
      const defaultConfig = getDefaultConfig(countryCode);
      setRegion({ code: countryCode, ...defaultConfig });
    }
  };

  const getDefaultConfig = (code) => ({
    emergencyNumbers: { ambulance: '911', police: '911' },
    languages: { default: 'en', supported: ['en'] },
    bloodRules: { minAge: 18, maxAge: 65, donationIntervalDays: 56 }
  });

  return { region, loading, updateRegion: loadRegion };
}

export function getRegionColors(regionCode) {
  const colorSchemes = {
    IN: { primary: '#E63946', secondary: '#F1FAEE', accent: '#A8DADC', emergency: '#D32F2F', trust: '#457B9D' },
    NG: { primary: '#008751', secondary: '#FFFFFF', accent: '#FFCE00', emergency: '#D32F2F', trust: '#1E88E5' },
    BR: { primary: '#FFE4E1', secondary: '#F0F8FF', accent: '#FF6B6B', emergency: '#D32F2F', trust: '#4ECDC4' },
    US: { primary: '#1E88E5', secondary: '#FFFFFF', accent: '#43A047', emergency: '#D32F2F', trust: '#5E35B1' },
    default: { primary: '#E3F2FD', secondary: '#FFFFFF', accent: '#A8DADC', emergency: '#D32F2F', trust: '#2196F3' }
  };
  return colorSchemes[regionCode] || colorSchemes.default;
}

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


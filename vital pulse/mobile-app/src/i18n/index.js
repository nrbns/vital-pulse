import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';

const resources = {
  en: {
    translation: en
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    compatibilityJSON: 'v3'
  });

// Load saved language preference
AsyncStorage.getItem('preferredLanguage').then(lang => {
  if (lang && resources[lang]) {
    i18n.changeLanguage(lang);
  } else {
    // Auto-detect from device
    const deviceLang = RNLocalize.getLocales()[0]?.languageCode;
    if (deviceLang && resources[deviceLang]) {
      i18n.changeLanguage(deviceLang);
    }
  }
});

export default i18n;


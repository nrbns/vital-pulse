import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          tabs: {
            home: 'Home',
            emergency: 'Emergency',
            donate: 'Donate',
            profile: 'Profile'
          },
          home: {
            welcome: 'Welcome',
            nearbyNeeds: 'Blood Needs Near You',
            nearestHospitals: 'Nearest Hospitals',
            quickActions: 'Quick Actions',
            donateNow: 'Donate Now',
            myImpact: 'My Impact',
            activeEmergencies: 'Active Emergencies',
            noEmergencies: 'No active emergencies nearby'
          },
          emergency: {
            title: 'Emergency',
            button: 'EMERGENCY',
            subtext: 'Press and hold for immediate help'
          },
          common: {
            loading: 'Loading...',
            error: 'Error',
            seeAll: 'See All'
          }
        }
      }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

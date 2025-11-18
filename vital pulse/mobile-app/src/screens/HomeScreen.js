import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { users, emergencies } from '../services/api';
import { initializeSocket, onEmergencyEvent } from '../services/websocket';
import { setupPushHandlers, registerFCMToken } from '../services/pushNotifications';

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState(null);
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    loadUserProfile();
    requestLocationPermission();
    setupRealtimeListeners();
    registerPushToken();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await users.getProfile();
      setUserProfile(profile.user);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const Geolocation = require('react-native-geolocation-service');
      const hasPermission = await Geolocation.requestAuthorization('whenInUse');
      
      if (hasPermission === 'granted') {
        Geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            
            // Update user location
            users.updateLocation(position.coords.latitude, position.coords.longitude);
            
            // Load nearby emergencies
            loadNearbyEmergencies(position.coords.latitude, position.coords.longitude);
          },
          (error) => console.error('Location error:', error),
          { enableHighAccuracy: false, timeout: 15000 }
        );
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const loadNearbyEmergencies = async (lat, lng) => {
    try {
      const result = await emergencies.getAll(lat, lng, 30); // 30km radius
      setActiveEmergencies(result.requests || []);
    } catch (error) {
      console.error('Error loading emergencies:', error);
    }
  };

  const setupRealtimeListeners = () => {
    const socket = initializeSocket();
    if (socket) {
      // Listen for new emergencies in region
      onEmergencyEvent('emergency:nearby', (data) => {
        // Refresh emergencies list
        if (location) {
          loadNearbyEmergencies(location.latitude, location.longitude);
        }
      });

      // Listen for emergency status updates
      onEmergencyEvent('emergency:status-updated', (data) => {
        setActiveEmergencies(prev => 
          prev.map(emergency => 
            emergency.id === data.emergencyId 
              ? { ...emergency, ...data }
              : emergency
          )
        );
      });
    }
  };

  const registerPushToken = async () => {
    await registerFCMToken();
    setupPushHandlers(navigation, (emergency) => {
      Alert.alert(
        '🚨 Emergency Blood Request',
        `${emergency.bloodGroup} needed at ${emergency.hospitalName}`,
        [
          { text: 'View Details', onPress: () => {
            navigation.navigate('BloodRequest', {
              emergencyId: emergency.emergencyId,
              isDonor: true
            });
          }}
        ],
        { cancelable: false }
      );
    });
  };

  const handleSOSPress = () => {
    if (!userProfile?.blood_group) {
      Alert.alert(
        'Profile Incomplete',
        'Please add your blood group in your profile first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') }
        ]
      );
      return;
    }

    if (!location) {
      Alert.alert(
        'Location Required',
        'Please enable location services to create an emergency request.',
        [
          { text: 'OK', onPress: () => requestLocationPermission() }
        ]
      );
      return;
    }

    navigation.navigate('BloodRequest', { isNew: true });
  };

  const handleEmergencyPress = (emergencyId) => {
    navigation.navigate('BloodRequest', {
      emergencyId,
      isDonor: userProfile?.roles?.includes('donor') || false
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>
          {t('home.welcome')}, {userProfile?.name || 'User'}!
        </Text>
        {userProfile?.blood_group && (
          <View style={styles.bloodGroupBadge}>
            <Text style={styles.bloodGroupText}>{userProfile.blood_group}</Text>
          </View>
        )}
      </View>

      {/* Big SOS Button */}
      <TouchableOpacity 
        style={styles.emergencyButton}
        onPress={handleSOSPress}
        activeOpacity={0.8}
      >
        <Text style={styles.emergencyButtonIcon}>🚨</Text>
        <Text style={styles.emergencyButtonText}>{t('home.emergencyButton')}</Text>
        <Text style={styles.emergencyButtonSubtext}>Request Blood Immediately</Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('BloodRequest', { isNew: true })}
        >
          <Text style={styles.actionIcon}>🩸</Text>
          <Text style={styles.actionTitle}>{t('home.requestBlood')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Emergency')}
        >
          <Text style={styles.actionIcon}>🏥</Text>
          <Text style={styles.actionTitle}>{t('home.findHospital')}</Text>
        </TouchableOpacity>
      </View>

      {/* Active Emergencies */}
      {activeEmergencies.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Emergencies Nearby</Text>
          {activeEmergencies.slice(0, 5).map((emergency) => (
            <TouchableOpacity
              key={emergency.id}
              style={styles.emergencyCard}
              onPress={() => handleEmergencyPress(emergency.id)}
            >
              <View style={styles.emergencyCardHeader}>
                <Text style={styles.emergencyBloodGroup}>{emergency.blood_group}</Text>
                <View style={[
                  styles.urgencyBadge,
                  { backgroundColor: emergency.urgency === 'critical' ? '#dc3545' : '#fd7e14' }
                ]}>
                  <Text style={styles.urgencyBadgeText}>
                    {t(`blood.${emergency.urgency}`).toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.emergencyHospital}>{emergency.hospital_name}</Text>
              {emergency.distance_km && (
                <Text style={styles.emergencyDistance}>
                  📍 {emergency.distance_km.toFixed(1)} km away
                </Text>
              )}
              {emergency.matched_donors_count !== undefined && (
                <Text style={styles.emergencyDonors}>
                  {emergency.matched_donors_count} donor(s) notified
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Upcoming Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home.upcomingEvents')}</Text>
        <Text style={styles.emptyText}>No upcoming events</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  welcome: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  bloodGroupBadge: {
    backgroundColor: '#e63946',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  bloodGroupText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emergencyButton: {
    margin: 20,
    backgroundColor: '#e63946',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#e63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emergencyButtonIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emergencyButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emergencyButtonSubtext: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.9,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  emptyText: {
    color: '#6c757d',
    fontSize: 14,
  },
  emergencyCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e63946',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emergencyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emergencyBloodGroup: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e63946',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  emergencyHospital: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  emergencyDistance: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  emergencyDonors: {
    fontSize: 12,
    color: '#28a745',
    marginTop: 4,
    fontWeight: '500',
  },
});


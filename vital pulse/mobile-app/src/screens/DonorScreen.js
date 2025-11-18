import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import Geolocation from 'react-native-geolocation-service';
import { donors } from '../services/api';
import { initializeSocket, updateDonorPresence } from '../services/websocket';
import { setupPushHandlers } from '../services/pushNotifications';

export default function DonorScreen({ navigation }) {
  const { t } = useTranslation();
  const [isAvailable, setIsAvailable] = useState(false);
  const [location, setLocation] = useState(null);
  const [donorProfile, setDonorProfile] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    loadDonorProfile();
    checkLocationPermission();
    setupBackgroundLocation();
    setupPushNotifications();
  }, []);

  useEffect(() => {
    if (isAvailable && location) {
      updatePresence(true);
    } else if (!isAvailable) {
      updatePresence(false);
    }
  }, [isAvailable, location]);

  const checkLocationPermission = async () => {
    try {
      const result = await Geolocation.requestAuthorization('whenInUse');
      setLocationPermission(result === 'granted');
      if (result === 'granted') {
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.error('Location error:', error);
        if (error.code === 1) {
          Alert.alert(
            'Location Permission Required',
            'Please enable location services to mark yourself as available.',
            [{ text: 'OK' }]
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const setupBackgroundLocation = () => {
    if (isAvailable) {
      // Set up background location updates every 5 minutes
      const watchId = Geolocation.watchPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          // Update presence with new location
          if (isAvailable) {
            updatePresence(true, position.coords.latitude, position.coords.longitude);
          }
        },
        (error) => console.error('Background location error:', error),
        {
          enableHighAccuracy: false,
          distanceFilter: 500, // Update every 500 meters
          interval: 5 * 60 * 1000, // Every 5 minutes
          fastestInterval: 2 * 60 * 1000 // Minimum 2 minutes
        }
      );

      return () => {
        Geolocation.clearWatch(watchId);
      };
    }
  };

  const setupPushNotifications = () => {
    setupPushHandlers(navigation, (emergency) => {
      // Show in-app modal for emergency
      Alert.alert(
        '🚨 Emergency Blood Request',
        `${emergency.bloodGroup} needed at ${emergency.hospitalName}\nBed: ${emergency.hospitalBedNumber}`,
        [
          {
            text: 'Cannot Help',
            style: 'cancel'
          },
          {
            text: 'I Can Help',
            onPress: () => {
              navigation.navigate('BloodRequest', {
                emergencyId: emergency.emergencyId,
                isDonor: true
              });
            }
          }
        ],
        { cancelable: false }
      );
    });
  };

  const loadDonorProfile = async () => {
    try {
      const profile = await donors.getProfile();
      setDonorProfile(profile.donor);
      
      // Check eligibility
      const eligibilityResult = await donors.checkEligibility();
      setEligibility(eligibilityResult);
      
      // Load presence status
      const presence = await donors.getPresence();
      if (presence.presence) {
        setIsAvailable(presence.presence.isAvailable || false);
        if (presence.presence.latitude && presence.presence.longitude) {
          setLocation({
            latitude: presence.presence.latitude,
            longitude: presence.presence.longitude
          });
        }
      }
    } catch (error) {
      console.error('Error loading donor profile:', error);
    }
  };

  const updatePresence = async (available, lat, lng) => {
    const targetLat = lat || location?.latitude;
    const targetLng = lng || location?.longitude;

    if (available && (!targetLat || !targetLng)) {
      Alert.alert(
        'Location Required',
        'Please enable location services to mark yourself as available.'
      );
      setIsAvailable(false);
      return;
    }

    try {
      setLoading(true);
      
      // Update via API
      await donors.updatePresence(
        available,
        targetLat,
        targetLng
      );

      // Update via WebSocket
      const socket = initializeSocket();
      if (socket) {
        updateDonorPresence(available, targetLat, targetLng);
      }

      if (available) {
        Alert.alert(
          '✅ Available for Emergencies',
          'You will now receive notifications for nearby emergency blood requests.'
        );
      } else {
        Alert.alert(
          '❌ Marked as Unavailable',
          'You will no longer receive emergency notifications.'
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update availability');
      setIsAvailable(!available); // Revert toggle
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (value) => {
    if (value && !locationPermission) {
      Alert.alert(
        'Location Permission Required',
        'Location access is required to mark yourself as available for emergencies.',
        [
          { text: 'Cancel', onPress: () => {} },
          { 
            text: 'Enable', 
            onPress: async () => {
              const result = await Geolocation.requestAuthorization('whenInUse');
              if (result === 'granted') {
                setLocationPermission(true);
                getCurrentLocation();
                setIsAvailable(true);
              }
            }
          }
        ]
      );
      return;
    }

    setIsAvailable(value);
  };

  if (!donorProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e63946" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('donor.title')}</Text>
        {donorProfile.blood_group && (
          <View style={styles.bloodGroupBadge}>
            <Text style={styles.bloodGroupText}>{donorProfile.blood_group}</Text>
          </View>
        )}
      </View>

      {/* Availability Toggle */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Available for Emergencies</Text>
            <Text style={styles.cardSubtitle}>
              {isAvailable 
                ? 'You will receive notifications for nearby blood requests'
                : 'Toggle on to help save lives'
              }
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={handleToggle}
            disabled={loading}
            trackColor={{ false: '#dee2e6', true: '#28a745' }}
            thumbColor={isAvailable ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        {isAvailable && location && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>
              📍 Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
            <Text style={styles.locationNote}>
              Your location is updated automatically when available
            </Text>
          </View>
        )}

        {isAvailable && !location && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Location permission required. Enable location services to receive emergency notifications.
            </Text>
          </View>
        )}
      </View>

      {/* Eligibility Status */}
      {eligibility && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Donation Eligibility</Text>
          <View style={styles.eligibilityRow}>
            <View style={[
              styles.statusBadge,
              eligibility.eligible ? styles.statusBadgeSuccess : styles.statusBadgeWarning
            ]}>
              <Text style={styles.statusBadgeText}>
                {eligibility.eligible ? '✅ Eligible' : '⏳ Not Yet Eligible'}
              </Text>
            </View>
          </View>

          {eligibility.nextDonationDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Next Donation:</Text>
              <Text style={styles.infoValue}>
                {new Date(eligibility.nextDonationDate).toLocaleDateString()}
              </Text>
            </View>
          )}

          {eligibility.daysUntilEligible > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Days Until Eligible:</Text>
              <Text style={styles.infoValue}>
                {eligibility.daysUntilEligible} days
              </Text>
            </View>
          )}

          {eligibility.reasons && eligibility.reasons.length > 0 && (
            <View style={styles.reasonsBox}>
              <Text style={styles.reasonsTitle}>Note:</Text>
              {eligibility.reasons.map((reason, index) => (
                <Text key={index} style={styles.reasonText}>• {reason}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Donor Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Donor Information</Text>
        
        {donorProfile.last_donation_date && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Donation:</Text>
            <Text style={styles.infoValue}>
              {new Date(donorProfile.last_donation_date).toLocaleDateString()}
            </Text>
          </View>
        )}

        {donorProfile.total_donations !== undefined && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Donations:</Text>
            <Text style={styles.infoValue}>{donorProfile.total_donations}</Text>
          </View>
        )}

        {donorProfile.health_notes && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Health Notes:</Text>
            <Text style={styles.infoValue}>{donorProfile.health_notes}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('DonationHistory')}
        >
          <Text style={styles.actionButtonText}>📋 {t('donor.donationHistory')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.actionButtonText}>⚙️ Update Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    color: '#6c757d',
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
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
  },
  bloodGroupBadge: {
    backgroundColor: '#e63946',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bloodGroupText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  locationInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  locationNote: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  warningBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
  },
  eligibilityRow: {
    marginTop: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeSuccess: {
    backgroundColor: '#d4edda',
  },
  statusBadgeWarning: {
    backgroundColor: '#fff3cd',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#6c757d',
  },
  infoValue: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '600',
  },
  reasonsBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  reasonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  actions: {
    padding: 20,
  },
  actionButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
});


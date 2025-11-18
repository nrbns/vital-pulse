import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Linking,
  Platform,
  Vibration,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { useNavigation } from '@react-navigation/native';
import { hospitals, emergencies } from '../services/api';
import { useRegion, getEmergencyNumber, getRegionColors } from '../hooks/useRegion';
import EmergencyButton from '../components/EmergencyButton';
import HospitalCard from '../components/HospitalCard';

/**
 * Emergency Screen - One-Tap Panic Button
 * Modal overlay with massive red button and nearest hospitals
 */
export default function EmergencyScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { region } = useRegion();
  const colors = getRegionColors(region?.code || 'default');
  
  const [visible, setVisible] = useState(true);
  const [location, setLocation] = useState(null);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    requestLocationAndHospitals();
  }, []);

  const requestLocationAndHospitals = async () => {
    try {
      setLoading(true);
      const hasPermission = await Geolocation.requestAuthorization('whenInUse');
      
      if (hasPermission === 'granted') {
        Geolocation.getCurrentPosition(
          async (position) => {
            const loc = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            setLocation(loc);
            await loadNearbyHospitals(loc.latitude, loc.longitude);
            setLoading(false);
          },
          (error) => {
            console.error('Location error:', error);
            setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Location permission error:', error);
      setLoading(false);
    }
  };

  const loadNearbyHospitals = async (lat, lng) => {
    try {
      const result = await hospitals.getNearby(lat, lng, 25, true, true); // 25km, emergency, open now
      setNearbyHospitals((result.hospitals || []).slice(0, 5));
    } catch (error) {
      console.error('Error loading hospitals:', error);
    }
  };

  const handleEmergencyPress = async () => {
    if (!location) {
      Alert.alert(t('common.error'), t('emergency.locationRequired'));
      return;
    }

    // Extended vibration for panic mode
    if (Vibration.vibrate) {
      Vibration.vibrate([0, 300, 100, 300, 100, 300]);
    }

    setBroadcasting(true);
    setCountdown(3);

    // Countdown
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      // Create emergency request (user needs to fill blood group, but we can create a placeholder)
      // In real scenario, navigate to request form
      setTimeout(() => {
        setBroadcasting(false);
        navigation.navigate('BloodRequest', { isNew: true, emergency: true });
      }, 3000);
    } catch (error) {
      console.error('Emergency broadcast error:', error);
      setBroadcasting(false);
    }
  };

  const handleCallHospital = (hospital) => {
    const phone = hospital.phone || hospital.emergencyPhone || 
                  getEmergencyNumber(region?.code, 'ambulance');
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigateToHospital = (hospital) => {
    if (!hospital.latitude || !hospital.longitude) return;

    const url = Platform.select({
      ios: `maps://app?daddr=${hospital.latitude},${hospital.longitude}`,
      android: `google.navigation:q=${hospital.latitude},${hospital.longitude}`
    });

    Linking.openURL(url).catch(() => {
      // Fallback to web maps
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`
      );
    });
  };

  const handleShareLocation = async () => {
    if (!location || nearbyHospitals.length === 0) return;

    const hospital = nearbyHospitals[0];
    const message = t('emergency.shareMessage', {
      hospital: hospital.name,
      lat: location.latitude,
      lng: location.longitude
    }) || `Need help at ${hospital.name}. Location: https://maps.google.com/?q=${location.latitude},${location.longitude}`;

    const url = Platform.select({
      ios: `sms:&body=${encodeURIComponent(message)}`,
      android: `sms:?body=${encodeURIComponent(message)}`
    });

    Linking.openURL(url).catch(() => {
      // Fallback to WhatsApp or share sheet
      Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`).catch(() => {
        Alert.alert(t('common.error'), 'Could not open messaging app');
      });
    });
  };

  const handleCallEmergency = () => {
    const emergencyNum = getEmergencyNumber(region?.code, 'ambulance');
    Linking.openURL(`tel:${emergencyNum}`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setVisible(false)}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: '#0008' }]}>
        {/* Dark overlay */}
        <View style={styles.overlay}>
          {/* Emergency Button - Massive */}
          <View style={styles.emergencySection}>
            {broadcasting ? (
              <View style={styles.broadcastingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.broadcastingText} allowFontScaling={true}>
                  {countdown > 0 
                    ? `${t('emergency.broadcasting')}... ${countdown}`
                    : t('emergency.broadcasted') || 'Broadcasting to nearby donors...'}
                </Text>
              </View>
            ) : (
              <EmergencyButton
                onPress={handleEmergencyPress}
                regionCode={region?.code}
                style={styles.emergencyButtonLarge}
              />
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.emergency }]}
              onPress={handleCallEmergency}
              accessibilityLabel={t('emergency.callAmbulance')}
            >
              <Text style={styles.quickActionIcon}>🚑</Text>
              <Text style={styles.quickActionText} allowFontScaling={true}>
                {t('emergency.callAmbulance') || 'Call Ambulance'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.trust }]}
              onPress={handleShareLocation}
              accessibilityLabel={t('emergency.shareLocation')}
            >
              <Text style={styles.quickActionIcon}>📤</Text>
              <Text style={styles.quickActionText} allowFontScaling={true}>
                {t('emergency.shareLocation') || 'Share Location'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Nearest Hospitals Map/List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.emergency} />
              <Text style={styles.loadingText} allowFontScaling={true}>
                {t('emergency.findingHospitals') || 'Finding nearest hospitals...'}
              </Text>
            </View>
          ) : location && nearbyHospitals.length > 0 ? (
            <View style={styles.hospitalsSection}>
              <Text style={styles.hospitalsTitle} allowFontScaling={true}>
                🏥 {t('emergency.nearestHospitals') || 'Nearest Hospitals'}
              </Text>
              
              {/* Map View */}
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
              >
                {/* User location marker */}
                <Marker
                  coordinate={location}
                  title={t('emergency.yourLocation') || 'Your Location'}
                  pinColor="#D32F2F"
                />
                
                {/* Hospital markers */}
                {nearbyHospitals.map((hospital) => (
                  <Marker
                    key={hospital.id}
                    coordinate={{
                      latitude: hospital.latitude,
                      longitude: hospital.longitude
                    }}
                    title={hospital.name}
                    description={`${hospital.distance_km?.toFixed(1)}km away`}
                  />
                ))}
              </MapView>

              {/* Hospital Cards List */}
              <ScrollView 
                style={styles.hospitalsList}
                showsVerticalScrollIndicator={false}
              >
                {nearbyHospitals.map((hospital) => (
                  <View key={hospital.id} style={styles.hospitalCardWrapper}>
                    <HospitalCard
                      hospital={hospital}
                      distance={hospital.distance_km || 0}
                      isOpen={hospital.is_24x7 || hospital.is_open}
                      regionCode={region?.code}
                      onCall={() => handleCallHospital(hospital)}
                      onNavigate={() => handleNavigateToHospital(hospital)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.noHospitals}>
              <Text style={styles.noHospitalsText} allowFontScaling={true}>
                {t('emergency.noHospitals') || 'No hospitals found nearby. Please call emergency services.'}
              </Text>
              <TouchableOpacity
                style={[styles.callButton, { backgroundColor: colors.emergency }]}
                onPress={handleCallEmergency}
              >
                <Text style={styles.callButtonText}>
                  🚑 {t('emergency.callEmergency') || 'Call Emergency'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setVisible(false)}
            accessibilityLabel={t('common.close')}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    paddingTop: 40,
  },
  emergencySection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    alignItems: 'center',
  },
  emergencyButtonLarge: {
    width: '100%',
    marginBottom: 20,
  },
  broadcastingContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(211, 47, 47, 0.2)',
    borderRadius: 16,
    width: '100%',
  },
  broadcastingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  quickActionIcon: {
    fontSize: 24,
  },
  quickActionText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  hospitalsSection: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: 16,
  },
  hospitalsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  map: {
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  hospitalsList: {
    flex: 1,
  },
  hospitalCardWrapper: {
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  noHospitals: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noHospitalsText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  callButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  callButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});


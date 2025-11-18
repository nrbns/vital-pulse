import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { users, emergencies, hospitals } from '../services/api';
import { initializeSocket, onEmergencyEvent } from '../services/websocket';
import { setupPushHandlers, registerFCMToken } from '../services/pushNotifications';
import { useRegion, getRegionColors } from '../hooks/useRegion';
import EmergencyButton from '../components/EmergencyButton';
import HospitalCard from '../components/HospitalCard';
import OfflineBanner from '../components/OfflineBanner';

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { region, loading: regionLoading } = useRegion();
  const colors = getRegionColors(region?.code || 'default');
  
  const [userProfile, setUserProfile] = useState(null);
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeScreen();
  }, [region]);

  const initializeScreen = async () => {
    if (!region && regionLoading) return;
    
    setLoading(true);
    await loadUserProfile();
    await requestLocationPermission();
    setupRealtimeListeners();
    await registerPushToken();
    setLoading(false);
  };

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
            
            // Load nearby data
            loadNearbyEmergencies(position.coords.latitude, position.coords.longitude);
            loadNearbyHospitals(position.coords.latitude, position.coords.longitude);
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

  const loadNearbyHospitals = async (lat, lng) => {
    try {
      const result = await hospitals.getNearby(lat, lng, 25, true, false); // 25km, emergency only
      setNearbyHospitals(result.hospitals || []);
    } catch (error) {
      console.error('Error loading hospitals:', error);
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

  if (loading || regionLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.secondary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.secondary }]}>
      <OfflineBanner regionCode={region?.code} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with personalized greeting */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <Text style={styles.welcome} allowFontScaling={true}>
              {t('home.welcome')}, {userProfile?.name || 'User'}!
            </Text>
            {userProfile?.blood_group && (
              <View style={[styles.bloodGroupBadge, { backgroundColor: colors.emergency }]}>
                <Text style={styles.bloodGroupText}>{userProfile.blood_group}</Text>
              </View>
            )}
          </View>
          {region && (
            <Text style={styles.regionIndicator} allowFontScaling={true}>
              📍 {region.code}
            </Text>
          )}
        </View>

        {/* Emergency Button - Massive, High Contrast */}
        <EmergencyButton
          onPress={handleSOSPress}
          regionCode={region?.code}
          style={styles.emergencyButtonWrapper}
        />

        {/* Blood Needs Near You - Weather-like Card */}
        <View style={[styles.needsCard, { backgroundColor: colors.primary }]}>
          <View style={styles.needsHeader}>
            <Text style={styles.needsTitle} allowFontScaling={true}>
              🩸 {t('home.nearbyNeeds') || 'Blood Needs Near You'}
            </Text>
            <Text style={styles.needsCount} allowFontScaling={true}>
              {activeEmergencies.length > 0 ? activeEmergencies.length : '0'}
            </Text>
          </View>
          {activeEmergencies.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emergenciesScroll}>
              {activeEmergencies.slice(0, 5).map((emergency) => (
                <TouchableOpacity
                  key={emergency.id}
                  style={[styles.emergencyMiniCard, { borderLeftColor: colors.emergency }]}
                  onPress={() => handleEmergencyPress(emergency.id)}
                  accessibilityLabel={`${emergency.blood_group} needed at ${emergency.hospital_name}`}
                >
                  <Text style={styles.miniBloodGroup}>{emergency.blood_group}</Text>
                  <Text style={styles.miniHospital} numberOfLines={1}>
                    {emergency.hospital_name}
                  </Text>
                  {emergency.distance_km && (
                    <Text style={styles.miniDistance}>
                      📍 {emergency.distance_km.toFixed(1)}km
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noNeeds} allowFontScaling={true}>
              {t('home.noEmergencies') || 'No active emergencies nearby'}
            </Text>
          )}
        </View>

        {/* Nearest Hospitals - Horizontal Carousel */}
        {nearbyHospitals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                🏥 {t('home.nearestHospitals') || 'Nearest Hospitals'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Emergency')}>
                <Text style={styles.seeAll} allowFontScaling={true}>
                  {t('common.seeAll') || 'See All'}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hospitalsScroll}>
              {nearbyHospitals.slice(0, 5).map((hospital) => (
                <HospitalCard
                  key={hospital.id}
                  hospital={hospital}
                  distance={hospital.distance_km || 0}
                  isOpen={hospital.is_24x7 || hospital.is_open}
                  regionCode={region?.code}
                  style={styles.hospitalCardHorizontal}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} allowFontScaling={true}>
            {t('home.quickActions') || 'Quick Actions'}
          </Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.actionCard, styles.requestBloodCard]}
              onPress={() => navigation.navigate('BloodRequest', { isNew: true })}
              accessibilityLabel={t('home.requestBlood') || 'Request Blood'}
            >
              <Text style={styles.actionIcon}>🩸</Text>
              <Text style={styles.actionTitle} allowFontScaling={true}>
                {t('home.requestBlood') || 'Request Blood'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, styles.findHospitalCard]}
              onPress={() => navigation.navigate('Emergency')}
              accessibilityLabel={t('home.findHospital') || 'Find Hospital'}
            >
              <Text style={styles.actionIcon}>🏥</Text>
              <Text style={styles.actionTitle} allowFontScaling={true}>
                {t('home.findHospital') || 'Find Hospital'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, styles.donateNowCard]}
              onPress={() => navigation.navigate('Donate')}
              accessibilityLabel={t('home.donateNow') || 'Donate Now'}
            >
              <Text style={styles.actionIcon}>❤️</Text>
              <Text style={styles.actionTitle} allowFontScaling={true}>
                {t('home.donateNow') || 'Donate Now'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, styles.myImpactCard]}
              onPress={() => navigation.navigate('Profile')}
              accessibilityLabel={t('home.myImpact') || 'My Impact'}
            >
              <Text style={styles.actionIcon}>⭐</Text>
              <Text style={styles.actionTitle} allowFontScaling={true}>
                {t('home.myImpact') || 'My Impact'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Emergencies List (Full Details) */}
        {activeEmergencies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} allowFontScaling={true}>
              {t('home.activeEmergencies') || 'Active Emergencies'}
            </Text>
            {activeEmergencies.map((emergency) => (
              <TouchableOpacity
                key={emergency.id}
                style={[styles.emergencyCard, { borderLeftColor: colors.emergency }]}
                onPress={() => handleEmergencyPress(emergency.id)}
                accessibilityLabel={`${emergency.blood_group} needed at ${emergency.hospital_name}`}
              >
                <View style={styles.emergencyCardHeader}>
                  <Text style={[styles.emergencyBloodGroup, { color: colors.emergency }]}>
                    {emergency.blood_group}
                  </Text>
                  <View style={[
                    styles.urgencyBadge,
                    { backgroundColor: emergency.urgency === 'critical' ? '#dc3545' : '#fd7e14' }
                  ]}>
                    <Text style={styles.urgencyBadgeText}>
                      {t(`blood.${emergency.urgency}`).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.emergencyHospital} allowFontScaling={true}>
                  {emergency.hospital_name}
                </Text>
                {emergency.distance_km && (
                  <Text style={styles.emergencyDistance} allowFontScaling={true}>
                    📍 {emergency.distance_km.toFixed(1)} km away
                  </Text>
                )}
                {emergency.matched_donors_count !== undefined && (
                  <Text style={styles.emergencyDonors} allowFontScaling={true}>
                    ✅ {emergency.matched_donors_count} donor(s) notified
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for floating button
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C757D',
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  regionIndicator: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  bloodGroupBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  bloodGroupText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emergencyButtonWrapper: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  needsCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  needsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  needsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  needsCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emergenciesScroll: {
    marginTop: 8,
  },
  emergencyMiniCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    width: 140,
    borderLeftWidth: 4,
  },
  miniBloodGroup: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 4,
  },
  miniHospital: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 4,
  },
  miniDistance: {
    fontSize: 11,
    color: '#6C757D',
  },
  noNeeds: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    paddingVertical: 8,
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
  },
  seeAll: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  hospitalsScroll: {
    marginTop: 8,
  },
  hospitalCardHorizontal: {
    width: 280,
    marginRight: 12,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 120,
    justifyContent: 'center',
  },
  requestBloodCard: {
    backgroundColor: '#E3F2FD', // Light blue
  },
  findHospitalCard: {
    backgroundColor: '#00695C', // Darker blue/teal
  },
  donateNowCard: {
    backgroundColor: '#E3F2FD', // Light blue
  },
  myImpactCard: {
    backgroundColor: '#00695C', // Darker blue/teal
  },
  actionIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emergencyCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
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
    fontSize: 22,
    fontWeight: 'bold',
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emergencyHospital: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  emergencyDistance: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
  },
  emergencyDonors: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 6,
    fontWeight: '600',
  },
});


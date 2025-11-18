import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRegion, getEmergencyNumber } from '../hooks/useRegion';

/**
 * Hospital Card Component
 * Adaptive card with region-specific styling and emergency actions
 */
export default function HospitalCard({ 
  hospital, 
  distance, 
  isOpen, 
  onNavigate, 
  onCall, 
  regionCode,
  style 
}) {
  const { t } = useTranslation();
  const { region } = useRegion();

  const handleCall = () => {
    if (onCall) {
      onCall(hospital.phone || hospital.emergencyPhone);
    } else if (hospital.phone) {
      Linking.openURL(`tel:${hospital.phone}`);
    } else {
      // Use region emergency number
      const emergencyNum = getEmergencyNumber(regionCode || region?.code, 'ambulance');
      Linking.openURL(`tel:${emergencyNum}`);
    }
  };

  const handleNavigate = () => {
    if (onNavigate && hospital.latitude && hospital.longitude) {
      onNavigate(hospital.latitude, hospital.longitude);
    } else if (hospital.latitude && hospital.longitude) {
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
    }
  };

  const getStatusColor = () => {
    if (!isOpen) return '#F44336'; // Red
    if (hospital.capacityStatus === 'low') return '#FF9800'; // Orange
    return '#4CAF50'; // Green
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2} allowFontScaling={true}>
          {hospital.name}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: isOpen ? '#4CAF50' : '#F44336' }]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {isOpen ? t('hospital.open') || 'Open' : t('hospital.closed') || 'Closed'}
          </Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Text style={styles.locationIcon}>📍</Text>
        <Text style={styles.distance} allowFontScaling={true}>
          {distance.toFixed(1)} km away
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.callButton]}
          onPress={handleCall}
          accessibilityLabel={t('hospital.call') || 'Call'}
        >
          <Text style={styles.callIcon}>📞</Text>
          <Text style={styles.actionText}>{t('hospital.call') || 'Call'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.navigateButton]}
          onPress={handleNavigate}
          accessibilityLabel={t('hospital.navigate') || 'Navigate'}
        >
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.actionText}>{t('hospital.navigate') || 'Navigate'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  header: {
    marginBottom: 12
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 6
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 4
  },
  distance: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500'
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8
  },
  callButton: {
    backgroundColor: '#4CAF50'
  },
  navigateButton: {
    backgroundColor: '#2196F3'
  },
  callIcon: {
    fontSize: 16,
    marginRight: 4
  },
  mapIcon: {
    fontSize: 16,
    marginRight: 4
  },
  actionText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600'
  }
});


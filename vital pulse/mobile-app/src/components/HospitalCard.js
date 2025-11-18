import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
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
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={handleNavigate}
      activeOpacity={0.7}
      accessibilityLabel={`${hospital.name}, ${distance}km away, ${isOpen ? 'open' : 'closed'}`}
      accessibilityRole="button"
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={2} allowFontScaling={true}>
            {hospital.name}
          </Text>
          {hospital.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ {t('hospital.verified')}</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>
            {isOpen ? '🟢' : '🔴'} {isOpen ? t('hospital.open') : t('hospital.closed')}
          </Text>
        </View>
      </View>

      {hospital.address && (
        <Text style={styles.address} numberOfLines={1} allowFontScaling={true}>
          📍 {hospital.address}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.info}>
          <Text style={styles.distance} allowFontScaling={true}>
            📏 {distance.toFixed(1)} {t('common.km') || 'km'} away
          </Text>
          {hospital.eta && (
            <Text style={styles.eta} allowFontScaling={true}>
              ⏱️ {hospital.eta} {t('common.min') || 'min'}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={handleCall}
            accessibilityLabel={t('hospital.call')}
          >
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionText}>{t('hospital.call') || 'Call'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.navigateButton]}
            onPress={handleNavigate}
            accessibilityLabel={t('hospital.navigate')}
          >
            <Text style={styles.actionIcon}>🗺️</Text>
            <Text style={styles.actionText}>{t('hospital.navigate') || 'Navigate'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {hospital.specialties && hospital.specialties.length > 0 && (
        <View style={styles.specialties}>
          {hospital.specialties.slice(0, 3).map((specialty, index) => (
            <View key={index} style={styles.specialtyTag}>
              <Text style={styles.specialtyText}>{specialty}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  titleContainer: {
    flex: 1,
    marginRight: 8
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4
  },
  verifiedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  verifiedText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  address: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 12
  },
  footer: {
    marginTop: 8
  },
  info: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16
  },
  distance: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500'
  },
  eta: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500'
  },
  actions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6
  },
  callButton: {
    backgroundColor: '#4CAF50'
  },
  navigateButton: {
    backgroundColor: '#2196F3'
  },
  actionIcon: {
    fontSize: 16
  },
  actionText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6
  },
  specialtyTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  specialtyText: {
    fontSize: 11,
    color: '#6C757D'
  }
});


import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import { emergencies } from '../services/api';
import { initializeSocket, joinEmergencyRoom, onEmergencyEvent, respondToEmergency } from '../services/websocket';
import { useRegion, getRegionColors } from '../hooks/useRegion';
import EmergencyButton from '../components/EmergencyButton';

export default function BloodRequestScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { emergencyId, isNew } = route.params || {};
  const { region } = useRegion();
  const colors = getRegionColors(region?.code || 'default');

  const [emergency, setEmergency] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [formData, setFormData] = useState({
    bloodGroup: '',
    urgency: 'high',
    patientName: '',
    hospitalName: '',
    hospitalAddress: '',
    hospitalBedNumber: '',
    hospitalWard: '',
    contactPhone: '',
    notes: ''
  });

  useEffect(() => {
    if (emergencyId) {
      loadEmergency();
      joinEmergencyRoomForUpdates();
    }
    
    // Get current location
    getCurrentLocation();

    return () => {
      // Cleanup socket listeners
      if (emergencyId) {
        onEmergencyEvent('emergency:status-updated', null);
        onEmergencyEvent('emergency:response', null);
      }
    };
  }, [emergencyId]);

  const getCurrentLocation = async () => {
    try {
      const hasPermission = await Geolocation.requestAuthorization('whenInUse');
      if (hasPermission === 'granted') {
        Geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => console.error('Location error:', error),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const loadEmergency = async () => {
    try {
      setLoading(true);
      const result = await emergencies.getById(
        emergencyId,
        location?.latitude,
        location?.longitude
      );
      setEmergency(result.request);
      
      // Load responses
      const responsesResult = await emergencies.getResponses(emergencyId);
      setResponses(responsesResult.responses || []);
    } catch (error) {
      Alert.alert(t('common.error'), error.message || 'Failed to load emergency');
    } finally {
      setLoading(false);
    }
  };

  const joinEmergencyRoomForUpdates = () => {
    const socket = initializeSocket();
    if (socket && emergencyId) {
      joinEmergencyRoom(emergencyId);
      
      // Listen for status updates
      onEmergencyEvent('emergency:status-updated', (data) => {
        setEmergency(prev => ({ ...prev, ...data }));
      });
      
      // Listen for responses
      onEmergencyEvent('emergency:response', (data) => {
        loadEmergency(); // Reload to get updated responses
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.bloodGroup || !formData.hospitalName || !formData.hospitalBedNumber) {
      Alert.alert(t('common.error'), 'Please fill all required fields');
      return;
    }

    if (!location) {
      Alert.alert(t('common.error'), 'Please enable location services');
      return;
    }

    try {
      setLoading(true);
      const result = await emergencies.create({
        ...formData,
        hospitalLatitude: location.latitude,
        hospitalLongitude: location.longitude
      });

      Alert.alert(
        t('common.success'),
        `Emergency created! ${result.request.matchedDonors || 0} donors notified.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Main', {
              screen: 'Home'
            })
          },
          {
            text: 'View Status',
            onPress: () => navigation.replace('BloodRequest', {
              emergencyId: result.request.id
            })
          }
        ]
      );
    } catch (error) {
      Alert.alert(t('common.error'), error.message || 'Failed to create emergency');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (available) => {
    if (!emergencyId) return;

    try {
      const estimatedArrival = available 
        ? new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now
        : null;

      await emergencies.respond(emergencyId, available, estimatedArrival);
      
      Alert.alert(
        t('common.success'),
        available 
          ? 'Thank you for responding! The requester will be notified.'
          : 'Response recorded.'
      );
      
      loadEmergency(); // Reload to update UI
    } catch (error) {
      Alert.alert(t('common.error'), error.message || 'Failed to respond');
    }
  };

  if (loading && !emergency) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e63946" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Create new emergency form
  if (!emergencyId && isNew) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.secondary }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.header, { backgroundColor: colors.emergency }]}>
            <Text style={styles.title} allowFontScaling={true}>{t('blood.requestTitle')}</Text>
            <Text style={styles.subtitle} allowFontScaling={true}>
              {t('blood.requestSubtitle') || 'Fill in the details to request blood immediately'}
            </Text>
          </View>

          {/* Blood Group */}
          <Text style={styles.label}>{t('blood.bloodGroup')} *</Text>
          <View style={styles.bloodGroupRow}>
            {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
              <TouchableOpacity
                key={bg}
                style={[
                  styles.bloodGroupButton,
                  formData.bloodGroup === bg && styles.bloodGroupButtonSelected
                ]}
                onPress={() => setFormData({ ...formData, bloodGroup: bg })}
              >
                <Text style={[
                  styles.bloodGroupText,
                  formData.bloodGroup === bg && styles.bloodGroupTextSelected
                ]}>
                  {bg}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Urgency */}
          <Text style={styles.label}>{t('blood.urgency')} *</Text>
          <View style={styles.urgencyRow}>
            {['critical', 'high', 'medium', 'low'].map(urgency => (
              <TouchableOpacity
                key={urgency}
                style={[
                  styles.urgencyButton,
                  formData.urgency === urgency && styles.urgencyButtonSelected
                ]}
                onPress={() => setFormData({ ...formData, urgency })}
              >
                <Text style={[
                  styles.urgencyText,
                  formData.urgency === urgency && styles.urgencyTextSelected
                ]}>
                  {t(`blood.${urgency}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hospital Name */}
          <Text style={styles.label}>{t('blood.hospital')} *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter hospital name"
            value={formData.hospitalName}
            onChangeText={(text) => setFormData({ ...formData, hospitalName: text })}
          />

          {/* Hospital Bed Number */}
          <Text style={styles.label}>Hospital Bed/Ward Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., ICU-205"
            value={formData.hospitalBedNumber}
            onChangeText={(text) => setFormData({ ...formData, hospitalBedNumber: text })}
          />

          {/* Patient Name */}
          <Text style={styles.label}>{t('blood.patientName')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Patient name (optional)"
            value={formData.patientName}
            onChangeText={(text) => setFormData({ ...formData, patientName: text })}
          />

          {/* Notes */}
          <Text style={styles.label}>{t('blood.notes')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional notes..."
            multiline
            numberOfLines={4}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>{t('blood.submit')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // View emergency status
  if (emergency) {
    const urgencyColors = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#28a745'
    };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.secondary }]}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.emergencyHeader}>
          <Text style={styles.emergencyTitle}>Emergency Status</Text>
          <View style={[
            styles.urgencyBadge,
            { backgroundColor: urgencyColors[emergency.urgency] || '#6c757d' }
          ]}>
            <Text style={styles.urgencyBadgeText}>
              {t(`blood.${emergency.urgency}`).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.emergencyInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Blood Group:</Text>
            <Text style={styles.infoValue}>{emergency.blood_group}</Text>
          </View>
          
          {emergency.hospital_name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hospital:</Text>
              <Text style={styles.infoValue}>{emergency.hospital_name}</Text>
            </View>
          )}

          {emergency.hospital_bed_number && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bed/Ward:</Text>
              <Text style={styles.infoValue}>{emergency.hospital_bed_number}</Text>
            </View>
          )}

          {emergency.distance_km && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Distance:</Text>
              <Text style={styles.infoValue}>
                {emergency.distance_km.toFixed(1)} km
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Donors Notified:</Text>
            <Text style={styles.infoValue}>
              {emergency.matched_donors_count || emergency.matchedDonors || 0}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Blood Banks:</Text>
            <Text style={styles.infoValue}>
              {emergency.matched_blood_banks_count || emergency.matchedBloodBanks || 0}
            </Text>
          </View>

          {emergency.created_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created:</Text>
              <Text style={styles.infoValue}>
                {new Date(emergency.created_at).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Responses */}
        {responses.length > 0 && (
          <View style={styles.responsesSection}>
            <Text style={styles.sectionTitle}>Responses ({responses.length})</Text>
            {responses.map((response, index) => (
              <View key={index} style={styles.responseCard}>
                <View style={styles.responseHeader}>
                  <Text style={styles.responseName}>
                    {response.name || 'Anonymous Donor'}
                  </Text>
                  <View style={[
                    styles.responseStatus,
                    response.status === 'confirmed' && styles.responseStatusConfirmed
                  ]}>
                    <Text style={styles.responseStatusText}>
                      {response.status === 'confirmed' ? 'Coming' : 'Declined'}
                    </Text>
                  </View>
                </View>
                {response.estimated_arrival && (
                  <Text style={styles.responseETA}>
                    ETA: {new Date(response.estimated_arrival).toLocaleTimeString()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons (for donors) */}
        {route.params?.isDonor && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.acceptButton,
                { backgroundColor: '#28a745' }
              ]}
              onPress={() => handleRespond(true)}
              accessibilityLabel={t('emergency.canHelp') || 'I Can Help'}
            >
              <Text style={styles.actionButtonText} allowFontScaling={true}>
                ✅ {t('emergency.canHelp') || 'I Can Help'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.declineButton,
                { backgroundColor: '#dc3545' }
              ]}
              onPress={() => handleRespond(false)}
              accessibilityLabel={t('emergency.cannotHelp') || 'Cannot Help'}
            >
              <Text style={styles.actionButtonText} allowFontScaling={true}>
                ❌ {t('emergency.cannotHelp') || 'Cannot Help'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.secondary }]}>
      <View style={styles.loadingContainer}>
        <Text style={styles.title} allowFontScaling={true}>{t('blood.requestTitle')}</Text>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6C757D',
    fontSize: 16,
  },
  form: {
    padding: 20,
  },
  header: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#ffffff',
    minHeight: 48,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  bloodGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  bloodGroupButton: {
    padding: 16,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
    minWidth: 70,
    alignItems: 'center',
  },
  bloodGroupButtonSelected: {
    backgroundColor: '#e63946',
    borderColor: '#e63946',
  },
  bloodGroupText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  bloodGroupTextSelected: {
    color: '#ffffff',
  },
  urgencyRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  urgencyButton: {
    flex: 1,
    padding: 16,
    marginRight: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    minHeight: 48,
  },
  urgencyButtonSelected: {
    backgroundColor: '#e63946',
    borderColor: '#e63946',
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  urgencyTextSelected: {
    color: '#ffffff',
  },
  submitButton: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    minHeight: 56,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  urgencyBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  emergencyInfo: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginTop: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '600',
  },
  responsesSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  responseCard: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  responseStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#6c757d',
  },
  responseStatusConfirmed: {
    backgroundColor: '#28a745',
  },
  responseStatusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  responseETA: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
  },
  actionButtons: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  declineButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegion, getRegionColors } from '../hooks/useRegion';
import EmergencyButton from '../components/EmergencyButton';
import HospitalCard from '../components/HospitalCard';
import OfflineBanner from '../components/OfflineBanner';
import './HomeScreen.css';

export default function HomeScreen() {
  const navigate = useNavigate();
  const { region } = useRegion();
  const colors = getRegionColors(region?.code || 'default');
  
  const [userProfile, setUserProfile] = useState(null);
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
    requestLocationPermission();
    // Load mock data for demo
    setTimeout(() => {
      setActiveEmergencies([
        { id: 1, blood_group: 'O+', hospital_name: 'City Hospital', distance_km: 2.5, urgency: 'critical' },
        { id: 2, blood_group: 'B+', hospital_name: 'General Hospital', distance_km: 5.1, urgency: 'high' }
      ]);
      setNearbyHospitals([
        { id: 1, name: 'City Emergency Hospital', distance_km: 2.5, is_24x7: true, latitude: 28.6, longitude: 77.2, phone: '108' },
        { id: 2, name: 'General Hospital', distance_km: 5.1, is_open: true, latitude: 28.7, longitude: 77.3, phone: '102' }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const response = await fetch('http://localhost:3000/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data.user);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const requestLocationPermission = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => console.error('Location error:', error)
      );
    }
  };

  const handleSOSPress = () => {
    navigate('/emergency');
  };

  const handleEmergencyPress = (id) => {
    navigate(`/blood-request?id=${id}`);
  };

  if (loading) {
    return (
      <div className="home-screen loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="home-screen" style={{ backgroundColor: colors.secondary }}>
      <OfflineBanner regionCode={region?.code} />
      
      <div className="home-content">
        {/* Header */}
        <div className="home-header" style={{ backgroundColor: colors.primary }}>
          <div className="header-content">
            <h1 className="welcome-text">
              Welcome, {userProfile?.name || 'User'}!
            </h1>
            {userProfile?.blood_group && (
              <div className="blood-group-badge" style={{ backgroundColor: colors.emergency }}>
                {userProfile.blood_group}
              </div>
            )}
          </div>
          {region && (
            <div className="region-indicator">📍 {region.code}</div>
          )}
        </div>

        {/* Emergency Button */}
        <EmergencyButton
          onPress={handleSOSPress}
          regionCode={region?.code}
        />

        {/* Blood Needs Card */}
        <div className="needs-card" style={{ backgroundColor: colors.primary }}>
          <div className="needs-header">
            <h2>🩸 Blood Needs Near You</h2>
            <div className="needs-count">{activeEmergencies.length}</div>
          </div>
          {activeEmergencies.length > 0 ? (
            <div className="emergencies-scroll">
              {activeEmergencies.map((emergency) => (
                <div
                  key={emergency.id}
                  className="emergency-mini-card"
                  onClick={() => handleEmergencyPress(emergency.id)}
                  style={{ borderLeftColor: colors.emergency }}
                >
                  <div className="mini-blood-group">{emergency.blood_group}</div>
                  <div className="mini-hospital">{emergency.hospital_name}</div>
                  {emergency.distance_km && (
                    <div className="mini-distance">📍 {emergency.distance_km.toFixed(1)}km</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-needs">No active emergencies nearby</div>
          )}
        </div>

        {/* Nearest Hospitals */}
        {nearbyHospitals.length > 0 && (
          <div className="section">
            <div className="section-header">
              <h2>🏥 Nearest Hospitals</h2>
              <button className="see-all" onClick={() => navigate('/emergency')}>See All</button>
            </div>
            <div className="hospitals-scroll">
              {nearbyHospitals.slice(0, 5).map((hospital) => (
                <HospitalCard
                  key={hospital.id}
                  hospital={hospital}
                  distance={hospital.distance_km || 0}
                  isOpen={hospital.is_24x7 || hospital.is_open}
                  regionCode={region?.code}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="section">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <button
              className="action-card"
              onClick={() => navigate('/blood-request')}
              style={{ backgroundColor: colors.accent }}
            >
              <div className="action-icon">🩸</div>
              <div className="action-title">Request Blood</div>
            </button>

            <button
              className="action-card"
              onClick={() => navigate('/emergency')}
              style={{ backgroundColor: colors.trust }}
            >
              <div className="action-icon">🏥</div>
              <div className="action-title">Find Hospital</div>
            </button>

            <button
              className="action-card"
              onClick={() => navigate('/donate')}
              style={{ backgroundColor: colors.accent }}
            >
              <div className="action-icon">❤️</div>
              <div className="action-title">Donate Now</div>
            </button>

            <button
              className="action-card"
              onClick={() => navigate('/profile')}
              style={{ backgroundColor: colors.trust }}
            >
              <div className="action-icon">⭐</div>
              <div className="action-title">My Impact</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


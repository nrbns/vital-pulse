import React from 'react';
import { getEmergencyNumber } from '../hooks/useRegion';
import './HospitalCard.css';

export default function HospitalCard({ hospital, distance, isOpen, onNavigate, onCall, regionCode }) {
  const handleCall = () => {
    if (onCall) {
      onCall(hospital.phone || hospital.emergencyPhone);
    } else if (hospital.phone) {
      window.location.href = `tel:${hospital.phone}`;
    } else {
      const emergencyNum = getEmergencyNumber(regionCode, 'ambulance');
      window.location.href = `tel:${emergencyNum}`;
    }
  };

  const handleNavigate = () => {
    if (onNavigate && hospital.latitude && hospital.longitude) {
      onNavigate(hospital.latitude, hospital.longitude);
    } else if (hospital.latitude && hospital.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;
      window.open(url, '_blank');
    }
  };

  const getStatusColor = () => {
    if (!isOpen) return '#F44336';
    if (hospital.capacityStatus === 'low') return '#FF9800';
    return '#4CAF50';
  };

  return (
    <div className="hospital-card">
      <div className="hospital-header">
        <div className="hospital-name">{hospital.name}</div>
        <div className="status-badge" style={{ backgroundColor: isOpen ? '#4CAF50' : '#F44336' }}>
          <span className="status-dot"></span>
          <span>{isOpen ? 'Open' : 'Closed'}</span>
        </div>
      </div>

      <div className="location-row">
        <span className="location-icon">📍</span>
        <span className="hospital-distance">{distance.toFixed(1)} km away</span>
      </div>

      <div className="hospital-actions">
        <button
          className="action-button call-button"
          onClick={(e) => { e.stopPropagation(); handleCall(); }}
        >
          <span className="call-icon">📞</span>
          <span>Call</span>
        </button>

        <button
          className="action-button navigate-button"
          onClick={(e) => { e.stopPropagation(); handleNavigate(); }}
        >
          <span className="map-icon">🗺️</span>
          <span>Navigate</span>
        </button>
      </div>
    </div>
  );
}


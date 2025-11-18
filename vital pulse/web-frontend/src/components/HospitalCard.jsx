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
    <div className="hospital-card" onClick={handleNavigate} role="button" tabIndex={0}>
      <div className="hospital-header">
        <div className="hospital-title-container">
          <div className="hospital-name">{hospital.name}</div>
          {hospital.verified && (
            <div className="verified-badge">
              ✓ Verified
            </div>
          )}
        </div>
        <div className="status-badge" style={{ backgroundColor: getStatusColor() }}>
          {isOpen ? '🟢 Open' : '🔴 Closed'}
        </div>
      </div>

      {hospital.address && (
        <div className="hospital-address">📍 {hospital.address}</div>
      )}

      <div className="hospital-footer">
        <div className="hospital-info">
          <div className="hospital-distance">📏 {distance.toFixed(1)} km away</div>
          {hospital.eta && (
            <div className="hospital-eta">⏱️ {hospital.eta} min</div>
          )}
        </div>

        <div className="hospital-actions">
          <button
            className="action-button call-button"
            onClick={(e) => { e.stopPropagation(); handleCall(); }}
          >
            📞 Call
          </button>

          <button
            className="action-button navigate-button"
            onClick={(e) => { e.stopPropagation(); handleNavigate(); }}
          >
            🗺️ Navigate
          </button>
        </div>
      </div>
    </div>
  );
}


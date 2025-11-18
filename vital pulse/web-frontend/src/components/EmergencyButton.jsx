import React, { useEffect, useRef } from 'react';
import { getRegionColors } from '../hooks/useRegion';
import './EmergencyButton.css';

export default function EmergencyButton({ onPress, regionCode, disabled = false }) {
  const colors = getRegionColors(regionCode || 'default');
  const buttonRef = useRef(null);

  useEffect(() => {
    // Pulsing animation
    if (buttonRef.current && !disabled) {
      buttonRef.current.style.animation = 'pulse 2s ease-in-out infinite';
    }
  }, [disabled]);

  const handleClick = () => {
    if (!disabled && onPress) {
      // Haptic-like feedback (vibration API)
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      onPress();
    }
  };

  return (
    <div
      ref={buttonRef}
      className={`emergency-button ${disabled ? 'disabled' : ''}`}
      style={{ backgroundColor: disabled ? '#9E9E9E' : colors.emergency }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && handleClick()}
      aria-label="Emergency - Press for immediate help"
    >
      <div className="emergency-content">
        <div className="emergency-icon">🚨</div>
        <div className="emergency-text">EMERGENCY</div>
        <div className="emergency-subtext">Press and hold for immediate help</div>
      </div>
    </div>
  );
}


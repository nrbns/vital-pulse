import React, { useState } from 'react';
import { useRegion, getRegionColors } from '../hooks/useRegion';
import './LoginScreen.css';

export default function LoginScreen({ onLogin }) {
  const { region } = useRegion();
  const colors = getRegionColors(region?.code || 'default');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, countryCode: region?.code || 'IN' })
      });
      if (response.ok) {
        setStep('otp');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        if (onLogin) onLogin();
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen" style={{ backgroundColor: colors.secondary }}>
      <div className="login-content">
        <div className="logo-container" style={{ backgroundColor: colors.primary }}>
          <div className="logo">🩸</div>
          <h1 className="title">Pulse</h1>
          <p className="tagline">Global Emergency Health Platform</p>
        </div>

        <div className="login-form">
          {step === 'phone' ? (
            <>
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="login-input"
              />
              <button
                className="login-button"
                onClick={handleSendOTP}
                disabled={loading || !phone}
                style={{ backgroundColor: colors.emergency }}
              >
                {loading ? 'Loading...' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <label>Enter OTP</label>
              <input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="login-input"
              />
              <button
                className="login-button"
                onClick={handleVerifyOTP}
                disabled={loading || !otp}
                style={{ backgroundColor: colors.emergency }}
              >
                {loading ? 'Loading...' : 'Verify OTP'}
              </button>
              <button className="link-button" onClick={() => setStep('phone')}>
                Resend OTP
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


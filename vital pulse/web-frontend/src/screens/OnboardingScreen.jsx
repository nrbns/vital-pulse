import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegion } from '../hooks/useRegion';
import './OnboardingScreen.css';

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const { region } = useRegion();
  
  const handleFinish = () => {
    localStorage.setItem('has_onboarded', 'true');
    navigate('/login');
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-content">
        <h1>Save Lives Nearby</h1>
        <p>Connect with donors and hospitals in your area instantly.</p>
        <button className="start-button" onClick={handleFinish}>
          Get Started
        </button>
      </div>
    </div>
  );
}


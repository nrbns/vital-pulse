import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import BloodRequestScreen from './screens/BloodRequestScreen';
import DonorScreen from './screens/DonorScreen';
import ProfileScreen from './screens/ProfileScreen';
import SplashScreen from './screens/SplashScreen';
import { useRegion, getRegionColors } from './hooks/useRegion';
import './App.css';
import './i18n';

function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { region, loading: regionLoading } = useRegion();
  const colors = getRegionColors(region?.code || 'default');

  useEffect(() => {
    // Check auth status
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
    
    // Wait for region detection
    if (!regionLoading && region) {
      setLoading(false);
    } else if (!regionLoading) {
      // Even if region is null, stop loading after timeout
      setTimeout(() => setLoading(false), 2000);
    }
  }, [regionLoading, region]);

  if (loading || regionLoading) {
    return <SplashScreen />;
  }

  return (
    <div className="app" style={{ backgroundColor: colors.secondary }}>
      <Router>
        <Routes>
          {!isAuthenticated ? (
            <>
              <Route path="/onboarding" element={<OnboardingScreen />} />
              <Route path="/login" element={<LoginScreen onLogin={() => setIsAuthenticated(true)} />} />
              <Route path="*" element={<Navigate to="/onboarding" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/emergency" element={<EmergencyScreen />} />
              <Route path="/blood-request" element={<BloodRequestScreen />} />
              <Route path="/donate" element={<DonorScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </Router>
    </div>
  );
}

export default App;


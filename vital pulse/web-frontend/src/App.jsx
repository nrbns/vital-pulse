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

  const checkAuth = () => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
    return !!token;
  };

  useEffect(() => {
    // Check auth status on mount
    checkAuth();
    
    // Listen for storage changes (when login sets token)
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case token is set in same window
    const interval = setInterval(() => {
      checkAuth();
    }, 500);
    
    // Wait for region detection
    if (!regionLoading && region) {
      setLoading(false);
    } else if (!regionLoading) {
      // Even if region is null, stop loading after timeout
      setTimeout(() => setLoading(false), 2000);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
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
              <Route path="/login" element={<LoginScreen onLogin={() => {
                setIsAuthenticated(true);
                // Force navigation after state update
                setTimeout(() => {
                  window.location.href = '/';
                }, 100);
              }} />} />
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


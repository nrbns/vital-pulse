import React from 'react';
import './SplashScreen.css';

export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo">🩸</div>
        <h1 className="splash-title">Pulse</h1>
        <p className="splash-tagline">Global Emergency Health Platform</p>
        <div className="splash-loader">Loading...</div>
      </div>
    </div>
  );
}


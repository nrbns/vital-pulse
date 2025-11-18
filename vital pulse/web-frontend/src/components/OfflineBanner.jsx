import React, { useState, useEffect } from 'react';
import './OfflineBanner.css';

export default function OfflineBanner({ regionCode, onSync }) {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsConnected(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isConnected) {
    return null;
  }

  return (
    <div className="offline-banner">
      <div className="offline-text">
        📡 Using cached {regionCode || 'local'} data. Sync when online?
      </div>
      {onSync && (
        <button className="sync-button" onClick={onSync}>
          Sync
        </button>
      )}
    </div>
  );
}


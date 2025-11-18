import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';

/**
 * Offline Banner Component
 * Shows cached data indicator when offline
 */
export default function OfflineBanner({ regionCode, onSync }) {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  if (isConnected) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text} allowFontScaling={true}>
        📡 {t('offline.banner') || `Using cached ${regionCode || 'local'} data. Sync when online?`}
      </Text>
      {onSync && (
        <TouchableOpacity onPress={onSync} style={styles.syncButton}>
          <Text style={styles.syncText}>{t('offline.sync') || 'Sync'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFC107'
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    marginRight: 8
  },
  syncButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  syncText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600'
  }
});


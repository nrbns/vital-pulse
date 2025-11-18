import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function SplashScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🩸 Pulse</Text>
      <Text style={styles.tagline}>{t('app.tagline')}</Text>
      <ActivityIndicator size="large" color="#e63946" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#e63946',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
});


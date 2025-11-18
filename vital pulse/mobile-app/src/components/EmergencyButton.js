import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Vibration } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRegion, getRegionColors } from '../hooks/useRegion';

/**
 * Emergency Button Component
 * Large, high-contrast button with pulsing animation
 * WCAG 2.2 compliant with haptic feedback
 */
export default function EmergencyButton({ onPress, regionCode, style, disabled = false }) {
  const { t } = useTranslation();
  const { region } = useRegion();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const colors = getRegionColors(regionCode || region?.code || 'default');

  useEffect(() => {
    // Continuous pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  const handlePress = () => {
    // Haptic feedback
    if (Vibration.vibrate) {
      Vibration.vibrate(100); // iOS/Android
    }

    if (onPress) {
      onPress();
    }
  };

  const handleLongPress = () => {
    // Extended vibration for long press (panic mode)
    if (Vibration.vibrate) {
      Vibration.vibrate([0, 200, 100, 200]); // Pattern vibration
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: pulseAnim }],
          backgroundColor: disabled ? '#9E9E9E' : colors.emergency
        },
        style
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityLabel={t('emergency.button')}
        accessibilityRole="button"
        accessibilityHint={t('emergency.hint')}
      >
        <View style={styles.content}>
          <Text style={styles.icon}>🚨</Text>
          <Text style={styles.text} allowFontScaling={true}>
            {t('emergency.button') || 'EMERGENCY'}
          </Text>
          <Text style={styles.subtext} allowFontScaling={true}>
            {t('emergency.subtext') || 'Press and hold for immediate help'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    marginHorizontal: 16,
    marginVertical: 8
  },
  button: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  icon: {
    fontSize: 48,
    marginBottom: 8
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 1
  },
  subtext: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    marginTop: 4
  }
});


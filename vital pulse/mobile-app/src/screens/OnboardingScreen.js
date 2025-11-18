import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRegion, getRegionColors } from '../hooks/useRegion';

const { width } = Dimensions.get('window');

/**
 * Onboarding Screen - First Launch Setup
 * Quick region setup + role selection
 */
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { region, updateRegion, loading: regionLoading } = useRegion();
  const colors = getRegionColors(region?.code || 'default');
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedRole, setSelectedRole] = useState(null);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const hasOnboarded = await AsyncStorage.getItem('has_onboarded');
      if (hasOnboarded === 'true') {
        // Skip onboarding if already done
        navigation.replace('Main');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const slides = [
    {
      id: 1,
      title: t('onboarding.welcome.title') || 'Save Lives Nearby',
      description: t('onboarding.welcome.description') || 'Connect with donors and hospitals in your area instantly.',
      icon: '🩸',
      image: null
    },
    {
      id: 2,
      title: t('onboarding.role.title') || 'Your Role?',
      description: t('onboarding.role.description') || 'Choose how you want to help in emergencies.',
      icon: '❤️',
      image: null
    },
    {
      id: 3,
      title: t('onboarding.safety.title') || 'Safety First',
      description: t('onboarding.safety.description') || 'We protect your privacy and verify all requests.',
      icon: '🛡️',
      image: null
    }
  ];

  const roles = [
    { id: 'donor', title: t('onboarding.role.donor') || 'I Can Donate', icon: '🩸', description: t('onboarding.role.donorDesc') || 'Help save lives by donating blood' },
    { id: 'requester', title: t('onboarding.role.requester') || 'I May Need Blood', icon: '🏥', description: t('onboarding.role.requesterDesc') || 'Find donors when needed' },
    { id: 'both', title: t('onboarding.role.both') || 'Both', icon: '❤️', description: t('onboarding.role.bothDesc') || 'I can donate and may need blood' }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
      setCurrentSlide(currentSlide + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('has_onboarded', 'true');
      if (selectedRole) {
        await AsyncStorage.setItem('user_role', selectedRole);
      }
      navigation.replace('Main');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      navigation.replace('Main');
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('has_onboarded', 'true');
      navigation.replace('Main');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      navigation.replace('Main');
    }
  };

  if (regionLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.secondary }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.secondary }]}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText} allowFontScaling={true}>
          {t('common.skip') || 'Skip'}
        </Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.slideContainer, { opacity: fadeAnim }]}>
          {/* Slide icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Text style={styles.icon}>{slide.icon}</Text>
          </View>

          {/* Slide title */}
          <Text style={[styles.title, { color: colors.emergency }]} allowFontScaling={true}>
            {slide.title}
          </Text>

          {/* Regional twist - show local example */}
          {currentSlide === 0 && region && (
            <View style={[styles.regionalExample, { backgroundColor: colors.accent }]}>
              <Text style={styles.regionalText} allowFontScaling={true}>
                📍 {t('onboarding.welcome.example', { region: region.code }) || `Find blood in ${region.code === 'IN' ? 'Mumbai' : region.code === 'NG' ? 'Lagos' : 'your city'}?`}
              </Text>
            </View>
          )}

          {/* Slide description */}
          <Text style={styles.description} allowFontScaling={true}>
            {slide.description}
          </Text>

          {/* Role selection (slide 2) */}
          {currentSlide === 1 && (
            <View style={styles.rolesContainer}>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: selectedRole === role.id ? colors.primary : '#FFFFFF',
                      borderColor: selectedRole === role.id ? colors.emergency : '#E0E0E0',
                      borderWidth: selectedRole === role.id ? 2 : 1
                    }
                  ]}
                  onPress={() => handleRoleSelect(role.id)}
                  accessibilityLabel={role.title}
                  accessibilityRole="button"
                >
                  <Text style={styles.roleIcon}>{role.icon}</Text>
                  <Text
                    style={[
                      styles.roleTitle,
                      { color: selectedRole === role.id ? '#FFFFFF' : '#212529' }
                    ]}
                    allowFontScaling={true}
                  >
                    {role.title}
                  </Text>
                  <Text
                    style={[
                      styles.roleDescription,
                      { color: selectedRole === role.id ? '#FFFFFF' : '#6C757D' }
                    ]}
                    allowFontScaling={true}
                  >
                    {role.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Safety features (slide 3) */}
          {currentSlide === 2 && (
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🔒</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle} allowFontScaling={true}>
                    {t('onboarding.safety.privacy') || 'Privacy Protected'}
                  </Text>
                  <Text style={styles.featureDescription} allowFontScaling={true}>
                    {t('onboarding.safety.privacyDesc') || 'Your phone number is never shown directly'}
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✅</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle} allowFontScaling={true}>
                    {t('onboarding.safety.verified') || 'Verified Requests'}
                  </Text>
                  <Text style={styles.featureDescription} allowFontScaling={true}>
                    {t('onboarding.safety.verifiedDesc') || 'All requests require hospital verification'}
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🚨</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle} allowFontScaling={true}>
                    {t('onboarding.safety.instant') || 'Instant Alerts'}
                  </Text>
                  <Text style={styles.featureDescription} allowFontScaling={true}>
                    {t('onboarding.safety.instantDesc') || 'Get notified of emergencies near you'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Dots indicator */}
          <View style={styles.dotsContainer}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentSlide ? colors.emergency : '#CCCCCC',
                    width: index === currentSlide ? 24 : 8,
                    height: 8
                  }
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Navigation buttons */}
      <View style={[styles.navigation, { backgroundColor: colors.secondary }]}>
        {currentSlide > 0 && (
          <TouchableOpacity
            style={[styles.navButton, styles.backButton]}
            onPress={handlePrevious}
            accessibilityLabel={t('common.back') || 'Back'}
          >
            <Text style={styles.backButtonText} allowFontScaling={true}>
              {t('common.back') || 'Back'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            {
              backgroundColor: colors.emergency,
              flex: currentSlide === 0 ? 1 : undefined
            }
          ]}
          onPress={handleNext}
          disabled={currentSlide === 1 && !selectedRole}
          accessibilityLabel={isLastSlide ? (t('common.start') || 'Get Started') : (t('common.next') || 'Next')}
        >
          <Text style={styles.nextButtonText} allowFontScaling={true}>
            {isLastSlide ? (t('common.start') || 'Get Started') : (t('common.next') || 'Next')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6C757D',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideContainer: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  regionalExample: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  regionalText: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '600',
  },
  description: {
    fontSize: 18,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  rolesContainer: {
    width: '100%',
    marginTop: 16,
    gap: 16,
  },
  roleCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 120,
    justifyContent: 'center',
  },
  roleIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  roleDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  featuresContainer: {
    width: '100%',
    marginTop: 16,
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
  },
  dot: {
    borderRadius: 4,
    transition: 'all 0.3s ease',
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  backButton: {
    backgroundColor: '#F5F5F5',
    flex: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C757D',
  },
  nextButton: {
    flex: currentSlide === 0 ? 1 : 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});


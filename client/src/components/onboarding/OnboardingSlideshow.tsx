import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
  features: string[];
}

const slides: Slide[] = [
  {
    id: 1,
    title: 'Risk Report',
    subtitle: 'Professional Portfolio Risk Analysis',
    description: 'Advanced Value at Risk (VaR) calculations and comprehensive portfolio risk management for institutional and individual investors.',
    icon: 'analytics-outline',
    gradient: ['#667eea', '#764ba2'],
    features: ['Monte Carlo Simulations', 'Historical VaR Analysis', 'Parametric Risk Models']
  },
  {
    id: 2,
    title: 'Portfolio Management',
    subtitle: 'Intelligent Asset Allocation',
    description: 'Create, manage, and optimize your investment portfolios with real-time market data and sophisticated risk metrics.',
    icon: 'pie-chart-outline',
    gradient: ['#f093fb', '#f5576c'],
    features: ['Real-time Portfolio Tracking', 'Asset Allocation Analysis', 'Performance Attribution']
  },
  {
    id: 3,
    title: 'Risk Analytics',
    subtitle: 'Advanced Risk Metrics',
    description: 'Comprehensive risk analysis including VaR, CVaR, stress testing, and scenario analysis with professional-grade visualizations.',
    icon: 'trending-up-outline',
    gradient: ['#4facfe', '#00f2fe'],
    features: ['Value at Risk (VaR)', 'Conditional VaR (CVaR)', 'Stress Testing & Scenarios']
  },
  {
    id: 4,
    title: 'Market Intelligence',
    subtitle: 'Real-time Market Data',
    description: 'Access to multiple market data providers with configurable refresh rates and comprehensive historical data coverage.',
    icon: 'globe-outline',
    gradient: ['#43e97b', '#38f9d7'],
    features: ['Multiple Data Sources', 'Real-time Updates', 'Historical Analysis']
  },
  {
    id: 5,
    title: 'Professional Reports',
    subtitle: 'Export & Share Insights',
    description: 'Generate professional risk reports, export to Excel, and share insights with stakeholders through comprehensive documentation.',
    icon: 'document-text-outline',
    gradient: ['#fa709a', '#fee140'],
    features: ['PDF Risk Reports', 'Excel Integration', 'Email Scheduling']
  }
];

interface OnboardingSlideshowProps {
  onComplete: () => void;
}

export default function OnboardingSlideshow({ onComplete }: OnboardingSlideshowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animate in the first slide
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const nextIndex = currentSlide + 1;
      setCurrentSlide(nextIndex);
      slideRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const prevIndex = currentSlide - 1;
      setCurrentSlide(prevIndex);
      slideRef.current?.scrollTo({ x: prevIndex * width, animated: true });
    }
  };

  const skipToEnd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  };

  const renderSlide = (slide: Slide, index: number) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [50, 0, 50],
      extrapolate: 'clamp',
    });

    return (
      <View key={slide.id} style={styles.slide}>
        <LinearGradient colors={slide.gradient as any} style={styles.slideGradient}>
          <Animated.View 
            style={[
              styles.slideContent,
              {
                opacity,
                transform: [{ scale }, { translateY }],
              },
            ]}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name={slide.icon} size={80} color="white" />
            </View>

            {/* Title */}
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>

            {/* Description */}
            <Text style={styles.slideDescription}>{slide.description}</Text>

            {/* Features */}
            <View style={styles.featuresContainer}>
              {slide.features.map((feature, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.pageIndicators}>
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View 
              key={index} 
              style={[styles.pageIndicator, currentSlide === index && styles.activeIndicator]} 
            />
          ))}
        </View>
        <Text style={styles.pageText}>
          {slides[currentSlide]?.title || 'Loading...'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={skipToEnd}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.ScrollView
        ref={slideRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentSlide(slideIndex);
        }}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => renderSlide(slide, index))}
      </Animated.ScrollView>

      {/* Bottom Controls */}
      <View style={styles.bottomContainer}>
        {renderPagination()}
        
        <View style={styles.navigationContainer}>
          {currentSlide > 0 && (
            <TouchableOpacity style={styles.navButton} onPress={prevSlide}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.nextButton} onPress={nextSlide}>
            <Text style={styles.nextButtonText}>
              {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            {currentSlide < slides.length - 1 && (
              <Ionicons name="chevron-forward" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  skipText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    height,
  },
  slideGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  slideSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  slideDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresContainer: {
    alignItems: 'flex-start',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  pageIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activeIndicator: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  pageText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 120,
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
}); 
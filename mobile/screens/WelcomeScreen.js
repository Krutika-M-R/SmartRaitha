import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

const crops = [
  { emoji: '🌾', styleName: 'cropOne', delay: 0, duration: 2600 },
  { emoji: '🌽', styleName: 'cropTwo', delay: 350, duration: 3000 },
  { emoji: '🍅', styleName: 'cropThree', delay: 700, duration: 2800 },
  { emoji: '🥕', styleName: 'cropFour', delay: 1050, duration: 3200 },
  { emoji: '🌶️', styleName: 'cropFive', delay: 1400, duration: 2900 },
];

function FloatingCrop({ emoji, styleName, delay, duration }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, duration, progress]);

  const animatedStyle = {
    opacity: progress.interpolate({ inputRange: [0, 0.18, 0.82, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [30, -85] }) },
      { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 1, 0.9] }) },
      { rotate: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-12deg', '8deg', '-5deg'] }) },
    ],
  };

  return <Animated.Text style={[styles.crop, styles[styleName], animatedStyle]}>{emoji}</Animated.Text>;
}

export default function WelcomeScreen() {
  const farmerProgress = useRef(new Animated.Value(0)).current;
  const pulseProgress = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const farmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(farmerProgress, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(farmerProgress, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    farmerAnimation.start();
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseProgress, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulseProgress, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    );
    const loadingAnimation = Animated.loop(
      Animated.timing(loadingProgress, { toValue: 1, duration: 1800, useNativeDriver: false }),
    );
    pulseAnimation.start();
    loadingAnimation.start();
    return () => {
      farmerAnimation.stop();
      pulseAnimation.stop();
      loadingAnimation.stop();
    };
  }, [farmerProgress, pulseProgress, loadingProgress]);

  return (
    <View style={styles.container}>
      <View style={styles.topGlow} />
      <Animated.View
        style={[
          styles.halo,
          {
            opacity: pulseProgress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] }),
            transform: [{ scale: pulseProgress.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] }) }],
          },
        ]}
      />
      <Animated.Text
        style={[
          styles.farmer,
          {
            transform: [
              { translateY: farmerProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
              { rotate: farmerProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-3deg', '3deg', '-3deg'] }) },
            ],
          },
        ]}
      >
        👨‍🌾
      </Animated.Text>
      {crops.map((crop) => <FloatingCrop key={crop.emoji} {...crop} />)}
      <View style={styles.brandBlock}>
        <Text style={styles.title}>SmartRaitha</Text>
        <Text style={styles.subtitle}>Grow wiser. Sell better.</Text>
        <View style={styles.loadingTrack}>
          <Animated.View
            style={[
              styles.loadingFill,
              { width: loadingProgress.interpolate({ inputRange: [0, 1], outputRange: ['18%', '100%'] }) },
            ]}
          />
        </View>
      </View>
      <View style={styles.ground} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  topGlow: { position: 'absolute', top: -90, width: 280, height: 220, borderRadius: 140, backgroundColor: '#4D9951', opacity: 0.45 },
  halo: { position: 'absolute', top: '15%', width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: '#A9D8A9', backgroundColor: '#4A934E' },
  title: {
    color: colors.surface,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  brandBlock: { position: 'absolute', top: '63%', alignItems: 'center' },
  subtitle: { color: '#D7EED8', fontSize: 14, marginTop: 6, letterSpacing: 0.4 },
  loadingTrack: { width: 104, height: 4, borderRadius: 2, backgroundColor: '#4A934E', marginTop: 20, overflow: 'hidden' },
  loadingFill: { height: '100%', borderRadius: 2, backgroundColor: '#D7EED8' },
  ground: { position: 'absolute', bottom: '13%', width: '62%', height: 2, backgroundColor: '#8BC58D', opacity: 0.6 },
  farmer: { position: 'absolute', top: '20%', fontSize: 78 },
  crop: { position: 'absolute', fontSize: 34 },
  cropOne: { left: '16%', top: '46%' },
  cropTwo: { left: '30%', top: '35%' },
  cropThree: { right: '17%', top: '44%' },
  cropFour: { right: '30%', top: '31%' },
  cropFive: { left: '48%', top: '56%' },
});
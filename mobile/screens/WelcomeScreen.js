import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View, Text, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { colors } from '../constants/colors';

const produce = [
  { emoji: '🍎', styleName: 'produceOne', delay: 0 },
  { emoji: '🍊', styleName: 'produceTwo', delay: 300 },
  { emoji: '🍇', styleName: 'produceThree', delay: 600 },
  { emoji: '🥭', styleName: 'produceFour', delay: 900 },
  { emoji: '🍍', styleName: 'produceFive', delay: 1200 },
  { emoji: '🥕', styleName: 'produceSix', delay: 1500 },
  { emoji: '🥦', styleName: 'produceSeven', delay: 1800 },
  { emoji: '🌽', styleName: 'produceEight', delay: 2100 },
];

function FallingProduce({ emoji, styleName, delay }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 0.82,
          duration: 850,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(progress, { toValue: 1.08, useNativeDriver: true, speed: 12, bounciness: 12 }),
        Animated.spring(progress, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }),
        Animated.delay(900),
        Animated.timing(progress, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);

  const animatedStyle = {
    opacity: progress.interpolate({ inputRange: [0, 0.12, 0.22, 1], outputRange: [0, 0, 1, 1] }),
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 0.82, 1, 1.08], outputRange: [-125, 0, -5, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 0.82, 1, 1.08], outputRange: [0.35, 1, 1.18, 1] }) },
      { rotate: progress.interpolate({ inputRange: [0, 0.82, 1, 1.08], outputRange: ['-24deg', '0deg', '12deg', '-6deg'] }) },
    ],
  };

  return <Animated.Text style={[styles.produce, styles[styleName], animatedStyle]}>{emoji}</Animated.Text>;
}

function FallingWatermelon() {
  const fall = useRef(new Animated.Value(0)).current;
  const split = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(fall, { toValue: 0.82, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.spring(fall, { toValue: 1.08, useNativeDriver: true, speed: 11, bounciness: 12 }),
        Animated.spring(fall, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }),
        Animated.timing(split, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(650),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(fall, { toValue: 0, duration: 1, useNativeDriver: true }),
          Animated.timing(split, { toValue: 0, duration: 1, useNativeDriver: true }),
        ]),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [fall, opacity, split]);

  const wholeStyle = {
    opacity: opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [
      { translateY: fall.interpolate({ inputRange: [0, 0.82, 1, 1.08], outputRange: [-120, 0, -6, 0] }) },
      { rotate: fall.interpolate({ inputRange: [0, 0.82, 1, 1.08], outputRange: ['-20deg', '0deg', '10deg', '-5deg'] }) },
      { scale: fall.interpolate({ inputRange: [0, 0.82, 1, 1.08], outputRange: [0.35, 1, 1.12, 1] }) },
    ],
  };
  const cutOpacity = split.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0, 1] });
  const leftHalfStyle = {
    opacity: Animated.multiply(opacity, cutOpacity),
    transform: [{ translateX: split.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }],
  };
  const rightHalfStyle = {
    opacity: Animated.multiply(opacity, cutOpacity),
    transform: [{ translateX: split.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }],
  };

  return (
    <View style={styles.watermelonPosition}>
      <Animated.View style={[styles.watermelon, wholeStyle]}>
        <View style={styles.watermelonStripeOne} />
        <View style={styles.watermelonStripeTwo} />
        <View style={styles.watermelonStripeThree} />
      </Animated.View>
      <Animated.Text style={[styles.watermelonHalfLeft, leftHalfStyle]}>🍉</Animated.Text>
      <Animated.Text style={[styles.watermelonHalfRight, rightHalfStyle]}>🍉</Animated.Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const [fontsLoaded] = useFonts({
    VintageDisplay: require('@expo-google-fonts/abril-fatface/400Regular/AbrilFatface_400Regular.ttf'),
    DapperItalic: require('@expo-google-fonts/cormorant-garamond/600SemiBold_Italic/CormorantGaramond_600SemiBold_Italic.ttf'),
  });
  const loadingProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadingAnimation = Animated.loop(
      Animated.timing(loadingProgress, { toValue: 1, duration: 1800, useNativeDriver: false }),
    );
    loadingAnimation.start();
    return () => {
      loadingAnimation.stop();
    };
  }, [loadingProgress]);

  return (
    <View style={styles.container}>
      <View style={styles.topGlow} />
      <View style={styles.farmerFrame}>
        <Image
          source={require('../assets/WhatsApp Image 2026-10-10 at 2.38.18 PM.jpeg')}
          style={styles.farmerImage}
          resizeMode="contain"
        />
      </View>
      {produce.map((item) => <FallingProduce key={item.emoji} {...item} />)}
      <FallingWatermelon />
      <View style={styles.brandBlock}>
        <Text style={[styles.title, fontsLoaded && styles.vintageTitle]}>SmartRaitha</Text>
        <Text style={[styles.subtitle, fontsLoaded && styles.dapperTagline]}>
          Every cost counted.{ '\n' }Every return considered.
        </Text>
        <View style={styles.loadingTrack}>
          <Animated.View
            style={[
              styles.loadingFill,
              { width: loadingProgress.interpolate({ inputRange: [0, 1], outputRange: ['18%', '100%'] }) },
            ]}
          />
        </View>
      </View>
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
  farmerFrame: {
    position: 'absolute',
    top: '15%',
    width: 286,
    height: 286,
    borderRadius: 30,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  farmerImage: { width: '100%', height: '100%' },
  title: {
    color: colors.surface,
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: 0,
  },
  vintageTitle: { fontFamily: 'VintageDisplay' },
  brandBlock: { position: 'absolute', top: '61%', alignItems: 'center' },
  subtitle: { color: '#D7EED8', fontSize: 21, marginTop: 5, lineHeight: 28, textAlign: 'center' },
  dapperTagline: { fontFamily: 'DapperItalic', fontWeight: '600' },
  loadingTrack: { width: 104, height: 4, borderRadius: 2, backgroundColor: '#4A934E', marginTop: 15, overflow: 'hidden' },
  loadingFill: { height: '100%', borderRadius: 2, backgroundColor: '#D7EED8' },
  produce: { position: 'absolute', fontSize: 34 },
  produceOne: { left: '14%', top: '34%' },
  produceTwo: { left: '31%', top: '42%' },
  produceThree: { right: '14%', top: '35%' },
  produceFour: { right: '29%', top: '47%' },
  produceFive: { left: '48%', top: '31%' },
  produceSix: { left: '5%', top: '50%' },
  produceSeven: { right: '6%', top: '53%' },
  produceEight: { right: '32%', top: '29%' },
  watermelonPosition: { position: 'absolute', left: '43%', top: '48%', width: 66, height: 66 },
  watermelon: { position: 'absolute', left: 6, top: 6, width: 54, height: 54, borderRadius: 27, backgroundColor: '#42A84B', overflow: 'hidden', borderWidth: 2, borderColor: '#276B32' },
  watermelonStripeOne: { position: 'absolute', left: 12, top: -8, width: 8, height: 70, borderRadius: 4, backgroundColor: '#28763A', transform: [{ rotate: '22deg' }] },
  watermelonStripeTwo: { position: 'absolute', left: 27, top: -8, width: 8, height: 70, borderRadius: 4, backgroundColor: '#28763A', transform: [{ rotate: '22deg' }] },
  watermelonStripeThree: { position: 'absolute', left: 42, top: -8, width: 8, height: 70, borderRadius: 4, backgroundColor: '#28763A', transform: [{ rotate: '22deg' }] },
  watermelonHalfLeft: { position: 'absolute', left: -3, top: 5, fontSize: 38 },
  watermelonHalfRight: { position: 'absolute', right: -3, top: 5, fontSize: 38 },
});
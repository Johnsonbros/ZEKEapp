import React, { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BorderRadius } from "@/constants/theme";

interface FloatingHubButtonProps {
  onPress: () => void;
  zekeIsActive?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FloatingHubButton({ onPress, zekeIsActive = false }: FloatingHubButtonProps) {
  const insets = useSafeAreaInsets();
  const pulseAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      false
    );

    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      false
    );
  }, [pulseAnim, glowAnim]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const handlePressIn = () => {
    scaleAnim.value = withTiming(0.9, { duration: 100 });
  };

  const handlePressOut = () => {
    scaleAnim.value = withTiming(1, { duration: 100 });
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnim.value, [0, 1], [1, 1.05]) * scaleAnim.value;
    return {
      transform: [{ scale }],
    };
  });

  const glowAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      glowAnim.value,
      [0, 1],
      [0.3, 0.8],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      glowAnim.value,
      [0, 1],
      [1, 1.3],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 16,
          right: 16,
        },
      ]}
    >
      <Animated.View
        style={[styles.glow, glowAnimatedStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glowGradient}
        />
      </Animated.View>

      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.button, buttonAnimatedStyle]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Open ZEKE Apps"
        accessibilityHint="Opens the ZEKE services hub"
      >
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          <Feather name="grid" size={28} color="#FFFFFF" />
          {zekeIsActive && (
            <Animated.View style={styles.activeBadge}>
              <Feather name="zap" size={12} color="#FFFFFF" />
            </Animated.View>
          )}
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 1000,
  },
  glow: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    top: -6,
    left: -6,
  },
  glowGradient: {
    flex: 1,
    borderRadius: 38,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0px 4px 24px rgba(99, 102, 241, 0.4)",
      },
      default: {
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  buttonGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
  withDelay,
  type SharedValue,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors, Gradients } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CUBE_SIZE_COLLAPSED = 58;
const CUBE_SIZE_EXPANDED = Math.min(SCREEN_WIDTH * 0.75, 300);

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 180,
  mass: 0.8,
};

const SPRING_CONFIG_BOUNCY = {
  damping: 14,
  stiffness: 140,
  mass: 0.6,
};

export interface CubeAction {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  gradientColors: readonly [string, string];
  onPress: () => void;
}

interface ZekeCubeProps {
  actions: CubeAction[];
  onZekePress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FACE_GRADIENTS: readonly (readonly [string, string])[] = [
  ["#6366F1", "#8B5CF6"],
  ["#EC4899", "#8B5CF6"],
  ["#10B981", "#059669"],
  ["#F59E0B", "#EA580C"],
  ["#3B82F6", "#6366F1"],
  ["#8B5CF6", "#EC4899"],
];

interface CubeFaceViewProps {
  faceIndex: number;
  actions: CubeAction[];
  isExpanded: boolean;
  onActionPress: (action: CubeAction) => void;
  onZekePress: () => void;
  animProgress: Animated.SharedValue<number>;
}

function CubeFaceView({
  faceIndex,
  actions,
  isExpanded,
  onActionPress,
  onZekePress,
  animProgress,
}: CubeFaceViewProps) {
  const { theme } = useTheme();
  const gradientColors = FACE_GRADIENTS[faceIndex % FACE_GRADIENTS.length];

  const containerStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animProgress.value,
      [0, 1],
      [1, 1.02],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
    };
  });

  if (faceIndex === 0) {
    return (
      <Animated.View style={[styles.faceContainer, containerStyle]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.faceGradient}
        >
          <View style={styles.glassOverlay} />
          <View style={styles.innerBorder} />
          <Pressable style={styles.zekeFaceContent} onPress={onZekePress}>
            <View style={styles.zekeIconCircle}>
              <Feather name="zap" size={isExpanded ? 42 : 24} color="#FFFFFF" />
            </View>
            {isExpanded ? (
              <ThemedText style={styles.zekeLabel}>ZEKE AI</ThemedText>
            ) : null}
            {isExpanded ? (
              <ThemedText style={styles.zekeSubLabel}>Tap to chat</ThemedText>
            ) : null}
          </Pressable>
        </LinearGradient>
      </Animated.View>
    );
  }

  const faceActions = actions.slice((faceIndex - 1) * 4, faceIndex * 4);

  return (
    <Animated.View style={[styles.faceContainer, containerStyle]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.faceGradient}
      >
        <View style={styles.glassOverlay} />
        <View style={styles.innerBorder} />
        <View style={styles.actionGrid}>
          {faceActions.map((action, idx) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [
                styles.actionItem,
                pressed && styles.actionItemPressed,
              ]}
              onPress={() => onActionPress(action)}
            >
              <LinearGradient
                colors={action.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.actionIconBg,
                  { width: isExpanded ? 56 : 32, height: isExpanded ? 56 : 32 },
                ]}
              >
                <Feather
                  name={action.icon}
                  size={isExpanded ? 26 : 16}
                  color="#FFFFFF"
                />
              </LinearGradient>
              {isExpanded ? (
                <ThemedText style={styles.actionLabel} numberOfLines={1}>
                  {action.label}
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export function ZekeCube({ actions, onZekePress }: ZekeCubeProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentFace, setCurrentFace] = useState(0);

  const totalFaces = Math.ceil(actions.length / 4) + 1;

  const cubeSize = useSharedValue(CUBE_SIZE_COLLAPSED);
  const backdropOpacity = useSharedValue(0);
  const rotationY = useSharedValue(0);
  const rotationX = useSharedValue(0);
  const scale = useSharedValue(1);
  const glowPulse = useSharedValue(0);
  const faceProgress = useSharedValue(0);

  useEffect(() => {
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [glowPulse]);

  const handleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExpanded(true);
    cubeSize.value = withSpring(CUBE_SIZE_EXPANDED, SPRING_CONFIG_BOUNCY);
    scale.value = withSpring(1, SPRING_CONFIG);
    backdropOpacity.value = withTiming(1, { duration: 300 });
  }, [cubeSize, scale, backdropOpacity]);

  const handleCollapse = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cubeSize.value = withSpring(CUBE_SIZE_COLLAPSED, SPRING_CONFIG);
    scale.value = withSpring(1, SPRING_CONFIG);
    backdropOpacity.value = withTiming(0, { duration: 200 });
    rotationY.value = withSpring(0, SPRING_CONFIG);
    rotationX.value = withSpring(0, SPRING_CONFIG);
    setTimeout(() => {
      setIsExpanded(false);
      setCurrentFace(0);
    }, 200);
  }, [cubeSize, scale, backdropOpacity, rotationY, rotationX]);

  const handleActionPress = useCallback((action: CubeAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleCollapse();
    setTimeout(() => {
      action.onPress();
    }, 250);
  }, [handleCollapse]);

  const handleZekePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    handleCollapse();
    if (onZekePress) {
      setTimeout(() => {
        onZekePress();
      }, 250);
    }
  }, [handleCollapse, onZekePress]);

  const nextFace = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentFace((prev) => (prev + 1) % totalFaces);
    rotationY.value = withSequence(
      withTiming(rotationY.value + 15, { duration: 100 }),
      withSpring(0, SPRING_CONFIG)
    );
    faceProgress.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 150 })
    );
  }, [totalFaces, rotationY, faceProgress]);

  const prevFace = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentFace((prev) => (prev - 1 + totalFaces) % totalFaces);
    rotationY.value = withSequence(
      withTiming(rotationY.value - 15, { duration: 100 }),
      withSpring(0, SPRING_CONFIG)
    );
    faceProgress.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 150 })
    );
  }, [totalFaces, rotationY, faceProgress]);

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (!isExpanded) {
        runOnJS(handleExpand)();
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(isExpanded)
    .onUpdate((event) => {
      rotationY.value = event.translationX * 0.15;
      rotationX.value = -event.translationY * 0.08;
    })
    .onEnd((event) => {
      const threshold = 50;
      if (event.translationX > threshold) {
        runOnJS(prevFace)();
      } else if (event.translationX < -threshold) {
        runOnJS(nextFace)();
      } else {
        rotationY.value = withSpring(0, SPRING_CONFIG);
      }
      rotationX.value = withSpring(0, SPRING_CONFIG);
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const cubeContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotationY.value}deg` },
        { rotateX: `${rotationX.value}deg` },
        { scale: scale.value },
      ],
    };
  });

  const cubeSizeStyle = useAnimatedStyle(() => ({
    width: cubeSize.value,
    height: cubeSize.value,
    borderRadius: interpolate(
      cubeSize.value,
      [CUBE_SIZE_COLLAPSED, CUBE_SIZE_EXPANDED],
      [BorderRadius.md, BorderRadius.xl],
      Extrapolation.CLAMP
    ),
  }));

  const glowStyle = useAnimatedStyle(() => {
    const glowOpacity = interpolate(glowPulse.value, [0, 1], [0.4, 0.8]);
    const glowScale = interpolate(glowPulse.value, [0, 1], [1, 1.15]);
    return {
      opacity: glowOpacity,
      transform: [{ scale: glowScale }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const faceIndicators = useMemo(() => {
    return Array.from({ length: totalFaces }, (_, i) => i);
  }, [totalFaces]);

  return (
    <>
      {isExpanded ? (
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <BlurView
            intensity={Platform.OS === "web" ? 25 : 50}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.backdropOverlay} />
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCollapse} />
        </Animated.View>
      ) : null}

      <View
        style={[
          styles.cubeWrapper,
          isExpanded ? styles.cubeWrapperExpanded : styles.cubeWrapperCollapsed,
          !isExpanded && {
            bottom: insets.bottom + 90,
            right: Spacing.lg,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glow,
            {
              width: isExpanded ? CUBE_SIZE_EXPANDED + 40 : CUBE_SIZE_COLLAPSED + 20,
              height: isExpanded ? CUBE_SIZE_EXPANDED + 40 : CUBE_SIZE_COLLAPSED + 20,
              borderRadius: isExpanded ? BorderRadius.xl + 10 : BorderRadius.md + 5,
            },
            glowStyle,
          ]}
        >
          <LinearGradient
            colors={["#6366F1", "#8B5CF6", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.cubeOuter, cubeSizeStyle, cubeContainerStyle]}>
            <View style={styles.cubeEdgeHighlight} />
            <CubeFaceView
              faceIndex={currentFace}
              actions={actions}
              isExpanded={isExpanded}
              onActionPress={handleActionPress}
              onZekePress={handleZekePress}
              animProgress={faceProgress}
            />
          </Animated.View>
        </GestureDetector>

        {isExpanded ? (
          <View style={styles.faceIndicatorContainer}>
            {faceIndicators.map((idx) => (
              <View
                key={idx}
                style={[
                  styles.faceIndicator,
                  idx === currentFace && styles.faceIndicatorActive,
                ]}
              />
            ))}
          </View>
        ) : null}

        {isExpanded ? (
          <View style={styles.swipeHint}>
            <Feather name="chevrons-left" size={16} color="rgba(255,255,255,0.5)" />
            <ThemedText style={styles.swipeHintText}>Swipe to explore</ThemedText>
            <Feather name="chevrons-right" size={16} color="rgba(255,255,255,0.5)" />
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  cubeWrapper: {
    position: "absolute",
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
  },
  cubeWrapperCollapsed: {
    position: "absolute",
  },
  cubeWrapperExpanded: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    overflow: "hidden",
  },
  cubeOuter: {
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0px 12px 40px rgba(99, 102, 241, 0.4), 0px 4px 20px rgba(0, 0, 0, 0.3)",
      },
      default: {
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 20,
      },
    }),
  },
  cubeEdgeHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    zIndex: 10,
  },
  faceContainer: {
    flex: 1,
    overflow: "hidden",
  },
  faceGradient: {
    flex: 1,
    padding: Spacing.md,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    margin: 1,
    borderRadius: BorderRadius.lg,
  },
  zekeFaceContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  zekeIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  zekeLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  zekeSubLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: -Spacing.xs,
  },
  actionGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  actionItem: {
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  actionItemPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    transform: [{ scale: 0.95 }],
  },
  actionIconBg: {
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  actionLabel: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 70,
  },
  faceIndicatorContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  faceIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  faceIndicatorActive: {
    backgroundColor: "#FFFFFF",
    width: 24,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  swipeHintText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
});

import React, { useState, useCallback, useEffect, useRef } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  SharedValue,
  runOnJS,
  Easing,
  cancelAnimation,
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
const STORAGE_KEY = "@zeke_launcher_order";

export interface LauncherItem {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  gradientColors: readonly [string, string];
  onPress: () => void;
}

interface ZekeLauncherProps {
  items: LauncherItem[];
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ICON_SIZE = 52;
const ICON_CONTAINER_SIZE = 64;
const GRID_GAP = 16;
const COLUMNS = 4;
const TRIGGER_SIZE = 56;

function TriggerButton({
  onPress,
  isOpen,
  pulseAnim,
  glowAnim,
}: {
  onPress: () => void;
  isOpen: boolean;
  pulseAnim: SharedValue<number>;
  glowAnim: SharedValue<number>;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const triggerAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnim.value, [0, 1], [1, 1.05]);
    const rotate = isOpen ? 45 : 0;
    return {
      transform: [
        { scale },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const glowAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(glowAnim.value, [0, 1], [0.3, 0.8]);
    const scale = interpolate(glowAnim.value, [0, 1], [1, 1.3]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const innerGlowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(glowAnim.value, [0, 1], [0.5, 1]);
    return { opacity };
  });

  return (
    <View
      style={[
        styles.triggerContainer,
        {
          bottom: insets.bottom + Spacing.lg,
        },
      ]}
    >
      <Animated.View style={[styles.triggerGlow, glowAnimatedStyle]}>
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.triggerGlowGradient}
        />
      </Animated.View>

      <AnimatedPressable onPress={onPress} style={[styles.trigger, triggerAnimatedStyle]}>
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.triggerGradient}
        >
          <Animated.View style={[styles.triggerInnerGlow, innerGlowStyle]} />
          <View style={styles.triggerIconContainer}>
            <Feather
              name={isOpen ? "x" : "grid"}
              size={24}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.scanLine} />
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
}

interface LauncherIconProps {
  item: LauncherItem;
  index: number;
  totalItems: number;
  animationProgress: SharedValue<number>;
  isEditMode: boolean;
  wiggleOffset: number;
  onPress: () => void;
  onLongPress: () => void;
  onDragStart: () => void;
  onDragEnd: (index: number, deltaX: number, deltaY: number) => void;
  isDragging: boolean;
  draggedIndex: number | null;
  positions: { x: number; y: number }[];
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
}

function LauncherIcon({
  item,
  index,
  totalItems,
  animationProgress,
  isEditMode,
  wiggleOffset,
  onPress,
  onLongPress,
  onDragStart,
  onDragEnd,
  isDragging,
  draggedIndex,
  positions,
  translateX,
  translateY,
}: LauncherIconProps) {
  const { theme } = useTheme();
  const wiggleAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    if (isEditMode) {
      wiggleAnim.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 80, easing: Easing.linear }),
          withTiming(3, { duration: 80, easing: Easing.linear }),
          withTiming(-3, { duration: 80, easing: Easing.linear }),
          withTiming(0, { duration: 80, easing: Easing.linear }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(wiggleAnim);
      wiggleAnim.value = withTiming(0, { duration: 100 });
    }
  }, [isEditMode, wiggleAnim]);

  const row = Math.floor(index / COLUMNS);
  const col = index % COLUMNS;
  const centerX = (COLUMNS - 1) / 2;
  const centerY = (Math.ceil(totalItems / COLUMNS) - 1) / 2;
  const angleFromCenter = Math.atan2(row - centerY, col - centerX);
  const distanceFromCenter = Math.sqrt(
    Math.pow(col - centerX, 2) + Math.pow(row - centerY, 2),
  );

  const iconAnimatedStyle = useAnimatedStyle(() => {
    const delay = index * 0.04;
    const adjustedProgress = Math.max(
      0,
      Math.min(1, (animationProgress.value - delay) / (1 - delay * totalItems * 0.5)),
    );

    const explosionX = Math.cos(angleFromCenter) * distanceFromCenter * 80;
    const explosionY = Math.sin(angleFromCenter) * distanceFromCenter * 80;

    const currentX = interpolate(
      adjustedProgress,
      [0, 0.3, 1],
      [0, explosionX * 0.5, 0],
      Extrapolation.CLAMP,
    );

    const currentY = interpolate(
      adjustedProgress,
      [0, 0.3, 1],
      [0, explosionY * 0.5, 0],
      Extrapolation.CLAMP,
    );

    const scale = interpolate(
      adjustedProgress,
      [0, 0.2, 0.5, 1],
      [0, 0.3, 1.1, 1],
      Extrapolation.CLAMP,
    );

    const rotate = interpolate(
      adjustedProgress,
      [0, 0.5, 1],
      [180, -10, 0],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      adjustedProgress,
      [0, 0.1, 0.3],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    );

    const wiggle = isEditMode ? wiggleAnim.value + wiggleOffset : 0;
    const dragX = isDragging && draggedIndex === index ? translateX.value : 0;
    const dragY = isDragging && draggedIndex === index ? translateY.value : 0;
    const dragScale = isDragging && draggedIndex === index ? 1.15 : 1;

    return {
      opacity,
      transform: [
        { translateX: currentX + dragX },
        { translateY: currentY + dragY },
        { scale: scale * scaleAnim.value * pressScale.value * dragScale },
        { rotate: `${rotate + wiggle}deg` },
      ],
      zIndex: isDragging && draggedIndex === index ? 1000 : 1,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const delay = index * 0.04;
    const adjustedProgress = Math.max(
      0,
      Math.min(1, (animationProgress.value - delay) / (1 - delay * totalItems * 0.5)),
    );
    const glowOpacity = interpolate(
      adjustedProgress,
      [0.5, 0.8, 1],
      [0, 0.6, 0.3],
      Extrapolation.CLAMP,
    );
    return {
      opacity: glowOpacity,
    };
  });

  const handlePressIn = () => {
    pressScale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
      runOnJS(onLongPress)();
    });

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      runOnJS(handlePressIn)();
    })
    .onEnd(() => {
      runOnJS(handlePressOut)();
      if (!isEditMode) {
        runOnJS(onPress)();
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(isEditMode)
    .onStart(() => {
      runOnJS(onDragStart)();
      scaleAnim.value = withSpring(1.15, { damping: 15, stiffness: 200 });
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const finalX = event.translationX;
      const finalY = event.translationY;
      scaleAnim.value = withSpring(1, { damping: 15, stiffness: 200 });
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      runOnJS(onDragEnd)(index, finalX, finalY);
    });

  const composedGesture = Gesture.Race(
    panGesture,
    Gesture.Simultaneous(longPressGesture, tapGesture),
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
        <Animated.View style={[styles.iconGlow, glowStyle]}>
          <LinearGradient
            colors={item.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGlowGradient}
          />
        </Animated.View>
        
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={item.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <View style={styles.iconInnerBorder} />
            <Feather name={item.icon} size={22} color="#FFFFFF" />
          </LinearGradient>
        </View>
        
        <ThemedText type="caption" style={styles.iconLabel} numberOfLines={1}>
          {item.label}
        </ThemedText>

        {isEditMode ? (
          <View style={styles.deleteButton}>
            <Feather name="minus" size={12} color="#FFFFFF" />
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

export function ZekeLauncher({ items }: ZekeLauncherProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [orderedItems, setOrderedItems] = useState<LauncherItem[]>(items);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const animationProgress = useSharedValue(0);
  const pulseAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    loadOrder();
  }, []);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulseAnim, glowAnim]);

  const loadOrder = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const orderIds: string[] = JSON.parse(saved);
        const reordered = orderIds
          .map((id) => items.find((item) => item.id === id))
          .filter(Boolean) as LauncherItem[];
        const newItems = items.filter((item) => !orderIds.includes(item.id));
        setOrderedItems([...reordered, ...newItems]);
      } else {
        setOrderedItems(items);
      }
    } catch {
      setOrderedItems(items);
    }
  };

  const saveOrder = async (newOrder: LauncherItem[]) => {
    try {
      const orderIds = newOrder.map((item) => item.id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(orderIds));
    } catch {
      console.log("Failed to save order");
    }
  };

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isOpen) {
      if (isEditMode) {
        setIsEditMode(false);
        return;
      }
      animationProgress.value = withSpring(0, {
        damping: 18,
        stiffness: 120,
        mass: 0.8,
      });
      backdropOpacity.value = withTiming(0, { duration: 250 });
      setTimeout(() => setIsOpen(false), 300);
    } else {
      setIsOpen(true);
      backdropOpacity.value = withTiming(1, { duration: 300 });
      animationProgress.value = withSpring(1, {
        damping: 14,
        stiffness: 100,
        mass: 0.6,
      });
    }
  }, [isOpen, isEditMode, animationProgress, backdropOpacity]);

  const handleItemPress = useCallback(
    (item: LauncherItem) => {
      if (isEditMode) return;
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animationProgress.value = withTiming(0, { duration: 200 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
      
      setTimeout(() => {
        setIsOpen(false);
        item.onPress();
      }, 150);
    },
    [isEditMode, animationProgress, backdropOpacity],
  );

  const handleLongPress = useCallback(() => {
    setIsEditMode(true);
  }, []);

  const handleDragStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleDragEnd = useCallback(
    (fromIndex: number, deltaX: number, deltaY: number) => {
      const iconWidth = ICON_CONTAINER_SIZE + GRID_GAP;
      const iconHeight = ICON_CONTAINER_SIZE + GRID_GAP + 20;

      const colDelta = Math.round(deltaX / iconWidth);
      const rowDelta = Math.round(deltaY / iconHeight);

      const fromRow = Math.floor(fromIndex / COLUMNS);
      const fromCol = fromIndex % COLUMNS;

      const toRow = Math.max(0, Math.min(Math.ceil(orderedItems.length / COLUMNS) - 1, fromRow + rowDelta));
      const toCol = Math.max(0, Math.min(COLUMNS - 1, fromCol + colDelta));

      const toIndex = Math.min(orderedItems.length - 1, toRow * COLUMNS + toCol);

      if (toIndex !== fromIndex && toIndex >= 0 && toIndex < orderedItems.length) {
        const newOrder = [...orderedItems];
        const [removed] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, removed);
        setOrderedItems(newOrder);
        saveOrder(newOrder);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setDraggedIndex(null);
    },
    [orderedItems],
  );

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.85,
  }));

  const menuContainerStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animationProgress.value,
      [0, 0.5, 1],
      [0.8, 1.02, 1],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      animationProgress.value,
      [0, 0.2],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const gridWidth =
    COLUMNS * ICON_CONTAINER_SIZE + (COLUMNS - 1) * GRID_GAP + Spacing.xl * 2;
  const rows = Math.ceil(orderedItems.length / COLUMNS);
  const gridHeight =
    rows * (ICON_CONTAINER_SIZE + 24) + (rows - 1) * GRID_GAP + Spacing.xl * 2 + 60;

  const positions = orderedItems.map((_, i) => ({
    x: (i % COLUMNS) * (ICON_CONTAINER_SIZE + GRID_GAP),
    y: Math.floor(i / COLUMNS) * (ICON_CONTAINER_SIZE + GRID_GAP + 20),
  }));

  return (
    <>
      {isOpen ? (
        <>
          <Animated.View
            style={[
              styles.backdrop,
              { backgroundColor: theme.backgroundRoot },
              backdropAnimatedStyle,
            ]}
            pointerEvents="auto"
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleToggle}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.menuContainer,
              {
                width: gridWidth,
                height: gridHeight,
                bottom: insets.bottom + TRIGGER_SIZE + Spacing.xl + Spacing.lg,
              },
              menuContainerStyle,
            ]}
          >
            {Platform.OS === "ios" ? (
              <BlurView
                intensity={80}
                tint={isDark ? "dark" : "light"}
                style={[
                  styles.menuBlur,
                  { borderColor: theme.border },
                ]}
              >
                <View style={styles.menuContent}>
                  <ThemedText type="h4" style={styles.menuTitle}>
                    ZEKE Menu
                  </ThemedText>
                  {isEditMode ? (
                    <Pressable
                      onPress={() => setIsEditMode(false)}
                      style={styles.doneButton}
                    >
                      <ThemedText type="small" style={{ color: Colors.dark.primary }}>
                        Done
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  <View style={styles.grid}>
                    {orderedItems.map((item, index) => (
                      <LauncherIcon
                        key={item.id}
                        item={item}
                        index={index}
                        totalItems={orderedItems.length}
                        animationProgress={animationProgress}
                        isEditMode={isEditMode}
                        wiggleOffset={(index % 3) * 0.5}
                        onPress={() => handleItemPress(item)}
                        onLongPress={handleLongPress}
                        onDragStart={() => setDraggedIndex(index)}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedIndex !== null}
                        draggedIndex={draggedIndex}
                        positions={positions}
                        translateX={translateX}
                        translateY={translateY}
                      />
                    ))}
                  </View>
                </View>
              </BlurView>
            ) : (
              <View
                style={[
                  styles.menuCard,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.menuContent}>
                  <View style={styles.menuHeader}>
                    <ThemedText type="h4" style={styles.menuTitle}>
                      ZEKE Menu
                    </ThemedText>
                    {isEditMode ? (
                      <Pressable
                        onPress={() => setIsEditMode(false)}
                        style={styles.doneButton}
                      >
                        <ThemedText type="small" style={{ color: Colors.dark.primary }}>
                          Done
                        </ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.grid}>
                    {orderedItems.map((item, index) => (
                      <LauncherIcon
                        key={item.id}
                        item={item}
                        index={index}
                        totalItems={orderedItems.length}
                        animationProgress={animationProgress}
                        isEditMode={isEditMode}
                        wiggleOffset={(index % 3) * 0.5}
                        onPress={() => handleItemPress(item)}
                        onLongPress={handleLongPress}
                        onDragStart={() => setDraggedIndex(index)}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedIndex !== null}
                        draggedIndex={draggedIndex}
                        positions={positions}
                        translateX={translateX}
                        translateY={translateY}
                      />
                    ))}
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        </>
      ) : null}

      <TriggerButton
        onPress={handleToggle}
        isOpen={isOpen}
        pulseAnim={pulseAnim}
        glowAnim={glowAnim}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
  },
  triggerContainer: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerGlow: {
    position: "absolute",
    width: TRIGGER_SIZE + 20,
    height: TRIGGER_SIZE + 20,
    borderRadius: BorderRadius.md + 10,
  },
  triggerGlowGradient: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.md + 10,
  },
  trigger: {
    width: TRIGGER_SIZE,
    height: TRIGGER_SIZE,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  triggerGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.md,
  },
  triggerInnerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: BorderRadius.md,
  },
  triggerIconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  scanLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  menuContainer: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 999,
  },
  menuBlur: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  menuTitle: {
    marginBottom: Spacing.md,
  },
  doneButton: {
    position: "absolute",
    right: 0,
    top: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  iconWrapper: {
    width: ICON_CONTAINER_SIZE,
    alignItems: "center",
  },
  iconGlow: {
    position: "absolute",
    top: -4,
    left: -4,
    width: ICON_SIZE + 8,
    height: ICON_SIZE + 8,
    borderRadius: BorderRadius.md + 4,
  },
  iconGlowGradient: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.md + 4,
  },
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  iconGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.md,
  },
  iconInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  iconLabel: {
    marginTop: Spacing.xs,
    textAlign: "center",
    width: "100%",
  },
  deleteButton: {
    position: "absolute",
    top: -6,
    left: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.dark.error,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});

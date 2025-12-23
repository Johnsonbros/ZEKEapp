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
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
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

const ICON_SIZE = 48;
const ICON_CONTAINER_SIZE = 60;
const TRIGGER_SIZE = 56;
const SEMI_CIRCLE_RADIUS = 140;
const INNER_RADIUS = 80;

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
          bottom: insets.bottom + Spacing.md,
          right: Spacing.md,
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

interface SemiCirclePosition {
  x: number;
  y: number;
  angle: number;
}

function calculateSemiCirclePositions(itemCount: number): SemiCirclePosition[] {
  const positions: SemiCirclePosition[] = [];
  const startAngle = Math.PI;
  const endAngle = Math.PI / 2;
  const angleRange = startAngle - endAngle;
  
  const rings = Math.ceil(itemCount / 4);
  let itemIndex = 0;
  
  for (let ring = 0; ring < rings && itemIndex < itemCount; ring++) {
    const ringRadius = INNER_RADIUS + ring * (SEMI_CIRCLE_RADIUS - INNER_RADIUS) / Math.max(1, rings - 1);
    const itemsInRing = Math.min(4, itemCount - itemIndex);
    
    for (let i = 0; i < itemsInRing && itemIndex < itemCount; i++) {
      const angle = startAngle - (i + 0.5) * (angleRange / itemsInRing);
      const x = Math.cos(angle) * ringRadius;
      const y = -Math.sin(angle) * ringRadius;
      positions.push({ x, y, angle });
      itemIndex++;
    }
  }
  
  return positions;
}

interface LauncherIconProps {
  item: LauncherItem;
  index: number;
  totalItems: number;
  animationProgress: SharedValue<number>;
  isEditMode: boolean;
  position: SemiCirclePosition;
  onPress: () => void;
  onLongPress: () => void;
  onDragStart: (index: number) => void;
  onDragUpdate: (index: number, x: number, y: number) => void;
  onDragEnd: (index: number) => void;
  isDragging: boolean;
  isBeingDragged: boolean;
  animatedPosition: { x: number; y: number };
}

function LauncherIcon({
  item,
  index,
  totalItems,
  animationProgress,
  isEditMode,
  position,
  onPress,
  onLongPress,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  isDragging,
  isBeingDragged,
  animatedPosition,
}: LauncherIconProps) {
  const { theme } = useTheme();
  const wiggleAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (isEditMode && !isBeingDragged) {
      wiggleAnim.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: 80, easing: Easing.linear }),
          withTiming(2, { duration: 80, easing: Easing.linear }),
          withTiming(-2, { duration: 80, easing: Easing.linear }),
          withTiming(0, { duration: 80, easing: Easing.linear }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(wiggleAnim);
      wiggleAnim.value = withTiming(0, { duration: 100 });
    }
  }, [isEditMode, isBeingDragged, wiggleAnim]);

  const baseX = position.x;
  const baseY = position.y;

  const iconAnimatedStyle = useAnimatedStyle(() => {
    const delay = index * 0.05;
    const adjustedProgress = Math.max(
      0,
      Math.min(1, (animationProgress.value - delay) / (1 - delay * totalItems * 0.3)),
    );

    const explosionX = baseX * 1.5;
    const explosionY = baseY * 1.5;

    const currentX = interpolate(
      adjustedProgress,
      [0, 0.3, 1],
      [0, explosionX * 0.3, baseX],
      Extrapolation.CLAMP,
    );

    const currentY = interpolate(
      adjustedProgress,
      [0, 0.3, 1],
      [0, explosionY * 0.3, baseY],
      Extrapolation.CLAMP,
    );

    const scale = interpolate(
      adjustedProgress,
      [0, 0.2, 0.6, 1],
      [0.2, 1.15, 0.95, 1],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      adjustedProgress,
      [0, 0.2],
      [0, 1],
      Extrapolation.CLAMP,
    );

    const wiggle = isEditMode ? wiggleAnim.value : 0;
    const dragScale = isBeingDragged ? 1.15 : (isDragging ? 0.95 : 1);

    const finalX = isBeingDragged 
      ? baseX + translateX.value 
      : currentX;
    const finalY = isBeingDragged 
      ? baseY + translateY.value 
      : currentY;

    return {
      opacity,
      transform: [
        { translateX: finalX },
        { translateY: finalY },
        { scale: scale * scaleAnim.value * dragScale },
        { rotate: `${wiggle}deg` },
      ],
      zIndex: isBeingDragged ? 100 : 1,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const glowOpacity = isBeingDragged ? 0.8 : 0.4;
    const glowScale = isBeingDragged ? 1.3 : 1;
    return {
      opacity: glowOpacity,
      transform: [{ scale: glowScale }],
    };
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
      runOnJS(onLongPress)();
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(400)
    .onEnd(() => {
      if (!isEditMode) {
        runOnJS(onPress)();
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(isEditMode)
    .onStart(() => {
      runOnJS(onDragStart)(index);
      scaleAnim.value = withSpring(1.15, { damping: 15, stiffness: 200 });
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      const currentDragX = baseX + event.translationX;
      const currentDragY = baseY + event.translationY;
      runOnJS(onDragUpdate)(index, currentDragX, currentDragY);
    })
    .onEnd(() => {
      scaleAnim.value = withSpring(1, { damping: 15, stiffness: 200 });
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      runOnJS(onDragEnd)(index);
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
            <Feather name={item.icon} size={20} color="#FFFFFF" />
          </LinearGradient>
        </View>
        
        <ThemedText type="caption" style={styles.iconLabel} numberOfLines={1}>
          {item.label}
        </ThemedText>

        {isEditMode ? (
          <View style={styles.deleteButton}>
            <Feather name="minus" size={10} color="#FFFFFF" />
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
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [previewOrder, setPreviewOrder] = useState<LauncherItem[]>([]);

  const animationProgress = useSharedValue(0);
  const pulseAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

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

  const positions = useMemo(() => {
    const displayItems = previewOrder.length > 0 ? previewOrder : orderedItems;
    return calculateSemiCirclePositions(displayItems.length);
  }, [orderedItems, previewOrder]);

  const findClosestPosition = useCallback((x: number, y: number): number => {
    let closest = 0;
    let minDist = Infinity;
    
    positions.forEach((pos, idx) => {
      const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (dist < minDist) {
        minDist = dist;
        closest = idx;
      }
    });
    
    return closest;
  }, [positions]);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
    setPreviewOrder([...orderedItems]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [orderedItems]);

  const handleDragUpdate = useCallback((fromIndex: number, x: number, y: number) => {
    setDragPosition({ x, y });
    
    const targetIndex = findClosestPosition(x, y);
    
    if (targetIndex !== fromIndex && previewOrder.length > 0) {
      const newOrder = [...orderedItems];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(targetIndex, 0, removed);
      
      if (JSON.stringify(newOrder.map(i => i.id)) !== JSON.stringify(previewOrder.map(i => i.id))) {
        setPreviewOrder(newOrder);
        Haptics.selectionAsync();
      }
    }
  }, [orderedItems, previewOrder, findClosestPosition]);

  const handleDragEnd = useCallback((fromIndex: number) => {
    if (previewOrder.length > 0) {
      setOrderedItems(previewOrder);
      saveOrder(previewOrder);
    }
    setDraggedIndex(null);
    setPreviewOrder([]);
    setDragPosition({ x: 0, y: 0 });
  }, [previewOrder]);

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

  const displayItems = previewOrder.length > 0 ? previewOrder : orderedItems;
  const menuSize = SEMI_CIRCLE_RADIUS * 2 + ICON_CONTAINER_SIZE + 40;

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
                width: menuSize,
                height: menuSize,
                bottom: insets.bottom + Spacing.md + TRIGGER_SIZE / 2 - menuSize / 2,
                right: Spacing.md + TRIGGER_SIZE / 2 - menuSize / 2,
              },
              menuContainerStyle,
            ]}
          >
            {Platform.OS === "ios" ? (
              <BlurView
                intensity={60}
                tint={isDark ? "dark" : "light"}
                style={[
                  styles.semiCircleContainer,
                  { borderColor: theme.border },
                ]}
              >
                <View style={styles.iconAnchor}>
                  {isEditMode ? (
                    <Pressable
                      onPress={() => setIsEditMode(false)}
                      style={styles.doneButtonFloat}
                    >
                      <ThemedText type="small" style={{ color: Colors.dark.primary }}>
                        Done
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  {displayItems.map((item, index) => {
                    const originalIndex = orderedItems.findIndex(i => i.id === item.id);
                    const isBeingDragged = draggedIndex === originalIndex;
                    
                    return (
                      <LauncherIcon
                        key={item.id}
                        item={item}
                        index={index}
                        totalItems={displayItems.length}
                        animationProgress={animationProgress}
                        isEditMode={isEditMode}
                        position={positions[index] || { x: 0, y: 0, angle: 0 }}
                        onPress={() => handleItemPress(item)}
                        onLongPress={handleLongPress}
                        onDragStart={handleDragStart}
                        onDragUpdate={handleDragUpdate}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedIndex !== null}
                        isBeingDragged={isBeingDragged}
                        animatedPosition={isBeingDragged ? dragPosition : positions[index] || { x: 0, y: 0 }}
                      />
                    );
                  })}
                </View>
              </BlurView>
            ) : (
              <View
                style={[
                  styles.semiCircleContainerAndroid,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.iconAnchor}>
                  {isEditMode ? (
                    <Pressable
                      onPress={() => setIsEditMode(false)}
                      style={styles.doneButtonFloat}
                    >
                      <ThemedText type="small" style={{ color: Colors.dark.primary }}>
                        Done
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  {displayItems.map((item, index) => {
                    const originalIndex = orderedItems.findIndex(i => i.id === item.id);
                    const isBeingDragged = draggedIndex === originalIndex;
                    
                    return (
                      <LauncherIcon
                        key={item.id}
                        item={item}
                        index={index}
                        totalItems={displayItems.length}
                        animationProgress={animationProgress}
                        isEditMode={isEditMode}
                        position={positions[index] || { x: 0, y: 0, angle: 0 }}
                        onPress={() => handleItemPress(item)}
                        onLongPress={handleLongPress}
                        onDragStart={handleDragStart}
                        onDragUpdate={handleDragUpdate}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedIndex !== null}
                        isBeingDragged={isBeingDragged}
                        animatedPosition={isBeingDragged ? dragPosition : positions[index] || { x: 0, y: 0 }}
                      />
                    );
                  })}
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
    zIndex: 999,
  },
  semiCircleContainer: {
    flex: 1,
    borderRadius: SEMI_CIRCLE_RADIUS + 50,
    borderWidth: 1,
    overflow: "hidden",
  },
  semiCircleContainerAndroid: {
    flex: 1,
    borderRadius: SEMI_CIRCLE_RADIUS + 50,
    borderWidth: 1,
    overflow: "hidden",
  },
  iconAnchor: {
    position: "absolute",
    right: SEMI_CIRCLE_RADIUS + ICON_CONTAINER_SIZE / 2 + 20,
    bottom: SEMI_CIRCLE_RADIUS + ICON_CONTAINER_SIZE / 2 + 20,
    width: 0,
    height: 0,
  },
  iconWrapper: {
    position: "absolute",
    width: ICON_CONTAINER_SIZE,
    height: ICON_CONTAINER_SIZE + 16,
    alignItems: "center",
    marginLeft: -ICON_CONTAINER_SIZE / 2,
    marginTop: -ICON_CONTAINER_SIZE / 2,
  },
  iconGlow: {
    position: "absolute",
    top: -4,
    left: (ICON_CONTAINER_SIZE - ICON_SIZE) / 2 - 4,
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
    fontSize: 10,
    width: ICON_CONTAINER_SIZE,
  },
  deleteButton: {
    position: "absolute",
    top: -4,
    left: (ICON_CONTAINER_SIZE - ICON_SIZE) / 2 - 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.dark.error,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  doneButtonFloat: {
    position: "absolute",
    left: -SEMI_CIRCLE_RADIUS - 60,
    top: -SEMI_CIRCLE_RADIUS - 40,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.4)",
  },
});

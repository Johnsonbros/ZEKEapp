import React from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

export interface Memory {
  id: string;
  title: string;
  transcript: string;
  timestamp: string;
  deviceType: "omi" | "limitless";
  speakers?: (string | { id: number; label: string; isUser: boolean })[];
  isStarred?: boolean;
  duration?: string;
}

interface MemoryCardProps {
  memory: Memory;
  onPress?: () => void;
  onStar?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  highlightText?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MemoryCard({ memory, onPress, onStar, onDelete, onShare, highlightText }: MemoryCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handleMorePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Memory Options",
      undefined,
      [
        {
          text: "Share",
          onPress: onShare,
        },
        {
          text: "Delete",
          onPress: onDelete,
          style: "destructive",
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const getHighlightedText = (text: string) => {
    if (!highlightText) return text;
    const parts = text.split(new RegExp(`(${highlightText})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === highlightText.toLowerCase() ? (
        <ThemedText key={i} style={{ color: Colors.dark.accent }}>
          {part}
        </ThemedText>
      ) : (
        part
      )
    );
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.deviceBadge,
              {
                backgroundColor:
                  memory.deviceType === "omi"
                    ? Colors.dark.primary + "20"
                    : Colors.dark.secondary + "20",
              },
            ]}
          >
            <Feather
              name={memory.deviceType === "omi" ? "headphones" : "disc"}
              size={12}
              color={memory.deviceType === "omi" ? Colors.dark.primary : Colors.dark.secondary}
            />
          </View>
          <ThemedText type="caption" secondary>
            {memory.timestamp}
          </ThemedText>
          {memory.duration ? (
            <ThemedText type="caption" secondary>
              {memory.duration}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={onStar}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Feather
              name={memory.isStarred ? "star" : "star"}
              size={18}
              color={memory.isStarred ? Colors.dark.warning : theme.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={handleMorePress}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Feather
              name="more-horizontal"
              size={18}
              color={theme.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      <ThemedText type="h4" numberOfLines={1} style={styles.title}>
        {highlightText ? getHighlightedText(memory.title) : memory.title}
      </ThemedText>

      <ThemedText type="small" secondary numberOfLines={2} style={styles.transcript}>
        {highlightText ? getHighlightedText(memory.transcript) : memory.transcript}
      </ThemedText>

      {memory.speakers && memory.speakers.length > 0 ? (
        <View style={styles.speakers}>
          {memory.speakers.slice(0, 3).map((speaker, index) => {
            const speakerLabel = typeof speaker === 'string' 
              ? speaker 
              : (speaker as { label?: string })?.label || `Speaker ${index + 1}`;
            return (
              <View
                key={index}
                style={[styles.speakerBadge, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText type="caption" secondary>
                  {speakerLabel}
                </ThemedText>
              </View>
            );
          })}
          {memory.speakers.length > 3 ? (
            <ThemedText type="caption" secondary>
              +{memory.speakers.length - 3}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  deviceBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  transcript: {
    marginBottom: Spacing.md,
  },
  speakers: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  speakerBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
});

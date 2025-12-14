import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { GradientText } from "@/components/GradientText";
import { DeviceCard, DeviceInfo } from "@/components/DeviceCard";
import { MemoryCard, Memory } from "@/components/MemoryCard";
import { PulsingDot } from "@/components/PulsingDot";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import { mockDevices, mockMemories } from "@/lib/mockData";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [devices, setDevices] = useState<DeviceInfo[]>(mockDevices);
  const [memories, setMemories] = useState<Memory[]>(mockMemories.slice(0, 3));
  const [refreshing, setRefreshing] = useState(false);
  const [isLiveTranscribing, setIsLiveTranscribing] = useState(true);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setRefreshing(false);
  }, []);

  const handleDevicePress = (device: DeviceInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleMemoryPress = (memory: Memory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleStarMemory = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isStarred: !m.isStarred } : m))
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.sectionHeader}>
        <ThemedText type="h3">Devices</ThemedText>
        <View style={styles.deviceCount}>
          <ThemedText type="small" secondary>
            {devices.filter((d) => d.isConnected).length}/{devices.length} connected
          </ThemedText>
        </View>
      </View>

      {devices.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          onPress={() => handleDevicePress(device)}
        />
      ))}

      {isLiveTranscribing ? (
        <View style={[styles.liveCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <View style={styles.liveHeader}>
            <PulsingDot color={Colors.dark.accent} size={10} />
            <ThemedText type="small" style={{ marginLeft: Spacing.sm, color: Colors.dark.accent }}>
              Live Transcription
            </ThemedText>
          </View>
          <ThemedText type="body" secondary numberOfLines={2}>
            "...and that's why we need to prioritize the user experience in the next sprint..."
          </ThemedText>
        </View>
      ) : null}

      <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
        <ThemedText type="h3">Recent Memories</ThemedText>
        <Pressable
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <ThemedText type="small" style={{ color: Colors.dark.primary }}>
            See All
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderMemory = ({ item }: { item: Memory }) => (
    <MemoryCard
      memory={item}
      onPress={() => handleMemoryPress(item)}
      onStar={() => handleStarMemory(item.id)}
    />
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl + 40,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={memories}
      renderItem={renderMemory}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.dark.primary}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  headerSection: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  deviceCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  liveHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
});

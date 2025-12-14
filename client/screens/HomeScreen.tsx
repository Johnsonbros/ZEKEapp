import React, { useCallback } from "react";
import { View, FlatList, StyleSheet, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { GradientText } from "@/components/GradientText";
import { DeviceCard, DeviceInfo } from "@/components/DeviceCard";
import { MemoryCard, Memory } from "@/components/MemoryCard";
import { PulsingDot } from "@/components/PulsingDot";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import { queryClient, apiRequest, getApiUrl } from "@/lib/query-client";

interface ApiDevice {
  id: string;
  userId: string | null;
  name: string;
  type: string;
  macAddress: string | null;
  batteryLevel: number | null;
  isConnected: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

interface ApiMemory {
  id: string;
  deviceId: string;
  title: string;
  summary: string | null;
  transcript: string;
  speakers: string[] | null;
  actionItems: string[] | null;
  duration: number;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapApiDeviceToDeviceInfo(device: ApiDevice): DeviceInfo {
  const getRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  const deviceType: "omi" | "limitless" = 
    (device.type === "omi" || device.type === "limitless") ? device.type : "omi";

  return {
    id: device.id,
    name: device.name,
    type: deviceType,
    isConnected: device.isConnected,
    batteryLevel: device.batteryLevel ?? 0,
    lastSync: getRelativeTime(device.lastSyncAt),
    isRecording: device.isConnected,
  };
}

function mapApiMemoryToMemory(memory: ApiMemory, deviceType: "omi" | "limitless"): Memory {
  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + `, ${timeStr}`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return {
    id: memory.id,
    title: memory.title,
    transcript: memory.transcript,
    timestamp: formatTimestamp(memory.createdAt),
    deviceType,
    speakers: memory.speakers ?? undefined,
    isStarred: memory.isStarred,
    duration: formatDuration(memory.duration),
  };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const { data: devicesData, isLoading: isLoadingDevices, isError: isDevicesError } = useQuery<ApiDevice[]>({
    queryKey: ['/api/devices'],
  });

  const { data: memoriesData, isLoading: isLoadingMemories, isError: isMemoriesError } = useQuery<ApiMemory[]>({
    queryKey: ['/api/memories', 'limit=3'],
    queryFn: async () => {
      const url = new URL('/api/memories?limit=3', getApiUrl());
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch memories');
      return res.json();
    },
  });

  const starMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      const res = await apiRequest('POST', `/api/memories/${memoryId}/star`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memories'], exact: false });
    },
  });

  const devices: DeviceInfo[] = (devicesData ?? []).map(mapApiDeviceToDeviceInfo);
  
  const deviceTypeMap = new Map<string, "omi" | "limitless">();
  (devicesData ?? []).forEach(d => {
    const deviceType = (d.type === 'omi' || d.type === 'limitless') ? d.type : 'omi';
    deviceTypeMap.set(d.id, deviceType);
  });
  
  const memories: Memory[] = (memoriesData ?? []).map(m => 
    mapApiMemoryToMemory(m, deviceTypeMap.get(m.deviceId) ?? "omi")
  );

  const isLiveTranscribing = devices.some(d => d.isConnected && d.isRecording);
  const isRefreshing = isLoadingDevices || isLoadingMemories;

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/memories'] }),
    ]);
  }, []);

  const handleDevicePress = (device: DeviceInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleMemoryPress = (memory: Memory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleStarMemory = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    starMutation.mutate(id);
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

      {isLoadingDevices ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.dark.primary} />
        </View>
      ) : isDevicesError ? (
        <ThemedText type="body" secondary>Failed to load devices</ThemedText>
      ) : devices.length === 0 ? (
        <ThemedText type="body" secondary>No devices connected</ThemedText>
      ) : (
        devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onPress={() => handleDevicePress(device)}
          />
        ))
      )}

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

  const renderEmpty = () => {
    if (isLoadingMemories) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.dark.primary} />
        </View>
      );
    }
    if (isMemoriesError) {
      return <ThemedText type="body" secondary>Failed to load memories</ThemedText>;
    }
    return (
      <EmptyState
        icon="inbox"
        title="No memories yet"
        description="Your conversations will appear here once your devices start recording."
      />
    );
  };

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
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
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
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
});

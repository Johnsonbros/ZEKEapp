import React, { useCallback } from "react";
import { View, FlatList, StyleSheet, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "@/navigation/HomeStackNavigator";

import { ThemedText } from "@/components/ThemedText";
import { GradientText } from "@/components/GradientText";
import { DeviceCard, DeviceInfo } from "@/components/DeviceCard";
import { MemoryCard, Memory } from "@/components/MemoryCard";
import { PulsingDot } from "@/components/PulsingDot";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Gradients } from "@/constants/theme";
import { queryClient, apiRequest, getApiUrl, isZekeSyncMode } from "@/lib/query-client";
import { 
  getRecentMemories, 
  getHealthStatus, 
  getDashboardSummary,
  getTodayEvents,
  getPendingTasks,
  getGroceryItems,
  type ZekeEvent,
  type ZekeTask,
  type ZekeGroceryItem,
  type DashboardSummary,
} from "@/lib/zeke-api-adapter";

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

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatEventTime(startTime: string, endTime?: string): string {
  const start = new Date(startTime);
  const timeStr = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (endTime) {
    const end = new Date(endTime);
    const endTimeStr = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${timeStr} - ${endTimeStr}`;
  }
  return timeStr;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const isSyncMode = isZekeSyncMode();

  const handleUploadPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('AudioUpload');
  };

  const { data: connectionStatus } = useQuery({
    queryKey: ['zeke-connection-status'],
    queryFn: getHealthStatus,
    enabled: isSyncMode,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: dashboardSummary } = useQuery<DashboardSummary>({
    queryKey: ['zeke-dashboard-summary'],
    queryFn: getDashboardSummary,
    enabled: isSyncMode,
    staleTime: 60000,
  });

  const { data: todayEvents = [] } = useQuery<ZekeEvent[]>({
    queryKey: ['zeke-today-events'],
    queryFn: getTodayEvents,
    enabled: isSyncMode,
    staleTime: 60000,
  });

  const { data: pendingTasks = [] } = useQuery<ZekeTask[]>({
    queryKey: ['zeke-pending-tasks'],
    queryFn: getPendingTasks,
    enabled: isSyncMode,
    staleTime: 60000,
  });

  const { data: groceryItems = [] } = useQuery<ZekeGroceryItem[]>({
    queryKey: ['zeke-grocery-items'],
    queryFn: getGroceryItems,
    enabled: isSyncMode,
    staleTime: 60000,
  });

  const { data: devicesData, isLoading: isLoadingDevices, isError: isDevicesError } = useQuery<ApiDevice[]>({
    queryKey: ['/api/devices'],
    enabled: !isSyncMode,
  });

  const { data: memoriesData, isLoading: isLoadingMemories, isError: isMemoriesError } = useQuery<ApiMemory[]>({
    queryKey: isSyncMode ? ['zeke-memories', 'recent'] : ['/api/memories', 'limit=3'],
    queryFn: async () => {
      if (isSyncMode) {
        const memories = await getRecentMemories(3);
        return memories.map(m => ({
          id: m.id,
          deviceId: m.deviceId || 'zeke-main',
          title: m.title,
          summary: m.summary || null,
          transcript: m.transcript,
          speakers: m.speakers || null,
          actionItems: m.actionItems || null,
          duration: m.duration,
          isStarred: m.isStarred,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        }));
      } else {
        const url = new URL('/api/memories?limit=3', getApiUrl());
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch memories');
        return res.json();
      }
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
    if (isSyncMode) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['zeke-connection-status'] }),
        queryClient.invalidateQueries({ queryKey: ['zeke-memories'] }),
        queryClient.invalidateQueries({ queryKey: ['zeke-dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['zeke-today-events'] }),
        queryClient.invalidateQueries({ queryKey: ['zeke-pending-tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['zeke-grocery-items'] }),
      ]);
    } else {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/devices'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/memories'] }),
      ]);
    }
  }, [isSyncMode]);

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

  const unpurchasedGroceryItems = groceryItems.filter(item => !item.isPurchased);

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {isSyncMode ? (
        <>
          <View style={styles.greetingSection}>
            <GradientText type="h2" colors={Gradients.primary}>
              {getGreeting()}{dashboardSummary?.userName ? `, ${dashboardSummary.userName}` : ''}
            </GradientText>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                <Feather name="calendar" size={20} color={Colors.dark.primary} />
              </View>
              <ThemedText type="h3">{dashboardSummary?.eventsCount ?? todayEvents.length}</ThemedText>
              <ThemedText type="caption" secondary>Events Today</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
                <Feather name="check-square" size={20} color={Colors.dark.accent} />
              </View>
              <ThemedText type="h3">{dashboardSummary?.pendingTasksCount ?? pendingTasks.length}</ThemedText>
              <ThemedText type="caption" secondary>Pending Tasks</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Feather name="shopping-cart" size={20} color={Colors.dark.success} />
              </View>
              <ThemedText type="h3">{dashboardSummary?.groceryItemsCount ?? unpurchasedGroceryItems.length}</ThemedText>
              <ThemedText type="caption" secondary>Grocery Items</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                <Feather name="message-circle" size={20} color={Colors.dark.secondary} />
              </View>
              <ThemedText type="h3">{dashboardSummary?.memoriesCount ?? memories.length}</ThemedText>
              <ThemedText type="caption" secondary>Memories</ThemedText>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText type="h3">Today's Schedule</ThemedText>
          </View>
          {todayEvents.length > 0 ? (
            <View style={[styles.dashboardCard, { backgroundColor: theme.backgroundDefault }]}>
              {todayEvents.slice(0, 3).map((event, index) => (
                <View 
                  key={event.id} 
                  style={[
                    styles.eventItem, 
                    index < Math.min(todayEvents.length, 3) - 1 ? styles.eventItemBorder : null,
                    { borderBottomColor: theme.border }
                  ]}
                >
                  <View style={styles.eventTimeContainer}>
                    <Feather name="clock" size={14} color={Colors.dark.primary} />
                    <ThemedText type="small" style={{ marginLeft: Spacing.xs, color: Colors.dark.primary }}>
                      {formatEventTime(event.startTime, event.endTime)}
                    </ThemedText>
                  </View>
                  <ThemedText type="body" style={{ marginTop: Spacing.xs }} numberOfLines={1}>
                    {event.title}
                  </ThemedText>
                  {event.location ? (
                    <View style={styles.eventLocationContainer}>
                      <Feather name="map-pin" size={12} color={theme.textSecondary} />
                      <ThemedText type="caption" secondary style={{ marginLeft: Spacing.xs }}>
                        {event.location}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              ))}
              {todayEvents.length > 3 ? (
                <ThemedText type="small" style={{ color: Colors.dark.primary, marginTop: Spacing.sm }}>
                  +{todayEvents.length - 3} more events
                </ThemedText>
              ) : null}
            </View>
          ) : (
            <View style={[styles.dashboardCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.emptyCardContent}>
                <Feather name="calendar" size={24} color={theme.textSecondary} />
                <ThemedText type="body" secondary style={{ marginTop: Spacing.sm }}>
                  No events today
                </ThemedText>
              </View>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <ThemedText type="h3">Tasks</ThemedText>
          </View>
          {pendingTasks.length > 0 ? (
            <View style={[styles.dashboardCard, { backgroundColor: theme.backgroundDefault }]}>
              {pendingTasks.slice(0, 4).map((task, index) => (
                <View 
                  key={task.id} 
                  style={[
                    styles.taskItem,
                    index < Math.min(pendingTasks.length, 4) - 1 ? styles.taskItemBorder : null,
                    { borderBottomColor: theme.border }
                  ]}
                >
                  <View style={styles.taskCheckbox}>
                    <Feather name="circle" size={18} color={theme.textSecondary} />
                  </View>
                  <View style={styles.taskContent}>
                    <ThemedText type="body" numberOfLines={1}>{task.title}</ThemedText>
                    {task.dueDate ? (
                      <ThemedText type="caption" secondary>
                        Due {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </ThemedText>
                    ) : null}
                  </View>
                  {task.priority === 'high' ? (
                    <Feather name="alert-circle" size={16} color={Colors.dark.error} />
                  ) : null}
                </View>
              ))}
              {pendingTasks.length > 4 ? (
                <ThemedText type="small" style={{ color: Colors.dark.primary, marginTop: Spacing.sm }}>
                  +{pendingTasks.length - 4} more tasks
                </ThemedText>
              ) : null}
            </View>
          ) : (
            <View style={[styles.dashboardCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.emptyCardContent}>
                <Feather name="check-circle" size={24} color={Colors.dark.success} />
                <ThemedText type="body" secondary style={{ marginTop: Spacing.sm }}>
                  All caught up!
                </ThemedText>
              </View>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <ThemedText type="h3">Grocery List</ThemedText>
          </View>
          {unpurchasedGroceryItems.length > 0 ? (
            <View style={[styles.dashboardCard, { backgroundColor: theme.backgroundDefault }]}>
              {unpurchasedGroceryItems.slice(0, 5).map((item, index) => (
                <View 
                  key={item.id} 
                  style={[
                    styles.groceryItem,
                    index < Math.min(unpurchasedGroceryItems.length, 5) - 1 ? styles.groceryItemBorder : null,
                    { borderBottomColor: theme.border }
                  ]}
                >
                  <View style={styles.groceryBullet} />
                  <ThemedText type="body" style={{ flex: 1 }} numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  {item.quantity ? (
                    <ThemedText type="small" secondary>
                      {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                    </ThemedText>
                  ) : null}
                </View>
              ))}
              {unpurchasedGroceryItems.length > 5 ? (
                <ThemedText type="small" style={{ color: Colors.dark.primary, marginTop: Spacing.sm }}>
                  +{unpurchasedGroceryItems.length - 5} more items
                </ThemedText>
              ) : null}
            </View>
          ) : (
            <View style={[styles.dashboardCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.emptyCardContent}>
                <Feather name="shopping-bag" size={24} color={theme.textSecondary} />
                <ThemedText type="body" secondary style={{ marginTop: Spacing.sm }}>
                  No grocery items
                </ThemedText>
              </View>
            </View>
          )}
        </>
      ) : (
        <>
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
        </>
      )}

      <Pressable
        onPress={handleUploadPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: Spacing.xl })}
      >
        <LinearGradient
          colors={Gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.uploadCard}
        >
          <View style={styles.uploadIconContainer}>
            <Feather name="upload-cloud" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.uploadContent}>
            <ThemedText type="body" style={styles.uploadTitle}>
              Upload Audio
            </ThemedText>
            <ThemedText type="small" style={styles.uploadSubtitle}>
              Transcribe audio files and save as memories
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={24} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>

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
  greetingSection: {
    marginBottom: Spacing.lg,
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.xs,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: "48%",
    marginHorizontal: "1%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    alignItems: "center",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  dashboardCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  emptyCardContent: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  eventItem: {
    paddingVertical: Spacing.sm,
  },
  eventItemBorder: {
    borderBottomWidth: 1,
  },
  eventTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventLocationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  taskItemBorder: {
    borderBottomWidth: 1,
  },
  taskCheckbox: {
    marginRight: Spacing.md,
  },
  taskContent: {
    flex: 1,
  },
  groceryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  groceryItemBorder: {
    borderBottomWidth: 1,
  },
  groceryBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.primary,
    marginRight: Spacing.md,
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
  uploadCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  uploadIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  uploadContent: {
    flex: 1,
  },
  uploadTitle: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  uploadSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
});

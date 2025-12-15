import React, { useCallback } from "react";
import { View, ScrollView, StyleSheet, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "@/navigation/HomeStackNavigator";

import { ThemedText } from "@/components/ThemedText";
import { GradientText } from "@/components/GradientText";
import { DeviceCard, DeviceInfo } from "@/components/DeviceCard";
import { PulsingDot } from "@/components/PulsingDot";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Gradients } from "@/constants/theme";
import { queryClient, getApiUrl, isZekeSyncMode } from "@/lib/query-client";
import { 
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

  const { data: devicesData, isLoading: isLoadingDevices } = useQuery<ApiDevice[]>({
    queryKey: ['/api/devices'],
    enabled: !isSyncMode,
  });

  const devices: DeviceInfo[] = (devicesData ?? []).map(mapApiDeviceToDeviceInfo);
  const isLiveTranscribing = devices.some(d => d.isConnected && d.isRecording);
  const isRefreshing = isLoadingDevices;

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSyncMode) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['zeke-connection-status'] }),
        queryClient.invalidateQueries({ queryKey: ['zeke-dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['zeke-today-events'] }),
        queryClient.invalidateQueries({ queryKey: ['zeke-pending-tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['zeke-grocery-items'] }),
      ]);
    } else {
      await queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    }
  }, [isSyncMode]);

  const handleDevicePress = (device: DeviceInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const unpurchasedGroceryItems = groceryItems.filter(item => !item.isPurchased);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl + 40,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={Colors.dark.primary}
        />
      }
    >
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
                <ThemedText type="h3">{todayEvents.length}</ThemedText>
                <ThemedText type="caption" secondary>Events</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                  <Feather name="check-square" size={20} color={Colors.dark.accent} />
                </View>
                <ThemedText type="h3">{pendingTasks.length}</ThemedText>
                <ThemedText type="caption" secondary>Tasks</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
                  <Feather name="shopping-cart" size={20} color="#EC4899" />
                </View>
                <ThemedText type="h3">{unpurchasedGroceryItems.length}</ThemedText>
                <ThemedText type="caption" secondary>Groceries</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                  <Feather name="wifi" size={20} color="#22C55E" />
                </View>
                <ThemedText type="h3">{connectionStatus?.status === 'ok' ? 'Online' : 'Offline'}</ThemedText>
                <ThemedText type="caption" secondary>Status</ThemedText>
              </View>
            </View>

            {todayEvents.length > 0 && (
              <View style={[styles.dashboardCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="h4">Today's Schedule</ThemedText>
                </View>
                {todayEvents.slice(0, 3).map((event, index) => (
                  <View key={event.id || index} style={styles.eventItem}>
                    <View style={[styles.eventDot, { backgroundColor: Colors.dark.primary }]} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="body" numberOfLines={1}>{event.title}</ThemedText>
                      <ThemedText type="caption" secondary>
                        {formatEventTime(event.startTime, event.endTime)}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {pendingTasks.length > 0 && (
              <View style={[styles.dashboardCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="h4">Pending Tasks</ThemedText>
                </View>
                {pendingTasks.slice(0, 3).map((task, index) => (
                  <View key={task.id || index} style={styles.taskItem}>
                    <View style={[
                      styles.priorityIndicator,
                      { backgroundColor: task.priority === 'high' ? Colors.dark.error : 
                        task.priority === 'medium' ? Colors.dark.warning : Colors.dark.success }
                    ]} />
                    <ThemedText type="body" numberOfLines={1} style={{ flex: 1 }}>
                      {task.title}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.greetingSection}>
              <GradientText type="h2" colors={Gradients.primary}>
                {getGreeting()}
              </GradientText>
              <ThemedText type="body" secondary style={{ marginTop: Spacing.xs }}>
                Your AI companion is ready
              </ThemedText>
            </View>

            <View style={styles.sectionHeader}>
              <ThemedText type="h3">Connected Devices</ThemedText>
              {devices.length > 0 && (
                <View style={styles.deviceCount}>
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: `${Colors.dark.primary}20` },
                    ]}
                  >
                    <ThemedText type="small" style={{ color: Colors.dark.primary }}>
                      {devices.length}
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>

            {isLoadingDevices ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.dark.primary} />
              </View>
            ) : devices.length > 0 ? (
              devices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onPress={() => handleDevicePress(device)}
                />
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={styles.emptyCardContent}>
                  <Feather name="bluetooth" size={32} color={theme.textSecondary} />
                  <ThemedText type="body" secondary style={{ marginTop: Spacing.md, textAlign: "center" }}>
                    No devices connected
                  </ThemedText>
                  <ThemedText type="small" secondary style={{ textAlign: "center", marginTop: Spacing.xs }}>
                    Connect your Omi or Limitless device to start capturing
                  </ThemedText>
                </View>
              </View>
            )}

            {isLiveTranscribing ? (
              <View
                style={[
                  styles.liveTranscriptionCard,
                  { backgroundColor: `${Colors.dark.accent}15` },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
                  <PulsingDot color={Colors.dark.accent} />
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
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginTop: Spacing.lg })}
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
                Transcribe audio files and save to ZEKE
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={24} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
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
  emptyCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  emptyCardContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  liveTranscriptionCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  uploadCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  uploadIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  uploadTitle: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  uploadSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
    marginTop: 6,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  priorityIndicator: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: "center",
  },
});

import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, RefreshControl, Pressable, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useQuery, useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { MemoryCard, Memory } from "@/components/MemoryCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import { queryClient, apiRequest, getApiUrl } from "@/lib/query-client";

type FilterType = "all" | "omi" | "limitless" | "starred";

interface ApiDevice {
  id: string;
  name: string;
  type: string;
  isConnected: boolean;
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

function formatTimestamp(dateStr: string) {
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
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  return `${mins} min`;
}

function mapApiMemoryToMemory(memory: ApiMemory, deviceType: "omi" | "limitless"): Memory {
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

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [filter, setFilter] = useState<FilterType>("all");

  const { data: devicesData } = useQuery<ApiDevice[]>({
    queryKey: ['/api/devices'],
  });

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (filter === "starred") {
      params.set("isStarred", "true");
    }
    return params.toString();
  };

  const queryString = buildQueryParams();
  const memoriesQueryKey = queryString 
    ? ['/api/memories', queryString]
    : ['/api/memories'];

  const { data: memoriesData, isLoading, isError, isFetching } = useQuery<ApiMemory[]>({
    queryKey: memoriesQueryKey,
    queryFn: async () => {
      const url = new URL(`/api/memories${queryString ? `?${queryString}` : ''}`, getApiUrl());
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

  const deleteMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      await apiRequest('DELETE', `/api/memories/${memoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memories'], exact: false });
    },
  });

  const deviceTypeMap = new Map<string, "omi" | "limitless">();
  (devicesData ?? []).forEach(d => {
    const deviceType = (d.type === 'omi' || d.type === 'limitless') ? d.type : 'omi';
    deviceTypeMap.set(d.id, deviceType);
  });

  const allMemories: Memory[] = (memoriesData ?? []).map(m => 
    mapApiMemoryToMemory(m, deviceTypeMap.get(m.deviceId) ?? "omi")
  );

  const filteredMemories = allMemories.filter((m) => {
    if (filter === "all") return true;
    if (filter === "starred") return m.isStarred;
    return m.deviceType === filter;
  });

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await queryClient.invalidateQueries({ queryKey: ['/api/memories'], exact: false });
  }, []);

  const handleMemoryPress = (memory: Memory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleStarMemory = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    starMutation.mutate(id);
  };

  const handleDeleteMemory = (memory: Memory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Delete Memory",
      `Are you sure you want to delete "${memory.title}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(memory.id);
          },
        },
      ]
    );
  };

  const handleShareMemory = async (memory: Memory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        "Sharing Unavailable",
        "Sharing is only available on mobile devices. Please run the app in Expo Go to use this feature."
      );
      return;
    }

    try {
      const shareContent = `${memory.title}\n\n${memory.transcript}`;
      const fileUri = FileSystem.cacheDirectory + `memory-${memory.id}.txt`;
      await FileSystem.writeAsStringAsync(fileUri, shareContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/plain",
        dialogTitle: "Share Memory",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share memory. Please try again.");
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "omi", label: "Omi" },
    { key: "limitless", label: "Limitless" },
    { key: "starred", label: "Starred" },
  ];

  const renderHeader = () => (
    <View style={styles.filtersContainer}>
      {filters.map((f) => (
        <Pressable
          key={f.key}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilter(f.key);
          }}
          style={[
            styles.filterChip,
            {
              backgroundColor:
                filter === f.key ? Colors.dark.primary : theme.backgroundDefault,
              borderColor: filter === f.key ? Colors.dark.primary : theme.border,
            },
          ]}
        >
          <ThemedText
            type="small"
            style={{
              color: filter === f.key ? "#FFFFFF" : theme.textSecondary,
            }}
          >
            {f.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  const renderMemory = ({ item }: { item: Memory }) => (
    <MemoryCard
      memory={item}
      onPress={() => handleMemoryPress(item)}
      onStar={() => handleStarMemory(item.id)}
      onDelete={() => handleDeleteMemory(item)}
      onShare={() => handleShareMemory(item)}
    />
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.dark.primary} />
        </View>
      );
    }
    if (isError) {
      return (
        <EmptyState
          icon="alert-circle"
          title="Failed to load memories"
          description="Please try again later."
        />
      );
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
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={filteredMemories}
      renderItem={renderMemory}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={onRefresh}
          tintColor={Colors.dark.primary}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  filtersContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing["3xl"],
  },
});

import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, RefreshControl, SectionList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { MemoryCard, Memory } from "@/components/MemoryCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import { mockMemories } from "@/lib/mockData";

type FilterType = "all" | "omi" | "limitless" | "starred";

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [memories, setMemories] = useState<Memory[]>(mockMemories);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setRefreshing(false);
  }, []);

  const handleMemoryPress = (memory: Memory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleStarMemory = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isStarred: !m.isStarred } : m))
    );
  };

  const filteredMemories = memories.filter((m) => {
    if (filter === "all") return true;
    if (filter === "starred") return m.isStarred;
    return m.deviceType === filter;
  });

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
    />
  );

  const renderEmpty = () => (
    <EmptyState
      icon="inbox"
      title="No memories yet"
      description="Your conversations will appear here once your devices start recording."
    />
  );

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
          refreshing={refreshing}
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
});

import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { SearchBar } from "@/components/SearchBar";
import { MemoryCard, Memory } from "@/components/MemoryCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import { mockMemories, recentSearches as initialSearches } from "@/lib/mockData";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(initialSearches);
  const [results, setResults] = useState<Memory[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSearching(true);
    setHasSearched(true);

    setTimeout(() => {
      const searchResults = mockMemories.filter(
        (m) =>
          m.title.toLowerCase().includes(query.toLowerCase()) ||
          m.transcript.toLowerCase().includes(query.toLowerCase())
      );
      setResults(searchResults);
      setIsSearching(false);

      if (!recentSearches.includes(query)) {
        setRecentSearches((prev) => [query, ...prev].slice(0, 10));
      }
    }, 500);
  }, [query, recentSearches]);

  const handleRecentSearch = (search: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery(search);
    setTimeout(() => {
      setIsSearching(true);
      setHasSearched(true);
      setTimeout(() => {
        const searchResults = mockMemories.filter(
          (m) =>
            m.title.toLowerCase().includes(search.toLowerCase()) ||
            m.transcript.toLowerCase().includes(search.toLowerCase())
        );
        setResults(searchResults);
        setIsSearching(false);
      }, 500);
    }, 100);
  };

  const handleClearRecent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecentSearches([]);
  };

  const handleMemoryPress = (memory: Memory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderRecentSearches = () => (
    <View style={styles.recentSection}>
      <View style={styles.recentHeader}>
        <ThemedText type="h4">Recent Searches</ThemedText>
        {recentSearches.length > 0 ? (
          <Pressable
            onPress={handleClearRecent}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <ThemedText type="small" style={{ color: Colors.dark.primary }}>
              Clear
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recentChips}
      >
        {recentSearches.map((search, index) => (
          <Pressable
            key={index}
            onPress={() => handleRecentSearch(search)}
            style={({ pressed }) => [
              styles.recentChip,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="clock" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: Colors.dark.primary, marginLeft: Spacing.xs }}>
              {search}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.suggestionsSection}>
        <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
          Try searching for
        </ThemedText>
        <ThemedText type="body" secondary>
          "meeting notes" or "action items from yesterday"
        </ThemedText>
      </View>
    </View>
  );

  const renderResults = () => {
    if (isSearching) {
      return (
        <View style={styles.loadingContainer}>
          <ThemedText type="body" secondary>
            Searching...
          </ThemedText>
        </View>
      );
    }

    if (results.length === 0) {
      return (
        <EmptyState
          icon="search"
          title="No results found"
          description={`We couldn't find any memories matching "${query}". Try a different search term.`}
        />
      );
    }

    return (
      <View>
        <ThemedText type="small" secondary style={styles.resultsCount}>
          {results.length} result{results.length !== 1 ? "s" : ""} found
        </ThemedText>
        {results.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            onPress={() => handleMemoryPress(memory)}
            highlightText={query}
          />
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl + 40,
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <SearchBar
        value={query}
        onChangeText={setQuery}
        onSubmit={handleSearch}
        placeholder="Search your memories..."
        autoFocus={false}
      />

      {hasSearched ? renderResults() : renderRecentSearches()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  recentSection: {
    marginTop: Spacing.xl,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  recentChips: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  suggestionsSection: {
    marginTop: Spacing["2xl"],
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing["3xl"],
  },
  resultsCount: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
});

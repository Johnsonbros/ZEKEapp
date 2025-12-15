import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GradientText } from "@/components/GradientText";
import { Spacing, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface HeaderTitleProps {
  title: string;
  isOnline?: boolean;
  isSynced?: boolean;
}

export function HeaderTitle({ title, isOnline = false, isSynced = false }: HeaderTitleProps) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/icon.png")}
        style={styles.icon}
        resizeMode="contain"
      />
      <GradientText type="h4" style={styles.title}>{title}</GradientText>
      
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.dark.success : Colors.dark.error }]} />
        <ThemedText type="small" style={{ fontSize: 11, color: theme.textSecondary }}>
          {isOnline ? "Online" : "Offline"}
        </ThemedText>
      </View>
      
      {isSynced ? (
        <View style={styles.syncContainer}>
          <Feather name="check-circle" size={12} color={Colors.dark.success} />
          <ThemedText type="small" style={{ fontSize: 10, color: theme.textSecondary, marginLeft: 2 }}>
            Synced
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: Spacing.xs,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  title: {
    marginRight: Spacing.xs,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
});

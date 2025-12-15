import React, { useState, useEffect } from "react";
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

function formatDateTime(date: Date): { time: string; date: string } {
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  return { time, date: dateStr };
}

export function HeaderTitle({ title, isOnline = false, isSynced = false }: HeaderTitleProps) {
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(timer);
  }, []);
  
  const { time, date } = formatDateTime(currentTime);
  
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
        <ThemedText type="small" style={{ fontSize: 10, color: isOnline ? Colors.dark.success : theme.textSecondary }}>
          {isOnline ? "Online" : "Offline"}
        </ThemedText>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.dateTimeContainer}>
        <ThemedText type="small" style={{ fontSize: 11, color: theme.text, fontWeight: "600" }}>
          {time}
        </ThemedText>
        <ThemedText type="small" style={{ fontSize: 9, color: theme.textSecondary }}>
          {date}
        </ThemedText>
      </View>
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
    marginRight: 2,
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
  divider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.dark.border,
    marginHorizontal: Spacing.xs,
  },
  dateTimeContainer: {
    alignItems: "flex-end",
  },
});

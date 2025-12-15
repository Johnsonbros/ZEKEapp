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
    }, 30000);
    
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
      <View style={styles.titleSection}>
        <GradientText type="h3">{title}</GradientText>
      </View>
      
      <View style={styles.statusSection}>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
        ]}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.dark.success : Colors.dark.error }]} />
          <ThemedText type="small" style={{ 
            fontSize: 10, 
            fontWeight: "600",
            color: isOnline ? Colors.dark.success : Colors.dark.error 
          }}>
            {isOnline ? "All Systems Go" : "Offline"}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.dateTimeSection}>
        <ThemedText type="body" style={{ fontSize: 13, color: theme.text, fontWeight: "600" }}>
          {time}
        </ThemedText>
        <ThemedText type="small" style={{ fontSize: 10, color: theme.textSecondary }}>
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
    gap: Spacing.sm,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  titleSection: {
    marginRight: Spacing.xs,
  },
  statusSection: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dateTimeSection: {
    alignItems: "flex-end",
  },
});

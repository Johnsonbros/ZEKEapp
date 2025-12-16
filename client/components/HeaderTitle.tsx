import React from "react";
import { View, StyleSheet, Image } from "react-native";

import { GradientText } from "@/components/GradientText";
import { Spacing, Colors } from "@/constants/theme";

interface HeaderTitleProps {
  title: string;
  isOnline?: boolean;
}

export function HeaderTitle({ title, isOnline = false }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/icon.png")}
        style={styles.icon}
        resizeMode="contain"
      />
      <GradientText type="h2" style={styles.title}>{title}</GradientText>
      <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.dark.success : Colors.dark.error }]} />
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
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 2,
  },
});

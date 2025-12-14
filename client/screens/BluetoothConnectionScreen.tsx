import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors, Gradients } from "@/constants/theme";

interface MockDevice {
  id: string;
  name: string;
  type: "omi" | "limitless";
  signalStrength: number;
}

const MOCK_NEARBY_DEVICES: MockDevice[] = [
  { id: "omi-nearby-1", name: "Omi DevKit 2", type: "omi", signalStrength: -45 },
  { id: "limitless-nearby-1", name: "Limitless Pendant", type: "limitless", signalStrength: -62 },
];

export default function BluetoothConnectionScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const [isScanning, setIsScanning] = useState(false);
  const [nearbyDevices, setNearbyDevices] = useState<MockDevice[]>([]);

  const scanPulse = useSharedValue(1);

  const isExpoGo = Constants.appOwnership === "expo";
  const isBluetoothUnavailable = Platform.OS === "web" || isExpoGo;

  const handleStartScan = () => {
    if (isBluetoothUnavailable) {
      if (Platform.OS === "web") {
        startSimulatedScan();
      } else {
        Alert.alert(
          "Bluetooth Not Available",
          "Bluetooth Low Energy is not available in Expo Go. To use real device pairing, please build a development version of this app.\n\nFor now, you can see how the pairing flow works with simulated devices.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Try Simulation",
              onPress: () => startSimulatedScan(),
            },
          ]
        );
      }
      return;
    }
    startSimulatedScan();
  };

  const startSimulatedScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsScanning(true);
    setNearbyDevices([]);

    scanPulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );

    setTimeout(() => {
      setNearbyDevices([MOCK_NEARBY_DEVICES[0]]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 1500);

    setTimeout(() => {
      setNearbyDevices(MOCK_NEARBY_DEVICES);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 3000);

    setTimeout(() => {
      setIsScanning(false);
      scanPulse.value = withTiming(1);
    }, 5000);
  };

  const handleStopScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsScanning(false);
    scanPulse.value = withTiming(1);
  };

  const handleConnectDevice = (device: MockDevice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Connect to ${device.name}?`,
      "This is a simulated connection. In a production build with BLE support, the device would pair here.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Connect",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Connected!", `Successfully connected to ${device.name} (simulated).`);
          },
        },
      ]
    );
  };

  const getSignalIcon = (strength: number): keyof typeof Feather.glyphMap => {
    if (strength > -50) return "wifi";
    if (strength > -70) return "wifi";
    return "wifi";
  };

  const getSignalColor = (strength: number): string => {
    if (strength > -50) return Colors.dark.success;
    if (strength > -70) return Colors.dark.warning;
    return Colors.dark.error;
  };

  const scanAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanPulse.value }],
  }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.warningCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.warningIconContainer}>
          <Feather name="info" size={20} color={Colors.dark.warning} />
        </View>
        <View style={styles.warningContent}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            Expo Go Limitation
          </ThemedText>
          <ThemedText type="small" secondary style={{ marginTop: Spacing.xs }}>
            Bluetooth Low Energy requires a native build. This demo shows the pairing UI with simulated devices.
          </ThemedText>
        </View>
      </View>

      <View style={styles.scanSection}>
        <Animated.View style={[styles.scanButtonWrapper, scanAnimatedStyle]}>
          {isScanning ? (
            <View style={[styles.scanPulseRing, { borderColor: Colors.dark.primary }]} />
          ) : null}
          <Pressable
            onPress={isScanning ? handleStopScan : handleStartScan}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <LinearGradient
              colors={isScanning ? [Colors.dark.error, Colors.dark.error] : Gradients.primary}
              style={styles.scanButton}
            >
              <Feather
                name={isScanning ? "x" : "bluetooth"}
                size={32}
                color="#FFFFFF"
              />
            </LinearGradient>
          </Pressable>
        </Animated.View>
        <ThemedText type="h3" style={styles.scanTitle}>
          {isScanning ? "Scanning for Devices..." : "Pair Your Device"}
        </ThemedText>
        <ThemedText type="body" secondary style={styles.scanSubtitle}>
          {isScanning
            ? "Looking for nearby Omi and Limitless devices"
            : "Tap to scan for nearby Bluetooth devices"}
        </ThemedText>
      </View>

      {nearbyDevices.length > 0 ? (
        <View style={styles.devicesSection}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Nearby Devices ({nearbyDevices.length})
          </ThemedText>
          {nearbyDevices.map((device) => (
            <Pressable
              key={device.id}
              onPress={() => handleConnectDevice(device)}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Card elevation={1} style={styles.deviceCard}>
                <View style={styles.deviceRow}>
                  <View
                    style={[
                      styles.deviceIcon,
                      {
                        backgroundColor:
                          device.type === "omi" ? Colors.dark.primary : Colors.dark.secondary,
                      },
                    ]}
                  >
                    <Feather
                      name={device.type === "omi" ? "circle" : "square"}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.deviceInfo}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {device.name}
                    </ThemedText>
                    <View style={styles.deviceMeta}>
                      <Feather
                        name={getSignalIcon(device.signalStrength)}
                        size={12}
                        color={getSignalColor(device.signalStrength)}
                      />
                      <ThemedText type="caption" secondary style={{ marginLeft: 4 }}>
                        {device.signalStrength} dBm
                      </ThemedText>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!isScanning && nearbyDevices.length === 0 ? (
        <View style={styles.instructionsSection}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Pairing Instructions
          </ThemedText>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <View style={[styles.instructionNumber, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="small">1</ThemedText>
              </View>
              <ThemedText type="body" style={styles.instructionText}>
                Make sure your Omi DevKit 2 or Limitless Pendant is charged and powered on
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <View style={[styles.instructionNumber, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="small">2</ThemedText>
              </View>
              <ThemedText type="body" style={styles.instructionText}>
                Enable Bluetooth on your phone and keep the device nearby
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <View style={[styles.instructionNumber, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="small">3</ThemedText>
              </View>
              <ThemedText type="body" style={styles.instructionText}>
                Tap the scan button above to search for your device
              </ThemedText>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  warningCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  warningIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  warningContent: {
    flex: 1,
  },
  scanSection: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    marginBottom: Spacing.xl,
  },
  scanButtonWrapper: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
  scanPulseRing: {
    position: "absolute",
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 60,
    borderWidth: 2,
    opacity: 0.5,
  },
  scanButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  scanTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  scanSubtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  devicesSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  deviceCard: {
    marginBottom: Spacing.sm,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  instructionsSection: {
    marginBottom: Spacing.xl,
  },
  instructionsList: {
    gap: Spacing.lg,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    flex: 1,
    paddingTop: 2,
  },
});

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import HomeScreen from "@/screens/HomeScreen";
import AudioUploadScreen from "@/screens/AudioUploadScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import NotificationSettingsScreen from "@/screens/NotificationSettingsScreen";
import DataExportScreen from "@/screens/DataExportScreen";
import AnalyticsScreen from "@/screens/AnalyticsScreen";
import BluetoothConnectionScreen from "@/screens/BluetoothConnectionScreen";
import LiveCaptureScreen from "@/screens/LiveCaptureScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { getHealthStatus } from "@/lib/zeke-api-adapter";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { MainTabParamList } from "@/navigation/MainTabNavigator";
import { Colors, Spacing } from "@/constants/theme";

export type HomeStackParamList = {
  Home: undefined;
  AudioUpload: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  DataExport: undefined;
  Analytics: undefined;
  BluetoothConnection: undefined;
  LiveCapture: undefined;
};

type HomeNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

function HeaderRightButtons() {
  const navigation = useNavigation<HomeNavigationProp>();

  const handleChatPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Chat");
  };

  const handleSettingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Settings");
  };

  return (
    <View style={headerButtonStyles.container}>
      <Pressable onPress={handleChatPress} style={headerButtonStyles.button}>
        <Feather name="message-circle" size={22} color={Colors.dark.primary} />
      </Pressable>
      <Pressable onPress={handleSettingsPress} style={headerButtonStyles.button}>
        <Feather name="settings" size={22} color={Colors.dark.textSecondary} />
      </Pressable>
    </View>
  );
}

const headerButtonStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  button: {
    padding: Spacing.xs,
  },
});

const Stack = createNativeStackNavigator<HomeStackParamList>();

function HomeHeaderTitle() {
  const { data: health, isSuccess } = useQuery({
    queryKey: ["/api/health"],
    queryFn: () => getHealthStatus(),
    refetchInterval: 15000,
    retry: 1,
    staleTime: 10000,
  });

  const isOnline = isSuccess && health?.connected === true;

  return (
    <HeaderTitle 
      title="ZEKE" 
      isOnline={isOnline}
    />
  );
}

export default function HomeStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => <HomeHeaderTitle />,
          headerRight: () => <HeaderRightButtons />,
        }}
      />
      <Stack.Screen
        name="AudioUpload"
        component={AudioUploadScreen}
        options={{
          headerTitle: "Upload Audio",
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          headerTitle: "Notifications",
        }}
      />
      <Stack.Screen
        name="DataExport"
        component={DataExportScreen}
        options={{
          headerTitle: "Export Data",
        }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          headerTitle: "Analytics",
        }}
      />
      <Stack.Screen
        name="BluetoothConnection"
        component={BluetoothConnectionScreen}
        options={{
          headerTitle: "Pair Device",
        }}
      />
      <Stack.Screen
        name="LiveCapture"
        component={LiveCaptureScreen}
        options={{
          headerTitle: "Live Capture",
        }}
      />
    </Stack.Navigator>
  );
}

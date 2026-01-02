import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { NavigatorScreenParams } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import CommunicationStackNavigator from "@/navigation/CommunicationStackNavigator";
import CalendarStackNavigator from "@/navigation/CalendarStackNavigator";
import GeoStackNavigator from "@/navigation/GeoStackNavigator";
import TasksStackNavigator from "@/navigation/TasksStackNavigator";
import { ZekeServicesHub } from "@/components/ZekeServicesHub";
import { FloatingHubButton } from "@/components/FloatingHubButton";
import { AppCardData } from "@/components/AppCard";
import { Gradients, Colors } from "@/constants/theme";
import type { HomeStackParamList } from "@/navigation/HomeStackNavigator";

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  CommsTab: undefined;
  CalendarTab: undefined;
  GeoTab: undefined;
  TasksTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const [hubVisible, setHubVisible] = useState(false);
  const [zekeIsActive, setZekeIsActive] = useState(false);
  const [currentAction, setCurrentAction] = useState("Standing by");

  // Simulate ZEKE activity for demo purposes
  useEffect(() => {
    const interval = setInterval(() => {
      const actions = [
        "Standing by",
        "Syncing calendar events...",
        "Processing voice command",
        "Updating location data",
        "Analyzing tasks",
      ];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      setCurrentAction(randomAction);
      setZekeIsActive(randomAction !== "Standing by");
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (screen: keyof MainTabParamList, params?: any) => {
    setHubVisible(false);
    // Navigation will be handled by the Tab.Navigator
  };

  return (
    <View style={styles.container}>
      <Tab.Navigator
        initialRouteName="HomeTab"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.dark.primary,
          tabBarInactiveTintColor: Colors.dark.tabIconDefault,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIconStyle: styles.tabBarIcon,
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStackNavigator}
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="CommsTab"
          component={CommunicationStackNavigator}
          options={{
            title: "Comms",
            tabBarIcon: ({ color, size }) => (
              <Feather name="phone" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="CalendarTab"
          component={CalendarStackNavigator}
          options={{
            title: "Calendar",
            tabBarIcon: ({ color, size }) => (
              <Feather name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="GeoTab"
          component={GeoStackNavigator}
          options={{
            title: "Geo",
            tabBarIcon: ({ color, size }) => (
              <Feather name="map-pin" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="TasksTab"
          component={TasksStackNavigator}
          options={{
            title: "Tasks",
            tabBarIcon: ({ color, size }) => (
              <Feather name="check-square" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>

      <ZekeHubOverlay
        hubVisible={hubVisible}
        setHubVisible={setHubVisible}
        zekeIsActive={zekeIsActive}
        currentAction={currentAction}
      />
    </View>
  );
}

interface ZekeHubOverlayProps {
  hubVisible: boolean;
  setHubVisible: (visible: boolean) => void;
  zekeIsActive: boolean;
  currentAction: string;
}

function ZekeHubOverlay({ hubVisible, setHubVisible, zekeIsActive, currentAction }: ZekeHubOverlayProps) {
  const navigation = useNavigation<any>();

  const apps: AppCardData[] = [
    {
      id: "home",
      title: "Home",
      icon: "home",
      gradientColors: ["#6366F1", "#8B5CF6"],
      liveData: {
        primary: "Dashboard",
        secondary: "View system overview and quick stats",
      },
      isZekeActive: currentAction.includes("overview"),
      onPress: () => {
        setHubVisible(false);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate("HomeTab");
        }, 200);
      },
    },
    {
      id: "comms",
      title: "Communications",
      icon: "phone",
      gradientColors: ["#8B5CF6", "#A855F7"],
      liveData: {
        primary: "3 unread messages",
        secondary: "Last: Mom - 2 min ago",
        count: 3,
      },
      needsAttention: true,
      isZekeActive: currentAction.includes("voice"),
      onPress: () => {
        setHubVisible(false);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate("CommsTab");
        }, 200);
      },
    },
    {
      id: "calendar",
      title: "Calendar",
      icon: "calendar",
      gradientColors: ["#10B981", "#059669"],
      liveData: {
        primary: "Team Standup in 15 min",
        secondary: "4 events today",
      },
      needsAttention: true,
      isZekeActive: currentAction.includes("calendar"),
      onPress: () => {
        setHubVisible(false);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate("CalendarTab");
        }, 200);
      },
    },
    {
      id: "geo",
      title: "Location",
      icon: "map-pin",
      gradientColors: ["#EF4444", "#DC2626"],
      liveData: {
        primary: "Current: Home",
        secondary: "2 active geofences",
      },
      isZekeActive: currentAction.includes("location"),
      onPress: () => {
        setHubVisible(false);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate("GeoTab");
        }, 200);
      },
    },
    {
      id: "tasks",
      title: "Tasks",
      icon: "check-square",
      gradientColors: ["#F59E0B", "#D97706"],
      liveData: {
        primary: "7 tasks today",
        secondary: "3 high priority",
        count: 7,
      },
      isZekeActive: currentAction.includes("tasks"),
      onPress: () => {
        setHubVisible(false);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate("TasksTab");
        }, 200);
      },
    },
    {
      id: "upload",
      title: "File Upload",
      icon: "upload-cloud",
      gradientColors: Gradients.accent,
      liveData: {
        primary: "Ready to upload",
        secondary: "Last upload: 2 hours ago",
      },
      onPress: () => {
        setHubVisible(false);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate("HomeTab", { screen: "FileUpload" });
        }, 200);
      },
    },
    {
      id: "chat",
      title: "ZEKE Chat",
      icon: "message-circle",
      gradientColors: ["#06B6D4", "#0891B2"],
      liveData: {
        primary: "Ask me anything",
        secondary: "AI assistant ready",
      },
      onPress: () => {
        setHubVisible(false);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate("HomeTab", { screen: "Chat" });
        }, 200);
      },
    },
    {
      id: "settings",
      title: "Settings",
      icon: "settings",
      gradientColors: ["#64748B", "#475569"],
      liveData: {
        primary: "App Configuration",
        secondary: "Manage preferences and devices",
      },
      onPress: () => {
        setHubVisible(false);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate("HomeTab", { screen: "Settings" });
        }, 200);
      },
    },
  ];

  const handleZekeStatusPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log("ZEKE status pressed - show activity details");
  };

  return (
    <>
      <FloatingHubButton
        onPress={() => setHubVisible(true)}
        zekeIsActive={zekeIsActive}
      />
      <ZekeServicesHub
        apps={apps}
        zekeCurrentAction={currentAction}
        zekeIsActive={zekeIsActive}
        isVisible={hubVisible}
        onClose={() => setHubVisible(false)}
        onZekeStatusPress={handleZekeStatusPress}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  tabBar: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabBarIcon: {
    marginTop: 4,
  },
});

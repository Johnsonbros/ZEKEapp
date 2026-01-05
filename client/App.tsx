import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Platform, View } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  NavigationContainerRef,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, getApiUrl, getLocalApiUrl, initializeProxyOrigin } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Colors } from "@/constants/theme";
import { AuthProvider, useAuth, loadTokenSync } from "@/context/AuthContext";
import { PairingScreen } from "@/screens/PairingScreen";
import { ConnectivityService } from "@/lib/connectivity";
import { SyncTrigger } from "@/lib/sync-trigger";
import { ToastProvider } from "@/components/Toast";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { ThemedText } from "@/components/ThemedText";

SplashScreen.preventAutoHideAsync();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.backgroundRoot,
    card: Colors.dark.backgroundDefault,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.accent,
  },
};

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showMainApp, setShowMainApp] = useState(false);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Handle transition from unauthenticated to authenticated
  // Add a brief delay to allow proper cleanup of PairingScreen before mounting main app
  useEffect(() => {
    if (isAuthenticated && !wasAuthenticated.current && !isLoading) {
      // User just authenticated - add transition delay
      console.log("[AuthGate] Authentication successful, transitioning to main app...");
      setIsTransitioning(true);
      wasAuthenticated.current = true;
      
      // Brief delay allows React Native to properly unmount PairingScreen
      // and prepare for the complex MainTabNavigator with gesture handlers
      const timer = setTimeout(() => {
        setShowMainApp(true);
        setIsTransitioning(false);
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (isAuthenticated && wasAuthenticated.current) {
      // Already authenticated (app restart or refresh)
      setShowMainApp(true);
    } else if (!isAuthenticated) {
      // Not authenticated or logged out
      wasAuthenticated.current = false;
      setShowMainApp(false);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || isTransitioning) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.text} />
        <ThemedText style={styles.loadingText}>
          {isTransitioning ? "Launching ZEKE..." : "Preparing your session..."}
        </ThemedText>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <PairingScreen />;
  }

  if (!showMainApp) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.text} />
        <ThemedText style={styles.loadingText}>Launching ZEKE...</ThemedText>
      </View>
    );
  }

  return <>{children}</>;
}

function AppContent() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const notificationResponseListener =
    useRef<Notifications.Subscription | null>(null);

  useRealtimeUpdates();

  useEffect(() => {
    if (Platform.OS === "web") return;

    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;

        if (data?.type === "grocery_prompt" && data?.screen === "Grocery") {
          if (navigationRef.current?.isReady()) {
            navigationRef.current.navigate("Main", {
              screen: "TasksTab",
              params: {
                screen: "Grocery",
              },
            });
          }
        }
      });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef} theme={DarkTheme}>
      <AuthGate>
        <RootStackNavigator />
      </AuthGate>
    </NavigationContainer>
  );
}

export default function App() {
  const [isProxyReady, setIsProxyReady] = useState(false);

  // Gate app until proxy origin is initialized (prevents stale URL issues in published apps)
  // Also initialize connectivity monitoring and sync trigger
  useEffect(() => {
    // Load token synchronously on web before any queries start
    loadTokenSync();
    
    // Initialize connectivity monitoring
    ConnectivityService.initialize({
      debounceMs: 500,
      onOnline: () => {
        console.log("[App] Device came online - triggering sync");
        SyncTrigger.triggerSync();
      },
      onOffline: () => {
        console.log("[App] Device went offline");
      },
    });
    
    initializeProxyOrigin()
      .then(() => {
        const apiUrl = getApiUrl();
        const localApiUrl = getLocalApiUrl();
        
        console.log("[config] ========== BOOT-TIME CONFIG ==========");
        console.log(`[config] Platform: ${Platform.OS}`);
        console.log(`[config] Environment: ${__DEV__ ? "development" : "production"}`);
        console.log(`[config] EXPO_PUBLIC_DOMAIN: ${process.env.EXPO_PUBLIC_DOMAIN || "(not set)"}`);
        console.log(`[config] Resolved apiUrl: ${apiUrl}`);
        console.log(`[config] Resolved localApiUrl: ${localApiUrl}`);
        console.log(`[config] URLs match: ${apiUrl === localApiUrl ? "YES" : "NO"}`);
        console.log("[config] ======================================");
      })
      .finally(() => {
        setIsProxyReady(true);
      });

    return () => {
      ConnectivityService.cleanup();
    };
  }, []);

  // Don't render QueryClientProvider until proxy is ready
  // This prevents early API calls from using stale URLs
  if (!isProxyReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ToastProvider>
              <GestureHandlerRootView style={styles.root}>
                <KeyboardProvider>
                  <AppContent />
                  <StatusBar style="light" />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </ToastProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundRoot,
    gap: 12,
  },
  loadingText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
});

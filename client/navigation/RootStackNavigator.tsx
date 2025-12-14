import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import ChatScreen from "@/screens/ChatScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { GradientText } from "@/components/GradientText";

export type RootStackParamList = {
  Main: undefined;
  Chat: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          presentation: "modal",
          headerTitle: () => <GradientText type="h4">ZEKE AI</GradientText>,
        }}
      />
    </Stack.Navigator>
  );
}

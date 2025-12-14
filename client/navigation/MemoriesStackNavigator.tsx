import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MemoriesScreen from "@/screens/MemoriesScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type MemoriesStackParamList = {
  Memories: undefined;
};

const Stack = createNativeStackNavigator<MemoriesStackParamList>();

export default function MemoriesStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Memories"
        component={MemoriesScreen}
        options={{
          headerTitle: "Memories",
        }}
      />
    </Stack.Navigator>
  );
}

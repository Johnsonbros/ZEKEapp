import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import HomeScreen from "@/screens/HomeScreen";
import AudioUploadScreen from "@/screens/AudioUploadScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { getHealthStatus } from "@/lib/zeke-api-adapter";

export type HomeStackParamList = {
  Home: undefined;
  AudioUpload: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

function HomeHeaderTitle() {
  const { data: health } = useQuery({
    queryKey: ["/api/health"],
    queryFn: () => getHealthStatus(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  return (
    <HeaderTitle 
      title="ZEKE" 
      isOnline={health?.connected ?? false}
      isSynced={true}
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
        }}
      />
      <Stack.Screen
        name="AudioUpload"
        component={AudioUploadScreen}
        options={{
          headerTitle: "Upload Audio",
        }}
      />
    </Stack.Navigator>
  );
}

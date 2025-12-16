import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CommunicationsHubScreen from "@/screens/CommunicationsHubScreen";
import SmsConversationScreen from "@/screens/SmsConversationScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type CommunicationStackParamList = {
  CommunicationsHub: undefined;
  SmsConversation: {
    conversationId?: string;
    contactId?: string;
    phoneNumber?: string;
  };
  ConversationDetail: { conversationId: string; type: "sms" | "voice" | "app" };
};

const Stack = createNativeStackNavigator<CommunicationStackParamList>();

export default function CommunicationStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="CommunicationsHub"
        component={CommunicationsHubScreen}
        options={{
          headerTitle: "Communications",
        }}
      />
      <Stack.Screen
        name="SmsConversation"
        component={SmsConversationScreen}
        options={{
          headerTitle: "Conversation",
        }}
      />
    </Stack.Navigator>
  );
}

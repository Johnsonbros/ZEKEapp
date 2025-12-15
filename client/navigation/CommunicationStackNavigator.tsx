import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CommunicationLogScreen from "@/screens/CommunicationLogScreen";
import SmsConversationScreen from "@/screens/SmsConversationScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type CommunicationStackParamList = {
  CommunicationLog: undefined;
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
        name="CommunicationLog"
        component={CommunicationLogScreen}
        options={{
          headerTitle: "Inbox",
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

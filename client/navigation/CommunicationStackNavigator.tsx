import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import CommunicationsHubScreen from "@/screens/CommunicationsHubScreen";
import SmsConversationScreen from "@/screens/SmsConversationScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Colors, Spacing } from "@/constants/theme";

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

type CommunicationsNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<CommunicationStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

function ComposeButton() {
  const navigation = useNavigation<CommunicationsNavigationProp>();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("SmsCompose", {});
  };

  return (
    <Pressable onPress={handlePress} style={headerStyles.button}>
      <Feather name="edit" size={22} color={Colors.dark.text} />
    </Pressable>
  );
}

const headerStyles = StyleSheet.create({
  button: {
    padding: Spacing.sm,
    marginRight: -Spacing.sm,
  },
});

export default function CommunicationStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="CommunicationsHub"
        component={CommunicationsHubScreen}
        options={{
          headerTitle: "Communications",
          headerRight: () => <ComposeButton />,
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

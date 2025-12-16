import React, { useState } from "react";
import { View, FlatList, StyleSheet, Pressable, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Gradients } from "@/constants/theme";
import { CommunicationStackParamList } from "@/navigation/CommunicationStackNavigator";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type CommunicationNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<CommunicationStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type TabType = "sms" | "voice" | "chat";

interface SmsConversation {
  id: string;
  contactName: string;
  initials: string;
  avatarColor: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

interface VoiceCall {
  id: string;
  contactName: string;
  initials: string;
  avatarColor: string;
  direction: "incoming" | "outgoing" | "missed";
  duration: string;
  timestamp: string;
}

const mockSmsConversations: SmsConversation[] = [
  {
    id: "1",
    contactName: "Sarah Johnson",
    initials: "SJ",
    avatarColor: Colors.dark.primary,
    lastMessage: "Hey! Are we still meeting for lunch tomorrow?",
    timestamp: "2 min ago",
    unreadCount: 2,
  },
  {
    id: "2",
    contactName: "Michael Chen",
    initials: "MC",
    avatarColor: Colors.dark.accent,
    lastMessage: "The project files have been uploaded to the shared drive.",
    timestamp: "1 hr ago",
    unreadCount: 0,
  },
  {
    id: "3",
    contactName: "Emily Davis",
    initials: "ED",
    avatarColor: Colors.dark.secondary,
    lastMessage: "Thanks for your help with the presentation!",
    timestamp: "3 hrs ago",
    unreadCount: 0,
  },
  {
    id: "4",
    contactName: "David Wilson",
    initials: "DW",
    avatarColor: Colors.dark.success,
    lastMessage: "Can you send me the address for Saturday's event?",
    timestamp: "Yesterday",
    unreadCount: 1,
  },
  {
    id: "5",
    contactName: "Lisa Martinez",
    initials: "LM",
    avatarColor: Colors.dark.warning,
    lastMessage: "The meeting has been rescheduled to 3pm.",
    timestamp: "Yesterday",
    unreadCount: 0,
  },
  {
    id: "6",
    contactName: "James Brown",
    initials: "JB",
    avatarColor: Colors.dark.error,
    lastMessage: "Let me know when you're free to discuss the proposal.",
    timestamp: "2 days ago",
    unreadCount: 0,
  },
];

const mockVoiceCalls: VoiceCall[] = [
  {
    id: "1",
    contactName: "Sarah Johnson",
    initials: "SJ",
    avatarColor: Colors.dark.primary,
    direction: "incoming",
    duration: "12:34",
    timestamp: "10 min ago",
  },
  {
    id: "2",
    contactName: "Michael Chen",
    initials: "MC",
    avatarColor: Colors.dark.accent,
    direction: "outgoing",
    duration: "5:22",
    timestamp: "2 hrs ago",
  },
  {
    id: "3",
    contactName: "Emily Davis",
    initials: "ED",
    avatarColor: Colors.dark.secondary,
    direction: "missed",
    duration: "",
    timestamp: "4 hrs ago",
  },
  {
    id: "4",
    contactName: "David Wilson",
    initials: "DW",
    avatarColor: Colors.dark.success,
    direction: "outgoing",
    duration: "3:45",
    timestamp: "Yesterday",
  },
  {
    id: "5",
    contactName: "Lisa Martinez",
    initials: "LM",
    avatarColor: Colors.dark.warning,
    direction: "missed",
    duration: "",
    timestamp: "2 days ago",
  },
];

function getCallIcon(direction: VoiceCall["direction"]): { name: keyof typeof Feather.glyphMap; color: string } {
  switch (direction) {
    case "incoming":
      return { name: "phone-incoming", color: Colors.dark.success };
    case "outgoing":
      return { name: "phone-outgoing", color: Colors.dark.primary };
    case "missed":
      return { name: "phone-missed", color: Colors.dark.error };
  }
}

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function TabButton({ label, isActive, onPress }: TabButtonProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {isActive ? (
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.tabButtonActive}
        >
          <ThemedText type="small" style={styles.tabButtonTextActive}>
            {label}
          </ThemedText>
        </LinearGradient>
      ) : (
        <View style={[styles.tabButtonInactive, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="small" secondary>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

interface SmsRowProps {
  conversation: SmsConversation;
  onPress: () => void;
}

function SmsRow({ conversation, onPress }: SmsRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: conversation.avatarColor }]}>
        <ThemedText type="body" style={styles.avatarText}>
          {conversation.initials}
        </ThemedText>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }} numberOfLines={1}>
            {conversation.contactName}
          </ThemedText>
          <ThemedText type="caption" secondary>
            {conversation.timestamp}
          </ThemedText>
        </View>
        <View style={styles.rowFooter}>
          <ThemedText
            type="small"
            secondary
            style={{ flex: 1 }}
            numberOfLines={1}
          >
            {conversation.lastMessage}
          </ThemedText>
          {conversation.unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <ThemedText type="caption" style={styles.unreadText}>
                {conversation.unreadCount}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

interface VoiceRowProps {
  call: VoiceCall;
  onPress: () => void;
}

function VoiceRow({ call, onPress }: VoiceRowProps) {
  const { theme } = useTheme();
  const { name: iconName, color: iconColor } = getCallIcon(call.direction);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: call.avatarColor }]}>
        <ThemedText type="body" style={styles.avatarText}>
          {call.initials}
        </ThemedText>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <ThemedText
            type="body"
            style={{
              fontWeight: "600",
              flex: 1,
              color: call.direction === "missed" ? Colors.dark.error : theme.text,
            }}
            numberOfLines={1}
          >
            {call.contactName}
          </ThemedText>
          <ThemedText type="caption" secondary>
            {call.timestamp}
          </ThemedText>
        </View>
        <View style={styles.rowFooter}>
          <View style={styles.callInfo}>
            <Feather name={iconName} size={14} color={iconColor} />
            <ThemedText
              type="small"
              secondary
              style={{ marginLeft: Spacing.xs }}
            >
              {call.direction === "missed" ? "Missed call" : call.duration}
            </ThemedText>
          </View>
        </View>
      </View>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        hitSlop={8}
        style={({ pressed }) => [styles.callButton, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Feather name="phone" size={20} color={Colors.dark.success} />
      </Pressable>
    </Pressable>
  );
}

interface ChatPlaceholderProps {
  onStartChat: () => void;
}

function ChatPlaceholder({ onStartChat }: ChatPlaceholderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.chatPlaceholder}>
      <LinearGradient
        colors={Gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.chatIcon}
      >
        <Feather name="message-circle" size={48} color="#FFFFFF" />
      </LinearGradient>
      <ThemedText type="h3" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>
        Chat with ZEKE
      </ThemedText>
      <ThemedText type="body" secondary style={{ textAlign: "center", paddingHorizontal: Spacing.xl }}>
        Your AI companion is ready to help. Ask about your memories, schedule meetings, or get insights from your recordings.
      </ThemedText>
      <Pressable
        onPress={onStartChat}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.startChatButton}
        >
          <Feather name="message-square" size={20} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", marginLeft: Spacing.sm, fontWeight: "600" }}>
            Start Chatting
          </ThemedText>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export default function CommunicationsHubScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<CommunicationNavigationProp>();
  
  const [activeTab, setActiveTab] = useState<TabType>("sms");

  const handleTabPress = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleSmsPress = (conversation: SmsConversation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("SmsConversation", { conversationId: conversation.id });
  };

  const handleVoicePress = (call: VoiceCall) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const callTypeText = call.direction === "missed" ? "Missed call from" : call.direction === "incoming" ? "Incoming call from" : "Outgoing call to";
    const message = `${callTypeText} ${call.contactName}\n${call.duration ? `Duration: ${call.duration}` : ""}\n${call.timestamp}`;
    
    if (Platform.OS === 'web') {
      window.alert(`Voice Call Details\n\n${message}`);
    } else {
      Alert.alert("Voice Call Details", message, [{ text: "OK" }]);
    }
  };

  const handleStartChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Chat");
  };

  const renderSmsItem = ({ item }: { item: SmsConversation }) => (
    <SmsRow conversation={item} onPress={() => handleSmsPress(item)} />
  );

  const renderVoiceItem = ({ item }: { item: VoiceCall }) => (
    <VoiceRow call={item} onPress={() => handleVoicePress(item)} />
  );

  const renderContent = () => {
    switch (activeTab) {
      case "sms":
        return (
          <FlatList
            data={mockSmsConversations}
            renderItem={renderSmsItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        );
      case "voice":
        return (
          <FlatList
            data={mockVoiceCalls}
            renderItem={renderVoiceItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        );
      case "chat":
        return <ChatPlaceholder onStartChat={handleStartChat} />;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.contentContainer,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        <View style={styles.tabContainer}>
          <TabButton
            label="SMS"
            isActive={activeTab === "sms"}
            onPress={() => handleTabPress("sms")}
          />
          <TabButton
            label="Voice"
            isActive={activeTab === "voice"}
            onPress={() => handleTabPress("voice")}
          />
          <TabButton
            label="Chat"
            isActive={activeTab === "chat"}
            onPress={() => handleTabPress("chat")}
          />
        </View>
        <View style={styles.tabContent}>
          {renderContent()}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
  },
  tabButtonActive: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonInactive: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  tabContent: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  rowContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  rowFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  callInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadBadge: {
    backgroundColor: Colors.dark.accent,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  unreadText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 11,
  },
  callButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  chatPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  chatIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  startChatButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
  },
});

import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, FlatList, TextInput, Pressable, Platform, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ChatBubble, Message, TypingIndicator } from "@/components/ChatBubble";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Gradients } from "@/constants/theme";
import { mockMessages } from "@/lib/mockData";
import { saveChatMessages } from "@/lib/storage";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();

  const animatedInputContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: keyboardHeight.value }],
    };
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      content: inputText.trim(),
      role: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        content: generateResponse(inputText.trim()),
        role: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => {
        const updated = [...prev, assistantMessage];
        saveChatMessages(updated);
        return updated;
      });
      setIsTyping(false);
    }, 1500);
  };

  const generateResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes("meeting") || lowerQuery.includes("meetings")) {
      return "I found 3 meetings from today. Your morning standup discussed quarterly targets, and the afternoon product brainstorm covered new app features. Would you like detailed notes from any of these?";
    }

    if (lowerQuery.includes("summarize") || lowerQuery.includes("summary")) {
      return "Here's a quick summary of your recent recordings:\n\n- 5 memories captured today\n- Key topics: Sprint planning, product features, client feedback\n- Total recording time: ~2.5 hours\n\nWhat would you like to explore further?";
    }

    if (lowerQuery.includes("help") || lowerQuery.includes("what can you do")) {
      return "I can help you with:\n\n- Summarizing your meetings and conversations\n- Searching through your memory logs\n- Finding action items and key decisions\n- Providing insights from your recordings\n\nJust ask me anything about your captured conversations!";
    }

    return "I've noted your question. Based on your recent recordings, I can help provide context and insights. Could you tell me more about what specific information you're looking for?";
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatBubble message={item} />
  );

  const renderFooter = () => {
    if (!isTyping) return null;
    return <TypingIndicator />;
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={headerHeight}
    >
      <FlatList
        ref={flatListRef}
        style={styles.messagesList}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: Spacing.lg + 80,
          paddingHorizontal: Spacing.lg,
        }}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      />

      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundDefault,
            paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg,
          },
          Platform.OS !== "web" ? animatedInputContainerStyle : undefined,
        ]}
      >
        <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask ZEKE anything..."
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={1000}
            returnKeyType="default"
            blurOnSubmit={false}
          />
          <View style={styles.inputButtons}>
            <VoiceInputButton
              onRecordingComplete={(audioUri, durationSeconds) => {
                console.log("Voice recording captured:", audioUri, `(${durationSeconds}s)`);
                setInputText(`Voice message (${durationSeconds}s) - tap send to transcribe`);
              }}
              disabled={isTyping}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim()}
              style={({ pressed }) => ({ opacity: pressed || !inputText.trim() ? 0.6 : 1 })}
            >
              <LinearGradient
                colors={inputText.trim() ? Gradients.primary : [theme.textSecondary, theme.textSecondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButton}
              >
                <Feather name="send" size={18} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  inputContainer: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: BorderRadius.lg,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: Platform.OS === "ios" ? Spacing.sm : 0,
  },
  inputButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

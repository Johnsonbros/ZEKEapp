import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Platform, KeyboardAvoidingView, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useMutation } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Gradients } from "@/constants/theme";
import { queryClient } from "@/lib/query-client";
import { sendSms } from "@/lib/zeke-api-adapter";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "SmsCompose">;

export default function SmsComposeScreen({ route, navigation }: Props) {
  const { contactId, phoneNumber, contactName } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    navigation.setOptions({
      headerTitle: contactName || phoneNumber || "New Message",
    });
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [navigation, contactName, phoneNumber]);

  const sendMutation = useMutation({
    mutationFn: async ({ contactId, message }: { contactId: string; message: string }) => {
      return sendSms(contactId, message);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/sms-log"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      Alert.alert("Sent", "Your message has been sent.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert("Failed to Send", error.message || "Please try again.");
    },
  });

  const handleSend = () => {
    if (!message.trim() || !contactId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMutation.mutate({ contactId, message: message.trim() });
  };

  const canSend = message.trim().length > 0 && contactId && !sendMutation.isPending;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={headerHeight}
      >
        <View style={[styles.content, { paddingTop: Spacing.lg }]}>
          <View style={[styles.recipientRow, { borderBottomColor: theme.border }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              To:
            </ThemedText>
            <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
              {contactName || phoneNumber || "Unknown"}
            </ThemedText>
          </View>

          <View style={styles.messageContainer}>
            <TextInput
              ref={inputRef}
              style={[
                styles.messageInput,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Type your message..."
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
              maxLength={1600}
            />

            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, textAlign: "right", marginTop: Spacing.xs }}
            >
              {message.length}/1600
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + Spacing.md,
              borderTopColor: theme.border,
            },
          ]}
        >
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendButton,
              !canSend && styles.sendButtonDisabled,
              pressed && canSend && { opacity: 0.8 },
            ]}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <LinearGradient
                colors={canSend ? Gradients.primary : ["#666", "#666"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendGradient}
              >
                <Feather name="send" size={20} color="#FFFFFF" />
                <ThemedText type="body" style={styles.sendText}>
                  Send Message
                </ThemedText>
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    marginBottom: Spacing.lg,
  },
  messageContainer: {
    flex: 1,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 150,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  sendButton: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  sendText: {
    color: "#FFFFFF",
  },
});

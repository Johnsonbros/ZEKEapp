import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Device from "expo-device";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Gradients, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

type PairingStep = "request" | "verify";

export function PairingScreen() {
  const insets = useSafeAreaInsets();
  const { requestSmsCode, verifySmsCode, isLoading, error } = useAuth();
  const [step, setStep] = useState<PairingStep>("request");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [code, setCode] = useState(["", "", "", ""]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const getDeviceName = (): string => {
    if (Platform.OS === "web") {
      return "Web Browser";
    }
    return Device.deviceName || Device.modelName || `${Platform.OS} Device`;
  };

  const handleRequestCode = async () => {
    setLocalError(null);
    const deviceName = getDeviceName();
    const result = await requestSmsCode(deviceName);
    if (result.success && result.sessionId) {
      setSessionId(result.sessionId);
      setExpiresIn(result.expiresIn || 300);
      setStep("verify");
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setLocalError(null);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((d) => d.length === 1)) {
      handleVerifyCode(newCode.join(""));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (codeString?: string) => {
    const finalCode = codeString || code.join("");
    if (finalCode.length !== 4) {
      setLocalError("Please enter the 4-digit code");
      return;
    }

    if (!sessionId) {
      setLocalError("Session expired. Please request a new code.");
      setStep("request");
      return;
    }

    setLocalError(null);
    const result = await verifySmsCode(sessionId, finalCode);
    if (!result.success) {
      setCode(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleBack = () => {
    setStep("request");
    setCode(["", "", "", ""]);
    setSessionId(null);
    setLocalError(null);
  };

  const displayError = localError || error;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["2xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={Gradients.primary}
            style={styles.iconContainer}
          >
            <Feather name="shield" size={48} color={Colors.dark.text} />
          </LinearGradient>

          <ThemedText style={styles.title}>ZEKE Command Center</ThemedText>
          <ThemedText style={styles.subtitle}>
            {step === "request" ? "Secure Device Pairing" : "Enter Verification Code"}
          </ThemedText>
        </View>

        {step === "request" ? (
          <View style={styles.form}>
            <ThemedText style={styles.label}>
              Tap below to receive a verification code via SMS
            </ThemedText>

            {displayError ? (
              <View style={styles.errorContainer}>
                <Feather
                  name="alert-circle"
                  size={16}
                  color={Colors.dark.error}
                />
                <ThemedText style={styles.errorText}>{displayError}</ThemedText>
              </View>
            ) : null}

            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRequestCode}
              disabled={isLoading}
            >
              <LinearGradient
                colors={Gradients.accent}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.dark.text} />
                ) : (
                  <>
                    <Feather name="smartphone" size={20} color={Colors.dark.text} />
                    <ThemedText style={styles.buttonText}>Send Code to Phone</ThemedText>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <ThemedText style={styles.label}>
              Enter the 4-digit code sent to your phone
            </ThemedText>

            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.codeInput,
                    digit ? styles.codeInputFilled : null,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(index, value)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(index, nativeEvent.key)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!isLoading}
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {expiresIn ? (
              <ThemedText style={styles.expiryText}>
                Code expires in {Math.floor(expiresIn / 60)} minutes
              </ThemedText>
            ) : null}

            {displayError ? (
              <View style={styles.errorContainer}>
                <Feather
                  name="alert-circle"
                  size={16}
                  color={Colors.dark.error}
                />
                <ThemedText style={styles.errorText}>{displayError}</ThemedText>
              </View>
            ) : null}

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.dark.accent} size="large" />
                <ThemedText style={styles.loadingText}>Verifying...</ThemedText>
              </View>
            ) : null}

            <Pressable
              style={styles.backButton}
              onPress={handleBack}
              disabled={isLoading}
            >
              <Feather name="arrow-left" size={16} color={Colors.dark.textSecondary} />
              <ThemedText style={styles.backButtonText}>Request new code</ThemedText>
            </Pressable>
          </View>
        )}

        <View style={styles.footer}>
          <Feather name="info" size={14} color={Colors.dark.textSecondary} />
          <ThemedText style={styles.footerText}>
            {step === "request"
              ? "A verification code will be sent to the master phone number. Enter it here to pair this device."
              : "Once verified, this device will have secure access to all ZEKE features."}
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  form: {
    marginBottom: Spacing["2xl"],
  },
  label: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  codeInput: {
    width: 56,
    height: 64,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.md,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: Colors.dark.text,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  codeInputFilled: {
    borderColor: Colors.dark.accent,
  },
  expiryText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
    color: Colors.dark.error,
  },
  loadingContainer: {
    alignItems: "center",
    gap: Spacing.sm,
    marginVertical: Spacing.lg,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  button: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  backButtonText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  footerText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});

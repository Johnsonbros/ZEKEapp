import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import { queryClient, isZekeSyncMode } from "@/lib/query-client";
import {
  getTodayEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  chatWithZeke,
  type ZekeEvent,
} from "@/lib/zeke-api-adapter";

const HOUR_HEIGHT = 60;
const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 23;

const EVENT_COLORS = [
  Colors.dark.primary,
  Colors.dark.secondary,
  Colors.dark.accent,
  Colors.dark.success,
  Colors.dark.warning,
];

function getEventColor(index: number): string {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateHeader(): string {
  const today = new Date();
  return today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getEventPosition(startTime: string): number {
  const date = new Date(startTime);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = (hours - TIMELINE_START_HOUR) * 60 + minutes;
  return (totalMinutes / 60) * HOUR_HEIGHT;
}

function getEventHeight(startTime: string, endTime?: string): number {
  if (!endTime) return HOUR_HEIGHT;
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  return Math.max((durationMinutes / 60) * HOUR_HEIGHT, 30);
}

function getCurrentTimePosition(): number {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  if (hours < TIMELINE_START_HOUR || hours > TIMELINE_END_HOUR) return -1;
  const totalMinutes = (hours - TIMELINE_START_HOUR) * 60 + minutes;
  return (totalMinutes / 60) * HOUR_HEIGHT;
}

interface EventCardProps {
  event: ZekeEvent;
  colorIndex: number;
  onDelete: (id: string) => void;
  theme: any;
}

function EventCard({ event, colorIndex, onDelete, theme }: EventCardProps) {
  const color = getEventColor(colorIndex);
  const top = getEventPosition(event.startTime);
  const height = getEventHeight(event.startTime, event.endTime);

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Event",
      `Remove "${event.title}" from your calendar?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(event.id),
        },
      ]
    );
  };

  return (
    <Pressable
      onLongPress={handleLongPress}
      style={[
        styles.eventCard,
        {
          top,
          height,
          backgroundColor: `${color}20`,
          borderLeftColor: color,
        },
      ]}
    >
      <View style={styles.eventContent}>
        <ThemedText style={[styles.eventTime, { color }]} numberOfLines={1}>
          {formatTime(event.startTime)}
          {event.endTime ? ` - ${formatTime(event.endTime)}` : ""}
        </ThemedText>
        <ThemedText style={styles.eventTitle} numberOfLines={2}>
          {event.title}
        </ThemedText>
        {event.location ? (
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color={theme.textSecondary} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginLeft: 4 }}
              numberOfLines={1}
            >
              {event.location}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const isSyncMode = isZekeSyncMode();

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventStartTime, setNewEventStartTime] = useState("");
  const [newEventEndTime, setNewEventEndTime] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  const {
    data: events = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<ZekeEvent[]>({
    queryKey: ["calendar-events-today"],
    queryFn: getTodayEvents,
    enabled: isSyncMode,
  });

  const addMutation = useMutation({
    mutationFn: (data: {
      title: string;
      startTime: string;
      endTime?: string;
      location?: string;
    }) =>
      createCalendarEvent(
        data.title,
        data.startTime,
        data.endTime,
        data.location
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events-today"] });
      setIsAddModalVisible(false);
      resetForm();
    },
    onError: () => {
      Alert.alert("Error", "Failed to add event. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events-today"] });
    },
    onError: () => {
      Alert.alert("Error", "Failed to delete event. Please try again.");
    },
  });

  const resetForm = () => {
    setNewEventTitle("");
    setNewEventStartTime("");
    setNewEventEndTime("");
    setNewEventLocation("");
  };

  const handleAddEvent = () => {
    if (!newEventTitle.trim()) {
      Alert.alert("Error", "Please enter an event title.");
      return;
    }
    if (!newEventStartTime.trim()) {
      Alert.alert("Error", "Please enter a start time (e.g., 2:00 PM).");
      return;
    }

    const today = new Date();
    const startTimeDate = parseTimeString(newEventStartTime, today);
    if (!startTimeDate) {
      Alert.alert("Error", "Invalid start time format. Use format like '2:00 PM' or '14:00'.");
      return;
    }

    let endTimeDate: Date | undefined;
    if (newEventEndTime.trim()) {
      const parsedEndTime = parseTimeString(newEventEndTime, today);
      if (!parsedEndTime) {
        Alert.alert("Error", "Invalid end time format. Use format like '3:00 PM' or '15:00'.");
        return;
      }
      endTimeDate = parsedEndTime;
    }

    addMutation.mutate({
      title: newEventTitle.trim(),
      startTime: startTimeDate.toISOString(),
      endTime: endTimeDate?.toISOString(),
      location: newEventLocation.trim() || undefined,
    });
  };

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const handleVoiceRecordingComplete = async (
    audioUri: string,
    durationSeconds: number
  ) => {
    setIsProcessingVoice(true);
    try {
      await chatWithZeke(
        "I just recorded a voice message to add an event to my calendar. Please help me create the event I mentioned.",
        "mobile-app"
      );
      await refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert(
        "Voice Input",
        "Voice input was recorded. To add events via voice, please use the Chat feature and say something like 'Add a meeting at 2pm tomorrow'."
      );
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [events]);

  const currentTimePosition = getCurrentTimePosition();

  const timelineHeight = (TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1) * HOUR_HEIGHT;

  if (!isSyncMode) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        <EmptyState
          icon="wifi-off"
          title="Connection Required"
          description="Calendar sync requires a connection to ZEKE. Please connect to ZEKE in Settings to access your calendar."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.headerControls,
          {
            paddingTop: headerHeight + Spacing.md,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <View style={styles.dateHeader}>
          <ThemedText type="h3" style={styles.dateText}>
            {formatDateHeader()}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {sortedEvents.length} event{sortedEvents.length !== 1 ? "s" : ""} today
          </ThemedText>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => setIsAddModalVisible(true)}
            style={[styles.addButton, { backgroundColor: Colors.dark.primary }]}
          >
            <Feather name="plus" size={20} color="#fff" />
            <ThemedText style={styles.addButtonText}>Add Event</ThemedText>
          </Pressable>
          <View style={styles.voiceContainer}>
            {isProcessingVoice ? (
              <ActivityIndicator color={Colors.dark.primary} />
            ) : (
              <VoiceInputButton
                onRecordingComplete={handleVoiceRecordingComplete}
                disabled={isProcessingVoice}
              />
            )}
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      ) : sortedEvents.length === 0 ? (
        <View
          style={[
            styles.emptyContainer,
            { paddingBottom: tabBarHeight + Spacing.xl },
          ]}
        >
          <EmptyState
            icon="calendar"
            title="No Events Today"
            description="Add events to your calendar using the button above or voice input."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: tabBarHeight + Spacing.xl,
          }}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={Colors.dark.primary}
            />
          }
        >
          <View style={[styles.timeline, { height: timelineHeight }]}>
            {Array.from(
              { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
              (_, i) => {
                const hour = TIMELINE_START_HOUR + i;
                const hourLabel =
                  hour === 0
                    ? "12 AM"
                    : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                    ? "12 PM"
                    : `${hour - 12} PM`;
                return (
                  <View
                    key={hour}
                    style={[styles.hourRow, { top: i * HOUR_HEIGHT }]}
                  >
                    <ThemedText
                      type="caption"
                      style={[styles.hourLabel, { color: theme.textSecondary }]}
                    >
                      {hourLabel}
                    </ThemedText>
                    <View
                      style={[
                        styles.hourLine,
                        { backgroundColor: theme.border },
                      ]}
                    />
                  </View>
                );
              }
            )}

            {currentTimePosition >= 0 ? (
              <View
                style={[styles.currentTimeIndicator, { top: currentTimePosition }]}
              >
                <View
                  style={[
                    styles.currentTimeDot,
                    { backgroundColor: Colors.dark.error },
                  ]}
                />
                <View
                  style={[
                    styles.currentTimeLine,
                    { backgroundColor: Colors.dark.error },
                  ]}
                />
              </View>
            ) : null}

            <View style={styles.eventsContainer}>
              {sortedEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  colorIndex={index}
                  onDelete={handleDelete}
                  theme={theme}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View
          style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setIsAddModalVisible(false)}>
              <ThemedText style={{ color: Colors.dark.primary }}>
                Cancel
              </ThemedText>
            </Pressable>
            <ThemedText type="h4">Add Event</ThemedText>
            <Pressable onPress={handleAddEvent} disabled={addMutation.isPending}>
              {addMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.dark.primary} />
              ) : (
                <ThemedText
                  style={{ color: Colors.dark.primary, fontWeight: "600" }}
                >
                  Add
                </ThemedText>
              )}
            </Pressable>
          </View>
          <KeyboardAwareScrollViewCompat>
            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>
                  Event Title *
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="e.g., Team Meeting"
                  placeholderTextColor={theme.textSecondary}
                  value={newEventTitle}
                  onChangeText={setNewEventTitle}
                  autoFocus
                />
              </View>
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText type="small" style={styles.inputLabel}>
                    Start Time *
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="e.g., 2:00 PM"
                    placeholderTextColor={theme.textSecondary}
                    value={newEventStartTime}
                    onChangeText={setNewEventStartTime}
                  />
                </View>
                <View style={{ width: Spacing.md }} />
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText type="small" style={styles.inputLabel}>
                    End Time
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="e.g., 3:00 PM"
                    placeholderTextColor={theme.textSecondary}
                    value={newEventEndTime}
                    onChangeText={setNewEventEndTime}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>
                  Location
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="e.g., Conference Room A"
                  placeholderTextColor={theme.textSecondary}
                  value={newEventLocation}
                  onChangeText={setNewEventLocation}
                />
              </View>
            </View>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </View>
  );
}

function parseTimeString(timeStr: string, baseDate: Date): Date | null {
  const cleaned = timeStr.trim().toLowerCase();
  
  const match12 = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const period = match12[3];
    
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    
    if (period === "am") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
    
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
  
  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
  
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerControls: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  dateHeader: {
    gap: Spacing.xs,
  },
  dateText: {
    color: Colors.dark.text,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  voiceContainer: {
    marginLeft: "auto",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  timeline: {
    position: "relative",
    marginLeft: Spacing.lg,
    marginRight: Spacing.lg,
  },
  hourRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hourLabel: {
    width: 50,
    fontSize: 11,
    marginTop: -6,
  },
  hourLine: {
    flex: 1,
    height: 1,
    marginLeft: Spacing.sm,
  },
  currentTimeIndicator: {
    position: "absolute",
    left: 48,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  currentTimeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
  },
  eventsContainer: {
    position: "absolute",
    left: 60,
    right: 0,
    top: 0,
    bottom: 0,
  },
  eventCard: {
    position: "absolute",
    left: 0,
    right: Spacing.sm,
    borderLeftWidth: 3,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    overflow: "hidden",
  },
  eventContent: {
    gap: 2,
  },
  eventTime: {
    fontSize: 11,
    fontWeight: "600",
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  inputLabel: {
    fontWeight: "500",
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: "row",
  },
});

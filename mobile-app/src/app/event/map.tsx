import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventMap } from "@/components/EventMap";
import { PressableScale } from "@/components/PressableScale";
import { api, qk } from "@/lib/api";
import { colors } from "@/theme/colors";
import { radius, shadow, spacing, typography } from "@/theme/typography";

/**
 * Full-screen map. With no params it shows every event; with `?id=<eventId>`
 * it focuses on a single venue (per AGENTS.md: "all events / single venue").
 */
export default function MapScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: qk.events,
    queryFn: api.getEvents,
  });

  const events = data ?? [];
  const shown = id ? events.filter((e) => e.id === id) : events;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <EventMap events={shown} onMarkerPress={(event) => router.push(`/event/${event.id}`)} />
      )}

      {/* Floating back button + title */}
      <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
        <PressableScale style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <View style={styles.titlePill}>
          <Ionicons name="location" size={15} color={colors.primary} />
          <Text style={styles.titleText}>
            {id ? "Venue" : `${shown.length} event${shown.length === 1 ? "" : "s"}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  titlePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  titleText: { ...typography.bodyStrong, color: colors.text },
});

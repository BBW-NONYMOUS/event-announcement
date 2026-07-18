// Web fallback for EventMap. react-native-maps has no web support, so on web
// we show the venue list instead of crashing. Metro resolves this file for
// web automatically (platform-specific extension).
import { ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/PressableScale";
import { colors } from "@/theme/colors";
import { radius, shadow, spacing, typography } from "@/theme/typography";
import { formatPrice } from "@/lib/format";
import type { EventItem } from "@/lib/api";

export type EventMapProps = {
  events: EventItem[];
  onMarkerPress?: (event: EventItem) => void;
  style?: ViewStyle | ViewStyle[];
};

export function EventMap({ events, onMarkerPress, style }: EventMapProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.notice}>
        <Ionicons name="map-outline" size={18} color={colors.primary} />
        <Text style={styles.noticeText}>
          Interactive map is available on the iOS/Android app. Venues are listed below.
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {events.map((event) => (
          <PressableScale
            key={event.id}
            style={styles.row}
            onPress={() => onMarkerPress?.(event)}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{formatPrice(event.price)}</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    margin: spacing.lg,
    borderRadius: radius.md,
  },
  noticeText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadow.soft,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { ...typography.small, color: colors.white },
  rowText: { flex: 1 },
  rowTitle: { ...typography.bodyStrong, color: colors.text },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});

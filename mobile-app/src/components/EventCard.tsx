// Image card for an event, with a gradient scrim and press animation.
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/PressableScale";
import { colors, gradients } from "@/theme/colors";
import { fill, radius, shadow, spacing, typography } from "@/theme/typography";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { EventItem } from "@/lib/api";

export function EventCard({
  event,
  onPress,
}: {
  event: EventItem;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.card} onPress={onPress}>
      <Image
        source={event.image ?? undefined}
        style={styles.image}
        contentFit="cover"
        transition={250}
      />
      <LinearGradient colors={gradients.card} style={styles.scrim} />

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{formatPrice(event.price)}</Text>
      </View>

      {event.isFeatured && (
        <View style={styles.featured}>
          <Ionicons name="star" size={11} color={colors.primaryDark} />
          <Text style={styles.featuredText}>FEATURED</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.category}>{event.category.toUpperCase()}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.white} />
          <Text style={styles.meta} numberOfLines={1}>
            {formatDateTime(event.date)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.white} />
          <Text style={styles.meta} numberOfLines={1}>
            {event.location}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 230,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  image: { ...fill },
  scrim: { ...fill },
  badge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  badgeText: { ...typography.caption, color: colors.primaryDark },
  // Top-left, opposite the price badge, so the two never collide.
  featured: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  featuredText: { ...typography.small, color: colors.primaryDark },
  content: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: 4,
  },
  category: {
    ...typography.small,
    color: colors.primaryLight,
    marginBottom: 2,
  },
  title: { ...typography.h2, color: colors.white },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { ...typography.caption, color: "rgba(255,255,255,0.9)", flexShrink: 1 },
});

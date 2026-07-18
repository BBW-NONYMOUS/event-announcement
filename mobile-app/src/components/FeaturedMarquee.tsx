// Scrolling one-line highlight strip listing the featured events.
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MarqueeText from "react-native-marquee";
import { colors } from "@/theme/colors";
import { radius, spacing, typography } from "@/theme/typography";
import type { EventItem } from "@/lib/api";

/** " ★ A  ★ B " — one line, so the strip reads as a single ticker. */
const toTicker = (events: EventItem[]) =>
  events.map((event) => `★  ${event.title}`).join("     ");

export function FeaturedMarquee({ events }: { events: EventItem[] }) {
  if (events.length === 0) return null;

  return (
    <View style={styles.strip}>
      <Ionicons name="megaphone" size={14} color={colors.primaryDark} style={styles.icon} />
      <MarqueeText
        style={styles.text}
        speed={0.3}
        marqueeOnStart
        loop
        delay={600}
        consecutive
      >
        {toTicker(events)}
      </MarqueeText>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  icon: { opacity: 0.9 },
  text: { ...typography.caption, color: colors.primaryDark, flex: 1 },
});

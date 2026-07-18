// Scrolling one-line highlight strip listing the featured events.
//
// Built on Reanimated rather than a marquee package: the animation runs on the
// UI thread, so it keeps scrolling smoothly while the list below is fetching or
// being scrolled. It also avoids the legacy `NativeModules.UIManager` measuring
// that older marquee libraries rely on, which is not the UIManager the New
// Architecture routes through.
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/theme/colors";
import { radius, spacing, typography } from "@/theme/typography";
import type { EventItem } from "@/lib/api";

/** Slow enough to read a title as it passes. */
const PIXELS_PER_SECOND = 45;

/** Space between the end of one pass and the start of the next. */
const GAP = 40;

/** " ★  A     ★  B " — one line, so the strip reads as a single ticker. */
const toTicker = (events: EventItem[]) =>
  events.map((event) => `★  ${event.title}`).join("     ");

export function FeaturedMarquee({ events }: { events: EventItem[] }) {
  // Width of one copy of the ticker. 0 until the first layout pass.
  const [contentWidth, setContentWidth] = useState(0);
  const offset = useSharedValue(0);

  // Respect the OS "reduce motion" switch: continuously moving text is exactly
  // the vestibular trigger that setting exists to turn off.
  const reducedMotion = useReducedMotion();

  const label = toTicker(events);

  useEffect(() => {
    if (contentWidth === 0 || reducedMotion) return;

    // The second copy sits one (width + gap) to the right, so travelling
    // exactly that far leaves it where the first copy began — the seam lands
    // off-screen and the loop reads as continuous.
    const distance = contentWidth + GAP;

    // .set()/.get() rather than .value, so the React Compiler (enabled in
    // app.json) does not treat the shared value as a mutated binding.
    offset.set(0);
    offset.set(
      withRepeat(
        withTiming(-distance, {
          duration: (distance / PIXELS_PER_SECOND) * 1000,
          easing: Easing.linear,
        }),
        -1, // forever
        false // restart rather than reverse: a bouncing ticker looks broken
      )
    );

    // Without this a re-render would stack a second animation on the same
    // value, and the strip would speed up every time the events refetch.
    return () => cancelAnimation(offset);
  }, [contentWidth, reducedMotion, offset, label]);

  const track = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));

  if (events.length === 0) return null;

  // Reduced motion still gets the information, just held still.
  if (reducedMotion) {
    return (
      <View style={styles.strip}>
        <Ionicons name="megaphone" size={14} color={colors.primaryDark} />
        <Text style={styles.text} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.strip}>
      <Ionicons name="megaphone" size={14} color={colors.primaryDark} />
      {/* Clips the track; the two copies inside are wider than this box. */}
      <View style={styles.viewport}>
        <Animated.View style={[styles.track, track]}>
          <Text
            style={styles.text}
            numberOfLines={1}
            onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
          >
            {label}
          </Text>
          {/* The trailing copy is what makes the wrap seamless. It repeats the
              visible text, so it is hidden from screen readers. */}
          <Text
            style={[styles.text, { marginLeft: GAP }]}
            numberOfLines={1}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {label}
          </Text>
        </Animated.View>
      </View>
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
  viewport: { flex: 1, overflow: "hidden" },
  track: { flexDirection: "row" },
  text: { ...typography.caption, color: colors.primaryDark },
});

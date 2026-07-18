// Shimmering placeholder shown while events load (TanStack Query loading state).
import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/theme/colors";
import { fill, radius, spacing } from "@/theme/typography";

function Shimmer({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.block, style, animatedStyle]} />;
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Shimmer style={styles.image} />
      <View style={styles.footer}>
        <Shimmer style={styles.lineShort} />
        <Shimmer style={styles.lineWide} />
        <Shimmer style={styles.lineMed} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 230,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
    justifyContent: "flex-end",
  },
  block: { backgroundColor: colors.skeleton, borderRadius: radius.sm },
  image: { ...fill, borderRadius: 0 },
  footer: { padding: spacing.lg, gap: spacing.sm },
  lineShort: { width: "30%", height: 12 },
  lineWide: { width: "80%", height: 18 },
  lineMed: { width: "55%", height: 12 },
});

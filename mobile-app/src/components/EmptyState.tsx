import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { radius, spacing, typography } from "@/theme/typography";

export function EmptyState({
  icon,
  title,
  message,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: spacing.xxl * 2, paddingHorizontal: spacing.xl },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { ...typography.h2, color: colors.text, textAlign: "center" },
  message: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 6,
  },
  actions: { marginTop: spacing.xl, alignSelf: "stretch" },
});

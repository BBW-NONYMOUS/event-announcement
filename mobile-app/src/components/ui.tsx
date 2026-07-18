// Small shared UI primitives: gradient primary button and labeled text field.
import { forwardRef } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/PressableScale";
import { colors, gradients } from "@/theme/colors";
import { radius, shadow, spacing, typography } from "@/theme/typography";

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const isOff = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={isOff}
      style={[styles.btnWrap, isOff && styles.btnOff]}
    >
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btn}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={18} color={colors.white} /> : null}
            <Text style={styles.btnText}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

export const Field = forwardRef<TextInput, TextInputProps & { label: string; icon?: keyof typeof Ionicons.glyphMap }>(
  ({ label, icon, style, ...rest }, ref) => {
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.inputRow}>
          {icon ? (
            <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.inputIcon} />
          ) : null}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, style]}
            {...rest}
          />
        </View>
      </View>
    );
  }
);
Field.displayName = "Field";

const styles = StyleSheet.create({
  btnWrap: { borderRadius: radius.lg, ...shadow.soft },
  btnOff: { opacity: 0.6 },
  btn: {
    height: 54,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  btnText: { ...typography.h3, color: colors.white },

  field: { gap: 6 },
  fieldLabel: { ...typography.caption, color: colors.textMuted, marginLeft: 2 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    height: 50,
    ...typography.body,
    color: colors.text,
  },
});

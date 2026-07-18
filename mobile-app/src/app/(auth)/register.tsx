import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Field, PrimaryButton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors, gradients } from "@/theme/colors";
import { radius, spacing, typography } from "@/theme/typography";

export default function Register() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await register(name, email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient colors={gradients.violet} style={styles.logo}>
          <Ionicons name="person-add-outline" size={28} color={colors.white} />
        </LinearGradient>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join and start collecting tickets</Text>

        <View style={styles.form}>
          <Field
            label="Full name"
            icon="person-outline"
            placeholder="Jane Doe"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />
          <Field
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Password"
            icon="lock-closed-outline"
            placeholder="At least 6 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton label="Create account" onPress={onSubmit} loading={loading} icon="checkmark-outline" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, flexGrow: 1 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: 6 },
  form: { marginTop: spacing.xl, gap: spacing.lg },
  error: { ...typography.caption, color: colors.danger, marginLeft: 2 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  footerText: { ...typography.body, color: colors.textMuted },
  link: { ...typography.bodyStrong, color: colors.primary },
});

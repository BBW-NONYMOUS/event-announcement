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

export default function Login() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
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
        // Combined your insets padding with the centering layout
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* We wrap the content inside a full-width container to center its internal items */}
        <View style={styles.innerContainer}>
          <LinearGradient colors={gradients.primary} style={styles.logo}>
            <Ionicons name="ticket-outline" size={30} color={colors.white} />
          </LinearGradient>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to discover events near you</Text>

          <View style={styles.form}>
            <Field
              label="Email"
              icon="mail-outline"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <Field
              label="Password"
              icon="lock-closed-outline"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton label="Sign in" onPress={onSubmit} loading={loading} icon="log-in-outline" />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/register" style={styles.link}>
              Create one
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { 
    padding: spacing.xl, 
    flexGrow: 1,
    justifyContent: "center", // Vertically centers the innerContainer inside the ScrollView
  },
  innerContainer: {
    width: "100%", // Ensures the content stretches correctly on the horizontal axis
  },
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
  form: { marginTop: spacing.xxl, gap: spacing.lg, width: "100%" },
  error: { ...typography.caption, color: colors.danger, marginLeft: 2 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  footerText: { ...typography.body, color: colors.textMuted },
  link: { ...typography.bodyStrong, color: colors.primary },
});
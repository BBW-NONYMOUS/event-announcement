import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/ui";
import { PressableScale } from "@/components/PressableScale";
import { api, qk } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, gradients } from "@/theme/colors";
import { fill, radius, shadow, spacing, typography } from "@/theme/typography";
import { formatDate, formatPrice, formatTime } from "@/lib/format";

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [banner, setBanner] = useState<string | null>(null);

  const { data: event, isLoading } = useQuery({
    queryKey: qk.event(id),
    queryFn: () => api.getEvent(id),
    enabled: !!id,
  });

  const { data: alreadyHas } = useQuery({
    queryKey: qk.hasTicket(id),
    queryFn: () => api.hasTicket(id),
    enabled: !!id,
  });

  const register = useMutation({
    mutationFn: () => api.registerForEvent(id, user?.name ?? "You"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.tickets });
      queryClient.invalidateQueries({ queryKey: qk.hasTicket(id) });
      // This registration changed the headcount: refresh the detail's
      // "N going" and the list's counts, which would otherwise stay stale
      // until a manual pull-to-refresh.
      queryClient.invalidateQueries({ queryKey: qk.event(id) });
      queryClient.invalidateQueries({ queryKey: qk.events });
      setBanner(null);
      router.push("/(tabs)/tickets");
    },
    onError: (e) => setBanner(e instanceof Error ? e.message : "Registration failed."),
  });

  if (isLoading || !event) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const registered = alreadyHas || register.isSuccess;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            source={event.image ?? undefined}
            style={styles.heroImg}
            contentFit="cover"
            transition={250}
          />
          <LinearGradient colors={gradients.card} style={styles.heroScrim} />
          <PressableScale
            style={[styles.backBtn, { top: insets.top + spacing.sm }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </PressableScale>
          <View style={styles.heroContent}>
            <Text style={styles.category}>{event.category.toUpperCase()}</Text>
            <Text style={styles.title}>{event.title}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.infoRow}>
            <InfoPill icon="calendar-outline" label={formatDate(event.date)} />
            <InfoPill icon="time-outline" label={formatTime(event.date)} />
            <InfoPill icon="people-outline" label={`${event.attendees} going`} />
          </View>

          <PressableScale
            style={styles.locationCard}
            onPress={() => router.push(`/event/map?id=${event.id}`)}
          >
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={styles.locationText}>{event.location}</Text>
            <View style={styles.mapLink}>
              <Ionicons name="map-outline" size={16} color={colors.primary} />
              <Text style={styles.mapLinkText}>Map</Text>
            </View>
          </PressableScale>

          <Text style={styles.sectionTitle}>About this event</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>
      </ScrollView>

      {/* Sticky footer with price + register */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.price}>{formatPrice(event.price)}</Text>
        </View>
        <View style={styles.footerBtn}>
          {registered ? (
            <View style={styles.registeredPill}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.registeredText}>Registered</Text>
            </View>
          ) : (
            <PrimaryButton
              label="Register"
              icon="ticket-outline"
              loading={register.isPending}
              onPress={() => register.mutate()}
            />
          )}
        </View>
      </View>

      {banner ? (
        <View style={[styles.banner, { bottom: insets.bottom + 96 }]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.white} />
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      ) : null}
    </View>
  );
}

function InfoPill({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 120 },

  hero: { height: 320, justifyContent: "flex-end" },
  heroImg: { ...fill },
  heroScrim: { ...fill },
  backBtn: {
    position: "absolute",
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: { padding: spacing.xl, gap: 4 },
  category: { ...typography.small, color: colors.primaryLight },
  title: { ...typography.display, color: colors.white },

  body: { padding: spacing.xl, gap: spacing.lg },
  infoRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...shadow.soft,
  },
  pillText: { ...typography.caption, color: colors.text },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadow.soft,
  },
  locationText: { ...typography.bodyStrong, color: colors.text, flex: 1 },
  mapLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  mapLinkText: { ...typography.caption, color: colors.primary },
  sectionTitle: { ...typography.h2, color: colors.text, marginTop: spacing.sm },
  description: { ...typography.body, color: colors.textMuted, lineHeight: 23 },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.lg,
  },
  priceLabel: { ...typography.small, color: colors.textMuted },
  price: { ...typography.h1, color: colors.text },
  footerBtn: { flex: 1 },
  registeredPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: "rgba(22,163,74,0.12)",
  },
  registeredText: { ...typography.h3, color: colors.success },

  banner: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.danger,
    padding: spacing.md,
    borderRadius: radius.md,
    ...shadow.card,
  },
  bannerText: { ...typography.caption, color: colors.white, flex: 1 },
});

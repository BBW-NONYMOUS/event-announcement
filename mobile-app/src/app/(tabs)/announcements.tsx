import { useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/EmptyState";
import { api, qk, type Announcement } from "@/lib/api";
import { colors } from "@/theme/colors";
import { radius, shadow, spacing, typography } from "@/theme/typography";
import { timeAgo } from "@/lib/format";

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: qk.announcements,
    queryFn: api.getAnnouncements,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList<Announcement>
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <ScreenHeader title="Announcements" subtitle="Latest updates from organizers" />
          }
          ListEmptyComponent={
            <EmptyState icon="megaphone-outline" title="Nothing new" message="Pull to refresh for updates." />
          }
          renderItem={({ item }) => <AnnouncementCard item={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

function AnnouncementCard({ item }: { item: Announcement }) {
  return (
    <View style={[styles.card, item.pinned && styles.cardPinned]}>
      <View style={styles.cardHead}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={item.pinned ? "pin" : "megaphone-outline"}
            size={16}
            color={item.pinned ? colors.warning : colors.primary}
          />
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      <Text style={styles.cardBody}>{item.body}</Text>
      <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  cardPinned: { borderWidth: 1, borderColor: "rgba(245,158,11,0.35)" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { ...typography.h3, color: colors.text, flex: 1 },
  cardBody: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 21 },
  time: { ...typography.small, color: colors.textMuted, marginTop: spacing.md },
});

import { useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventCard } from "@/components/EventCard";
import { FeaturedMarquee } from "@/components/FeaturedMarquee";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/EmptyState";
import { PressableScale } from "@/components/PressableScale";
import { Stagger } from "@/components/Stagger";
import { api, qk, type EventItem } from "@/lib/api";
import { colors } from "@/theme/colors";
import { radius, shadow, spacing } from "@/theme/typography";

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: qk.events,
    queryFn: api.getEvents,
  });

  // Display settings only. A failure here must not cost the user the events
  // list, so the marquee simply stays hidden until this resolves.
  const { data: settings } = useQuery({
    queryKey: qk.settings,
    queryFn: api.getSettings,
    staleTime: 5 * 60 * 1000,
  });

  // The backend already sorts featured-first, so this is a prefix of the list —
  // the strip advertises the same cards the user is about to scroll past.
  const featured = useMemo(
    () => (data ?? []).filter((event) => event.isFeatured),
    [data]
  );
  const showMarquee = settings?.showFeaturedMarquee !== false && featured.length > 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      {isLoading ? (
        <View style={styles.padded}>
          <ScreenHeader title="Discover" subtitle="Loading events…" />
          {[0, 1].map((k) => (
            <SkeletonCard key={k} />
          ))}
        </View>
      ) : (
        <FlatList<EventItem>
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <ScreenHeader
                title="Discover"
                subtitle={`${data?.length ?? 0} events happening soon`}
                right={
                  <PressableScale style={styles.mapBtn} onPress={() => router.push("/event/map")}>
                    <Ionicons name="map-outline" size={22} color={colors.primary} />
                  </PressableScale>
                }
              />
              {showMarquee && <FeaturedMarquee events={featured} />}
            </>
          }
          ListEmptyComponent={
            <EmptyState
              icon={isError ? "cloud-offline-outline" : "calendar-outline"}
              title={isError ? "Couldn't load events" : "No events yet"}
              message={
                isError
                  ? "Pull down to try again."
                  : "Check back soon for upcoming events."
              }
            />
          }
          renderItem={({ item, index }) => (
            <Stagger index={index}>
              <EventCard event={item} onPress={() => router.push(`/event/${item.id}`)} />
            </Stagger>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  mapBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
});

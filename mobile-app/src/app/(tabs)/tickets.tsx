import { useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TicketQR } from "@/components/TicketQR";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/ui";
import { api, qk, type Ticket } from "@/lib/api";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/typography";

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: qk.tickets,
    queryFn: api.getTickets,
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
        <FlatList<Ticket>
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <ScreenHeader
              title="My Tickets"
              subtitle={`${data?.length ?? 0} boarding pass${(data?.length ?? 0) === 1 ? "" : "es"}`}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="ticket-outline"
              title="No tickets yet"
              message="Register for an event and your ticket will show up here."
            >
              <PrimaryButton
                label="Browse events"
                icon="compass-outline"
                onPress={() => router.push("/(tabs)")}
              />
            </EmptyState>
          }
          renderItem={({ item }) => <TicketQR ticket={item} />}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
});

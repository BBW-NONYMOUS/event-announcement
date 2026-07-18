// Boarding-pass style ticket that renders the ticket code as a QR.
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { colors, gradients } from "@/theme/colors";
import { fill, radius, shadow, spacing, typography } from "@/theme/typography";
import { formatDate, formatTime } from "@/lib/format";
import type { Ticket } from "@/lib/api";

export function TicketQR({ ticket }: { ticket: Ticket }) {
  return (
    <View style={styles.wrapper}>
      {/* Top: event visual + title */}
      <View style={styles.header}>
        <Image source={ticket.eventImage ?? undefined} style={styles.headerImg} contentFit="cover" />
        <LinearGradient colors={gradients.primary} style={styles.headerScrim} />
        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={2}>
            {ticket.eventTitle}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={colors.white} />
            <Text style={styles.metaLight} numberOfLines={1}>
              {ticket.location}
            </Text>
          </View>
        </View>
      </View>

      {/* Perforation / notch row */}
      <View style={styles.notchRow}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.dashed} />
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      {/* Bottom: details + QR */}
      <View style={styles.body}>
        <View style={styles.details}>
          <Detail label="DATE" value={formatDate(ticket.date)} />
          <Detail label="TIME" value={formatTime(ticket.date)} />
          <Detail label="SEAT" value={ticket.seat} />
          <Detail label="HOLDER" value={ticket.holder} />
        </View>
        <View style={styles.qrBox}>
          <QRCode value={ticket.code} size={92} backgroundColor="transparent" />
          <Text style={styles.code}>{ticket.code}</Text>
        </View>
      </View>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const NOTCH = 22;

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    overflow: "hidden",
    ...shadow.card,
  },
  header: { height: 132, justifyContent: "flex-end" },
  headerImg: { ...fill },
  headerScrim: { ...fill, opacity: 0.78 },
  headerContent: { padding: spacing.lg, gap: 4 },
  title: { ...typography.h2, color: colors.white },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaLight: { ...typography.caption, color: "rgba(255,255,255,0.9)", flexShrink: 1 },

  notchRow: { flexDirection: "row", alignItems: "center", height: 0 },
  notch: {
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: colors.background,
  },
  notchLeft: { marginLeft: -NOTCH / 2 },
  notchRight: { marginRight: -NOTCH / 2 },
  dashed: {
    flex: 1,
    borderBottomWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    marginHorizontal: spacing.sm,
  },

  body: {
    flexDirection: "row",
    padding: spacing.lg,
    gap: spacing.lg,
    alignItems: "center",
  },
  details: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  detail: { width: "44%" },
  detailLabel: { ...typography.small, color: colors.textMuted },
  detailValue: { ...typography.bodyStrong, color: colors.text, marginTop: 2 },
  qrBox: { alignItems: "center", gap: 6 },
  code: { ...typography.small, color: colors.textMuted },
});

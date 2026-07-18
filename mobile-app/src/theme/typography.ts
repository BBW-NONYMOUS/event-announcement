// Typography, spacing and radius scales (theme layer, per AGENTS.md).
import type { TextStyle } from "react-native";

export const typography = {
  display: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: "700", letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: "700" },
  h3: { fontSize: 17, fontWeight: "600" },
  body: { fontSize: 15, fontWeight: "400" },
  bodyStrong: { fontSize: 15, fontWeight: "600" },
  caption: { fontSize: 13, fontWeight: "500" },
  small: { fontSize: 11, fontWeight: "600", letterSpacing: 0.4 },
} satisfies Record<string, TextStyle>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Absolute-fill helper (typed object; RN's StyleSheet.absoluteFillObject is
// not present in this version's type defs).
export const fill = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

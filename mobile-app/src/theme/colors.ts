// Central color palette for the app (theme layer, per AGENTS.md).
// Primary hue is derived from the splash color (#208AEF).

export const colors = {
  primary: "#208AEF",
  primaryDark: "#1B6FD0",
  primaryLight: "#5CB0FF",

  accent: "#7C5CFF",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#EF4444",

  background: "#F4F7FB",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF3FA",

  text: "#0F172A",
  textMuted: "#64748B",
  textInverse: "#FFFFFF",

  border: "#E2E8F0",
  skeleton: "#E6EBF2",
  skeletonHighlight: "#F2F6FB",

  overlay: "rgba(15,23,42,0.45)",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const gradients = {
  primary: ["#208AEF", "#4C6FFF"] as const,
  violet: ["#7C5CFF", "#4C6FFF"] as const,
  sunset: ["#FF7E5F", "#FEB47B"] as const,
  card: ["rgba(15,23,42,0)", "rgba(15,23,42,0.75)"] as const,
};

export type AppColors = typeof colors;

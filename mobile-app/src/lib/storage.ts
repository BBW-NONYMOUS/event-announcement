// Session storage primitives (per AGENTS.md: JWT in expo-secure-store).
//
// Lives in its own module so lib/api.ts can read the token for the auth header
// without importing lib/auth.tsx, which imports lib/api.ts in turn.
//
// SecureStore is unavailable on web, so we fall back to localStorage there to
// keep the app runnable in the browser during development.

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const TOKEN_KEY = "auth_token";
export const USER_KEY = "auth_user";

export type StoredUser = { id: string; name: string; email: string };

export async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

export async function deleteItem(key: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveToken(token: string) {
  await setItem(TOKEN_KEY, token);
}

/** Drop the stored session. Safe to call when nothing is stored. */
export async function clearSession() {
  await Promise.all([deleteItem(TOKEN_KEY), deleteItem(USER_KEY)]);
}

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

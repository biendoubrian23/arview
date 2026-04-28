// Helpers généraux
import { customAlphabet } from "nanoid/non-secure";

// Slug court (URL publique : /m/xxxxxx)
export const newSlug = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  10
);

export function detectDevice(ua: string): "ios" | "android" | "desktop" | "other" {
  if (!ua) return "other";
  const u = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(u)) return "ios";
  if (/android/.test(u)) return "android";
  if (/windows|mac|linux/.test(u)) return "desktop";
  return "other";
}

export function formatDuration(ms?: number | null) {
  if (!ms || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export function formatNumber(n: number | null | undefined) {
  if (n == null) return "0";
  return new Intl.NumberFormat("fr-FR").format(n);
}

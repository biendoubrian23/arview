import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Fusionne des classes Tailwind sans conflits */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formate un nombre avec séparateurs (ex: 3847 → "3 847") */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

/** Tronque un texte à une longueur max */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

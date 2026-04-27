import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScanAR — Visualisez vos objets en 3D et AR",
  description:
    "Scannez n'importe quel objet, partagez un lien, visualisez en AR depuis le navigateur. Sans app.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Préstamos Web | Sistema de gestión",
  description: "Sistema seguro de gestión de préstamos",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

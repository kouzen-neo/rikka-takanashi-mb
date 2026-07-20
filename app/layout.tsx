import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rikka Takanashi — AI Chat",
  description: "Chat with Rikka Takanashi, the Chuunibyou tyrant.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b0a10",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <div className="aurora" aria-hidden />
        <div id="app-shell">{children}</div>
      </body>
    </html>
  );
}

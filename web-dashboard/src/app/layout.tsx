import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ironmon Tracker Dashboard",
  description: "Real-time Pokemon Platinum Soul Link Nuzlocke Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-mono">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mannargudi Election Quiz",
  description: "Single-page quiz app for Mannargudi Assembly Constituency 167."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

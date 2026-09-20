import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NightScene from "./night-scene";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Starfall — Multiplayer Typing Race",
  description: "Race friends in real-time typing battles under a night sky. Sharpen your speed and accuracy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-[var(--ink)] antialiased">
        <NightScene />
        <div className="relative z-0 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}

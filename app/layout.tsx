import type { Metadata } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond, Josefin_Sans, Great_Vibes } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Elegant serif for archival titles and pull-quotes
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

// Clean sans-serif for labels, body text, and UI
const josefin = Josefin_Sans({
  variable: "--font-josefin-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "600", "700"],
});

// Connected script for large cinematic section titles.
// TO REPLACE: swap Great_Vibes below with the correct Google Font import,
// keep variable: "--font-great-vibes" the same so nothing else needs to change.
const scriptFont = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Maison Obscura",
  description:
    "An immersive archival scrollytelling story from Newark, New Jersey, 1957.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${josefin.variable} ${scriptFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-neutral-100">
        {children}
      </body>
    </html>
  );
}

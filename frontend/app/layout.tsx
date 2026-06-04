import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://contactzen.io"),
  title: "ContactZen — Contact Data Intelligence Platform",
  description:
    "Identify decayed contacts, quantify GTM waste, and prevent bad data from entering your CRM.",
  openGraph: {
    title: "ContactZen — Contact Data Intelligence Platform",
    description:
      "Valid doesn't mean reachable. See what's actually usable in your CRM.",
    url: "https://contactzen.io",
    siteName: "ContactZen",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ContactZen — Valid doesn't mean reachable.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ContactZen — Contact Data Intelligence Platform",
    description: "Valid doesn't mean reachable.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7C3AED",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-white`}>{children}</body>
    </html>
  );
}

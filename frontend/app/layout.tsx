import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://reachaudit.com"),
  title: "ReachAudit | Know who to call, and that you're safe to",
  description:
    "Drop in the leads you bought and get a free reachability score. We keep your list cleaned, checked against the Do Not Call list, and ranked by who to call first. Every month.",
  openGraph: {
    title: "ReachAudit | Know who to call, and that you're safe to",
    description:
      "A free score of how many of your leads you can actually reach, plus a clean, compliant, ranked list kept current every month.",
    url: "https://reachaudit.com",
    siteName: "ReachAudit",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReachAudit | Know who to call, and that you're safe to",
    description: "A free reachability score, then a clean, compliant, ranked list kept current every month.",
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

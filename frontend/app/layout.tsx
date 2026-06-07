import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://reachaudit.com"),
  title: "ReachAudit — Independent Reachability Audits for B2B Sales",
  description:
    "Find the unreachable contacts costing your sales team revenue. Independent audit of your list — what's reachable, what's wasted, what to recover.",
  openGraph: {
    title: "ReachAudit — Independent Reachability Audits for B2B Sales",
    description:
      "Valid doesn't mean reachable. See what's actually usable in your CRM.",
    url: "https://reachaudit.com",
    siteName: "ReachAudit",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReachAudit — Independent Reachability Audits for B2B Sales",
    description: "Valid doesn't mean reachable.",
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

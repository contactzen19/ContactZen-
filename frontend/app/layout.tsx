import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://reachaudit.com"),
  title: "ReachAudit | Valid doesn't mean reachable",
  description:
    "Your lead vendor says the contact is valid. We show you who you can actually reach. Free reachability score, then a clean, compliant, ranked list your team can work.",
  openGraph: {
    title: "ReachAudit | Valid doesn't mean reachable",
    description:
      "A free score of how many of your leads you can actually reach, plus a clean, compliant, ranked list kept current every month.",
    url: "https://reachaudit.com",
    siteName: "ReachAudit",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReachAudit | Valid doesn't mean reachable",
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

import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://legalease.pk";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LegalEase — Understand the law. Find the right lawyer.",
    template: "%s — LegalEase",
  },
  description:
    "LegalEase connects citizens with verified lawyers, plain-language legal guidance, and an AI assistant that explains rights under Pakistan Code & Sindh Code — so you can act with confidence.",
  keywords: [
    "find a lawyer pakistan",
    "karachi lawyer",
    "pakistan legal assistant",
    "sindh code",
    "legal resources karachi",
    "lawyer directory pakistan",
    "legal notice generator",
    "fbr filer status",
  ],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_PK",
    siteName: "LegalEase",
    title: "LegalEase — Understand the law. Find the right lawyer.",
    description:
      "Verified Pakistani lawyers, plain-language guidance, and an AI legal intelligence assistant built to demystify the law.",
    images: [{ url: "/favicon.png", width: 512, height: 512, alt: "LegalEase" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
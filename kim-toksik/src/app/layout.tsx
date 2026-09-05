import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.SITE_URL ?? "https://kim-toksik.onrender.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "kim toksik — whatsapp toksiklik testi",
    template: "%s | kim toksik",
  },
  description:
    "WhatsApp sohbetini yükle, kim toksik öğren. Yapay zeka ile ücretsiz toksiklik testi: toksiklik skoru, red flagler, kim kimi darlıyor, kim haklı — hepsi ortaya çıkacak.",
  keywords: [
    "kim toksik",
    "toksik testi",
    "toksiklik testi",
    "whatsapp toksiklik testi",
    "whatsapp ilişki analizi",
    "red flag testi",
    "toksik ilişki testi",
    "ilişki analizi",
    "whatsapp analiz",
    "kim kimi darlıyor",
  ],
  authors: [{ name: "kim toksik" }],
  creator: "kim toksik",
  category: "technology",
  applicationName: "kim toksik",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: "kim toksik",
    title: "kim toksik — whatsapp toksiklik testi",
    description:
      "WhatsApp sohbetini yükle, kim toksik öğren. Toksiklik skoru, red flagler, kim kimi darlıyor — yapay zeka ile ücretsiz analiz.",
  },
  twitter: {
    card: "summary_large_image",
    title: "kim toksik — whatsapp toksiklik testi",
    description:
      "WhatsApp sohbetini yükle, kim toksik öğren. Toksiklik skoru, red flagler, kim kimi darlıyor.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0c0c",
  colorScheme: "dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "kim toksik",
  url: siteUrl,
  description:
    "WhatsApp sohbetini yükle, kim toksik öğren. Yapay zeka ile ücretsiz toksiklik testi ve ilişki analizi.",
  inLanguage: "tr-TR",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
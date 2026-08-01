import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });


export const metadata = {
  title: 'UNSILENT - Find Your Voice. Share Your Wisdom',
  description: 'Daily AI-powered English writing and speaking practice, powered by Wisdom Corner.',
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  themeColor: '#7C3AED',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} ${mono.variable} h-full antialiased`}
    >
        <body className={`${outfit.variable} ${inter.variable} ${mono.variable} font-sans antialiased`}>
          {children}
        </body>
    </html>
  );
}

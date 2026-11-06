import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notes by Winner",
  description: "A minimal, distraction-free note-taking workspace for Web and Android.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=window.location.hash;if(h&&h.indexOf('access_token=')!==-1&&h.indexOf('state=')!==-1){var p=new URLSearchParams(h.slice(1));var t=p.get('access_token');var s=p.get('state');if(t&&s&&(s.indexOf('exp://')===0||s.indexOf('notesbywinner://')===0)){var sep=s.indexOf('?')===-1?'?':'&';var u=s+sep+'google_access_token='+encodeURIComponent(t);window.__MOBILE_AUTH_REDIRECT__=u;window.location.replace(u);}}}catch(e){}})();`,
          }}
        />
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

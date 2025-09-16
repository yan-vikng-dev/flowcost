import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Toaster } from "@/components/ui/sonner";
import { TopologyBackground } from "@/components/ui/topology-background";
import Script from "next/script";
import ConsentManager from "@/components/consent-manager";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Flowcost - Expense Tracker",
  description: "Track expenses across currencies for digital nomads",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
if (!GOOGLE_ADS_ID) throw new Error("GOOGLE_ADS_ID is not set");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          id="gtag-consent-default"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);} 
              // Advanced Consent Mode defaults (v2) and recommended settings
              gtag('consent', 'default', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: 'denied',
                wait_for_update: 500
              });
              // Recommended settings per Google docs
              gtag('set', 'url_passthrough', true);
              gtag('set', 'ads_data_redaction', true);
              gtag('js', new Date());
            `,
          }}
        />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
          strategy="afterInteractive"
        />
        <Script
          id="gtag-config"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.gtag = window.gtag || function(){(window.dataLayer = window.dataLayer || []).push(arguments)};
              gtag('config', '${GOOGLE_ADS_ID}');
              // If user previously consented, re-apply granted state on load
              try {
                if (document.cookie.includes('cookieConsent=true')) {
                  gtag('consent', 'update', {
                    ad_storage: 'granted',
                    ad_user_data: 'granted',
                    ad_personalization: 'granted',
                    analytics_storage: 'granted',
                  });
                }
              } catch {}
            `,
          }}
        />
      </head>
      <body
        className={`${poppins.variable} font-sans antialiased overflow-visible`}
      >
        <Providers>
          <TopologyBackground />
          {children}
          <Toaster position="bottom-right" />
          <ConsentManager />
        </Providers>
      </body>
    </html>
  );
}

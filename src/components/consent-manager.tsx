"use client";

import CookieConsent from "@/components/blocks/cookie-consent";

export default function ConsentManager() {
  const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  if (!GOOGLE_ADS_ID) throw new Error("GOOGLE_ADS_ID is not set");
  return (
    <CookieConsent
      variant="mini"
      learnMoreHref="/privacy#cookies"
      onAcceptCallback={() => {
        try {
          document.cookie =
            "cookieConsent=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
        } catch {}
        if (typeof window !== "undefined") {
          const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
          if (typeof gtag === "function") {
            gtag("consent", "update", {
              ad_storage: "granted",
              ad_user_data: "granted",
              ad_personalization: "granted",
              analytics_storage: "granted",
            });
            gtag("config", GOOGLE_ADS_ID);
          }
        }
      }}
      onDeclineCallback={() => {
        if (typeof window !== "undefined") {
          const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
          if (typeof gtag === "function") {
            gtag("consent", "update", {
              ad_storage: "denied",
              ad_user_data: "denied",
              ad_personalization: "denied",
              analytics_storage: "denied",
            });
          }
        }
      }}
    />
  );
}



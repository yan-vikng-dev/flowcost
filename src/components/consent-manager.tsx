"use client";

import CookieConsent from "@/components/blocks/cookie-consent";
import { GOOGLE_ADS_ID } from "@/lib/config";

export default function ConsentManager() {
  return (
    <CookieConsent
      variant="mini"
      learnMoreHref="/privacy#cookies"
      onAcceptCallback={() => {
        try {
          document.cookie =
            "cookieConsent=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
        } catch {}
        if (
          typeof window !== "undefined" &&
          typeof (window as any).gtag === "function"
        ) {
          (window as any).gtag("consent", "update", {
            ad_storage: "granted",
            ad_user_data: "granted",
            ad_personalization: "granted",
            analytics_storage: "granted",
          });
          (window as any).gtag("config", GOOGLE_ADS_ID);
        }
      }}
      onDeclineCallback={() => {
        if (
          typeof window !== "undefined" &&
          typeof (window as any).gtag === "function"
        ) {
          (window as any).gtag("consent", "update", {
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied",
            analytics_storage: "denied",
          });
        }
      }}
    />
  );
}



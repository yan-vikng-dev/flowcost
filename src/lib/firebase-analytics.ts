import type { Analytics } from 'firebase/analytics';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { firebaseApp } from './firebase-app';

let cachedAnalytics: Analytics | null | undefined = undefined;

function getAnalyticsSafe(): Analytics | null {
  if (typeof window === 'undefined') return null;
  if (cachedAnalytics !== undefined) return cachedAnalytics;
  try {
    cachedAnalytics = getAnalytics(firebaseApp);
  } catch {
    cachedAnalytics = null;
  }
  return cachedAnalytics;
}

type AppEventName =
  | 'sign_up'
  | 'entry_created'
  | 'invite_sent';

export function trackEvent(eventName: AppEventName, params?: Record<string, unknown>): void {
  const analytics = getAnalyticsSafe();
  if (!analytics) return;
  try {
    logEvent(analytics, eventName as string, params as Record<string, string | number | boolean | null | undefined>);
  } catch {
    // no-op
  }
}

export { getAnalyticsSafe };



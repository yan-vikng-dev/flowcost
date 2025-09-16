// Global application configuration and constants

// Earliest date supported for entries in the system (UTC midnight)
export const SERVICE_START_DATE = new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0));

// Toggle to temporarily stop new registrations. When true, the landing page
// will show a waitlist notice instead of the sign-in action.
export const REGISTRATIONS_CLOSED = false;

// Google Ads/Tag configuration
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-17572813812';

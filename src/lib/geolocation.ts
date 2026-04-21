/**
 * Thin wrapper around `navigator.geolocation` for photo GPS stamping.
 *
 * Goals:
 *  - Never block a photo upload. If permission is denied, timed out, or
 *    simply unsupported, we return `null` and the caller proceeds.
 *  - Cache the last successful fix for 30 seconds so a 5-photo burst
 *    doesn't re-prompt or hit GPS every time.
 *  - Let the user opt out via a `bedrock.geo` localStorage flag.
 */

export type GpsFix = {
  lat: number;
  lng: number;
  accuracyM: number;
  capturedAt: number;
  source: "device";
};

const OPT_OUT_KEY = "bedrock.geo";
const CACHE_TTL_MS = 30_000;
const TIMEOUT_MS = 8_000;

let cached: GpsFix | null = null;

export function isGeoOptedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "off";
  } catch {
    return false;
  }
}

export function setGeoOptedOut(off: boolean) {
  try {
    localStorage.setItem(OPT_OUT_KEY, off ? "off" : "on");
  } catch {
    // ignore
  }
}

export function isGeoSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "geolocation" in navigator &&
    typeof navigator.geolocation.getCurrentPosition === "function"
  );
}

/**
 * Returns a fresh GPS fix, or `null` if unavailable / denied / timed out.
 * Caller should never rely on this resolving with a value — treat as a
 * best-effort stamp.
 */
export function captureGps(): Promise<GpsFix | null> {
  if (!isGeoSupported() || isGeoOptedOut()) return Promise.resolve(null);

  if (cached && Date.now() - cached.capturedAt < CACHE_TTL_MS) {
    return Promise.resolve(cached);
  }

  return new Promise<GpsFix | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), TIMEOUT_MS + 500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        const fix: GpsFix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          capturedAt: Date.now(),
          source: "device",
        };
        cached = fix;
        resolve(fix);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: TIMEOUT_MS,
        maximumAge: CACHE_TTL_MS,
      },
    );
  });
}

/** Format lat/lng with 4 decimals (≈11m precision). Null-safe. */
export function formatCoords(lat?: number, lng?: number): string | null {
  if (lat === undefined || lng === undefined) return null;
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

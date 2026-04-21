/**
 * Small wrapper around the Vibration API so key actions feel tactile on
 * Android (and any browser that supports it). Safari/iOS is a no-op —
 * the calls silently do nothing there, which is fine.
 *
 * Users can opt out via the `bedrock.haptics` localStorage flag
 * (set to "off" to disable). Defaults to on when the API is available.
 */

type Pattern = number | number[];

const STORAGE_KEY = "bedrock.haptics";

function supported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  );
}

function enabled(): boolean {
  if (!supported()) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function fire(pattern: Pattern) {
  if (!enabled()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore — some browsers throw on rapid-fire calls
  }
}

export const haptics = {
  /** Light tap — button press, photo captured. */
  tap: () => fire(8),
  /** Positive confirmation — submit succeeded, report approved. */
  success: () => fire([10, 50, 10]),
  /** Warning — rejection, missing field. */
  warn: () => fire([20, 80, 20]),
  /** Error — save failed, validation blocked. */
  error: () => fire([50, 40, 50, 40, 50]),
};

export function setHapticsEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // ignore
  }
}

export function areHapticsEnabled(): boolean {
  return enabled();
}

export function areHapticsSupported(): boolean {
  return supported();
}

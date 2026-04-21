import { useEffect, useState } from "react";
import { X, Share, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Gentle Add-to-Home-Screen nudge.
 *
 * - Chromium (Android/desktop) fires `beforeinstallprompt`; we capture it
 *   and offer an in-app Install button.
 * - iOS Safari fires nothing. We detect iOS + non-standalone and show a
 *   one-off instruction card pointing at the share menu.
 *
 * The user can dismiss either variant; we remember for 14 days in
 * localStorage so we don't pester.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "bedrock.install.dismissedAt";
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function wasRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // @ts-expect-error — iOS Safari surfaces navigator.standalone
  if (window.navigator.standalone === true) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (isIosSafari()) {
      setShowIos(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Chromium path
  if (deferred) {
    return (
      <div className="fixed inset-x-3 bottom-3 z-40 sm:hidden">
        <div className="rounded-md border bg-background/95 backdrop-blur p-3 shadow-lg flex items-center gap-3">
          <Download className="size-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Install Bedrock</p>
            <p className="text-xs text-muted-foreground">
              Faster access, works offline.
            </p>
          </div>
          <Button
            size="sm"
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice;
              setDeferred(null);
              markDismissed();
            }}
          >
            Install
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setDeferred(null);
              markDismissed();
            }}
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  // iOS path — instructional card, no programmatic install.
  if (showIos) {
    return (
      <div className="fixed inset-x-3 bottom-3 z-40 sm:hidden">
        <div className="rounded-md border bg-background/95 backdrop-blur p-3 shadow-lg">
          <div className="flex items-start gap-3">
            <Share className="size-5 shrink-0 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Install to home screen</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tap <span className="inline-flex items-center gap-0.5">
                  <Share className="size-3 inline" />
                </span>{" "}
                then <span className="font-medium">Add to Home Screen</span>.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setShowIos(false);
                markDismissed();
              }}
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

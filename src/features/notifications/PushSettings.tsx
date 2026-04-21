import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "../../../convex/_generated/api";
import {
  isPushSupported,
  subscribePush,
  unsubscribePush,
} from "@/lib/pushClient";
import { toast } from "sonner";

/**
 * Notification preferences card. Handles the permission + subscription
 * dance, and surfaces current state so users know whether alerts will
 * reach them.
 *
 * Only renders when the browser actually supports push. iOS Safari needs
 * the app installed to the Home Screen first (iOS 16.4+); if that's not
 * the case the browser will just reject permission, which we show.
 */
export function PushSettings() {
  const count = useQuery(api.pushSubscriptions.countMine);
  const register = useMutation(api.pushSubscriptions.register);
  const unregister = useMutation(api.pushSubscriptions.unregister);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    const t = setInterval(() => setPermission(Notification.permission), 2000);
    return () => clearInterval(t);
  }, []);

  if (!isPushSupported()) return null;

  const enabled = (count ?? 0) > 0 && permission === "granted";

  async function enable() {
    setBusy(true);
    try {
      const sub = await subscribePush();
      if (!sub) {
        toast.error(
          "Couldn't enable notifications. Make sure you allowed the permission.",
        );
        return;
      }
      await register({
        endpoint: sub.endpoint,
        p256dhKey: sub.p256dhKey,
        authKey: sub.authKey,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });
      toast.success("Notifications enabled.");
    } catch (e) {
      toast.error(`Couldn't enable notifications: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const endpoint = await unsubscribePush();
      if (endpoint) await unregister({ endpoint });
      toast.success("Notifications disabled.");
    } catch (e) {
      toast.error(`Couldn't disable notifications: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="py-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading font-semibold tracking-tight">
              Notifications
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Get a push when your report is approved or needs corrections.
            </p>
            {permission === "denied" && (
              <p className="text-xs text-destructive mt-2">
                Notifications are blocked in this browser. Enable them in your
                browser settings, then come back.
              </p>
            )}
          </div>
          {enabled ? (
            <Button
              variant="outline"
              onClick={() => void disable()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BellOff className="size-4" />
              )}
              Disable
            </Button>
          ) : (
            <Button onClick={() => void enable()} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Bell className="size-4" />
              )}
              Enable
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

/**
 * Icon button that opens a fullscreen camera view for barcode / QR scanning.
 * On successful decode, calls `onScan(value)` and closes the view.
 *
 * Hidden when the browser lacks BarcodeDetector or camera access — no point
 * promising a feature the device can't deliver.
 */
export function BarcodeScanButton({
  onScan,
  ariaLabel = "Scan barcode",
  className,
}: {
  onScan: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const { scanning, videoRef, start, cancel, supported } = useBarcodeScanner();

  if (!supported) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={ariaLabel}
        className={cn("shrink-0", className)}
        onClick={async () => {
          haptics.tap();
          const value = await start();
          if (value) {
            haptics.success();
            onScan(value);
          }
        }}
      >
        <QrCode className="size-3.5" />
      </Button>

      <Dialog open={scanning} onOpenChange={(open) => !open && cancel()}>
        <DialogContent
          className="max-w-md p-0 gap-0 overflow-hidden bg-black border-none"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Scan a barcode</DialogTitle>
          <div className="relative aspect-square bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Target reticle */}
            <div className="pointer-events-none absolute inset-8 border-2 border-white/80 rounded-lg" />
            <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
              <p className="text-xs text-white/80 bg-black/60 inline-block rounded-full px-3 py-1">
                Point the camera at a barcode or QR
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={cancel}
              className="absolute top-2 right-2 text-white/80 hover:text-white hover:bg-white/10"
              aria-label="Close scanner"
            >
              <X className="size-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

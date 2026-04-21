import { useCallback, useEffect, useRef, useState } from "react";

type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): {
    detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
  };
  getSupportedFormats?: () => Promise<string[]>;
};

function getCtor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector ?? null;
}

export function isBarcodeScannerSupported(): boolean {
  return getCtor() !== null && typeof navigator?.mediaDevices?.getUserMedia === "function";
}

/**
 * Opens the device camera and scans for barcodes / QR codes in a loop.
 * Resolves with the first detected value, or null on cancel / error.
 *
 * Uses the platform `BarcodeDetector` API (Chrome desktop/Android, iOS
 * Safari 17+). If unavailable we resolve null and the caller should hide
 * the UI that triggers this.
 */
export function useBarcodeScanner() {
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<InstanceType<BarcodeDetectorCtor> | null>(null);
  const resolveRef = useRef<((v: string | null) => void) | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    detectorRef.current = null;
    setScanning(false);
  }, []);

  const finish = useCallback(
    (value: string | null) => {
      resolveRef.current?.(value);
      resolveRef.current = null;
      stop();
    },
    [stop],
  );

  const start = useCallback(async (): Promise<string | null> => {
    const Ctor = getCtor();
    if (!Ctor) return null;
    setScanning(true);
    return new Promise<string | null>(async (resolve) => {
      resolveRef.current = resolve;
      try {
        detectorRef.current = new Ctor({
          formats: [
            "qr_code",
            "code_128",
            "code_39",
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "pdf417",
            "aztec",
            "data_matrix",
          ],
        });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          finish(null);
          return;
        }
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (!detectorRef.current || !videoRef.current) return;
          try {
            const results = await detectorRef.current.detect(videoRef.current);
            const hit = results[0]?.rawValue;
            if (hit) {
              finish(hit);
              return;
            }
          } catch {
            // transient detection error — keep scanning
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        finish(null);
      }
    });
  }, [finish]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    scanning,
    videoRef,
    start,
    cancel: () => finish(null),
    supported: isBarcodeScannerSupported(),
  };
}

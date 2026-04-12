import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

type Props = {
  onCapture: (dataUrl: string) => void;
};

/**
 * Canvas-based signature pad that works reliably inside CSS-transformed
 * dialogs. Uses native pointer events instead of react-signature-canvas
 * to avoid coordinate mapping issues caused by transforms/animations.
 */
export function SignaturePad({ onCapture }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const hasStrokes = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const getCanvasPoint = useCallback((e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    const pt = getCanvasPoint(e);
    if (pt) lastPoint.current = pt;
    canvas.setPointerCapture(e.pointerId);
  }, [getCanvasPoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const pt = getCanvasPoint(e);
    if (!ctx || !pt || !lastPoint.current) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPoint.current = pt;
    if (!hasStrokes.current) {
      hasStrokes.current = true;
      setIsEmpty(false);
    }
  }, [getCanvasPoint]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;

    // Capture after each stroke
    const canvas = canvasRef.current;
    if (canvas && hasStrokes.current) {
      onCapture(canvas.toDataURL("image/png"));
    }
  }, [onCapture]);

  // Initialize canvas drawing context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Re-set stroke style after clear
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    hasStrokes.current = false;
    setIsEmpty(true);
  }, []);

  return (
    <div className="space-y-2">
      <div className="border rounded-md bg-white p-1">
        <canvas
          ref={canvasRef}
          width={392}
          height={142}
          className="w-full touch-none"
          style={{ height: 142 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
      {!isEmpty && (
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          <Eraser className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

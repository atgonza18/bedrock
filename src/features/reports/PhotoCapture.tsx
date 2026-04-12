import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Trash2, Loader2, XIcon, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

type Attachment = Doc<"attachments"> & { url: string | null };

type Props = {
  reportId: Id<"reports">;
  attachments: Attachment[];
  readOnly?: boolean;
};

export function PhotoCapture({ reportId, attachments, readOnly }: Props) {
  const generateUrl = useMutation(api.reports.attachments.generateUploadUrl);
  const createAttachment = useMutation(api.reports.attachments.createAttachment);
  const removeAttachment = useMutation(api.reports.attachments.removeAttachment);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploadUrl = await generateUrl({});
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        await createAttachment({
          parentKind: "report",
          parentId: reportId,
          storageId,
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        });
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const viewingAttachment = viewingIndex !== null ? attachments[viewingIndex] : null;
  const canGoPrev = viewingIndex !== null && viewingIndex > 0;
  const canGoNext = viewingIndex !== null && viewingIndex < attachments.length - 1;

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const clampZoom = (z: number) => Math.min(Math.max(z, 1), 5);

  // Reset zoom when switching photos or closing
  useEffect(() => {
    resetZoom();
  }, [viewingIndex, resetZoom]);

  // Scroll-wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => {
      const next = clampZoom(prev - e.deltaY * 0.002);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Pan via mouse drag when zoomed in
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 1) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [zoom, pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Photos
        </h3>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-1" />
            )}
            {uploading ? "Uploading..." : "Add photo"}
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {attachments.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-muted py-8 text-center">
          <p className="text-sm text-muted-foreground">No photos yet. Tap &ldquo;Add photo&rdquo; to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {attachments.map((a, i) => (
            <div key={a._id} className="relative group rounded-md overflow-hidden border">
              {a.url ? (
                <button
                  type="button"
                  className="w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setViewingIndex(i)}
                >
                  <img
                    src={a.url}
                    alt={a.fileName}
                    className="aspect-square object-cover w-full"
                  />
                </button>
              ) : (
                <div className="aspect-square bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  Loading...
                </div>
              )}
              {!readOnly && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() =>
                    void removeAttachment({ attachmentId: a._id })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={viewingIndex !== null} onOpenChange={() => setViewingIndex(null)}>
        <DialogContent
          className="max-w-[calc(100vw-2rem)] sm:max-w-3xl p-0 gap-0 overflow-hidden bg-black/95 border-none ring-0"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            {viewingAttachment?.fileName ?? "Photo"}
          </DialogTitle>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3 z-10 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setViewingIndex(null)}
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </Button>

          {/* Image with zoom + pan */}
          {viewingAttachment?.url && (
            <div
              ref={imageContainerRef}
              className="flex items-center justify-center min-h-[50vh] max-h-[80vh] p-2 overflow-hidden select-none"
              style={{ cursor: zoom > 1 ? "grab" : "default" }}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <img
                src={viewingAttachment.url}
                alt={viewingAttachment.fileName}
                className="max-w-full max-h-[78vh] object-contain rounded"
                draggable={false}
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transition: isPanning.current ? "none" : "transform 0.15s ease-out",
                }}
              />
            </div>
          )}

          {/* Bottom bar: nav + zoom controls */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            {/* Left: prev/next */}
            <div className="flex items-center gap-1">
              {attachments.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                    disabled={!canGoPrev}
                    onClick={() => setViewingIndex((i) => (i !== null ? i - 1 : null))}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-xs text-white/50 tabular-nums min-w-[3rem] text-center">
                    {viewingIndex !== null ? viewingIndex + 1 : 0} / {attachments.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                    disabled={!canGoNext}
                    onClick={() => setViewingIndex((i) => (i !== null ? i + 1 : null))}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Right: zoom controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white/70 hover:text-white hover:bg-white/10"
                disabled={zoom <= 1}
                onClick={() => { setZoom((z) => clampZoom(z - 0.5)); if (zoom - 0.5 <= 1) setPan({ x: 0, y: 0 }); }}
              >
                <ZoomOut className="size-4" />
              </Button>
              <span className="text-xs text-white/50 tabular-nums min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white/70 hover:text-white hover:bg-white/10"
                disabled={zoom >= 5}
                onClick={() => setZoom((z) => clampZoom(z + 0.5))}
              >
                <ZoomIn className="size-4" />
              </Button>
              {zoom > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-white/70 hover:text-white hover:bg-white/10 ml-1"
                  onClick={resetZoom}
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

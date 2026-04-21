import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

/**
 * Mic toggle button intended to sit next to a textarea. Appends
 * recognised speech to the field's value via `onAppend`.
 *
 * Hidden when the Web Speech API isn't available (Firefox mobile, older
 * browsers) so we don't promise a feature the device can't deliver.
 */
export function VoiceInputButton({
  onAppend,
  className,
  ariaLabel = "Dictate",
}: {
  onAppend: (chunk: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const { listening, start, stop, supported } = useSpeechToText((chunk) => {
    onAppend(chunk.trim() + " ");
  });

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant={listening ? "destructive" : "outline"}
      size="icon-sm"
      aria-label={listening ? "Stop dictation" : ariaLabel}
      aria-pressed={listening}
      className={cn("shrink-0", className)}
      onClick={() => {
        haptics.tap();
        if (listening) stop();
        else start();
      }}
    >
      {listening ? (
        <Square className="size-3.5" fill="currentColor" />
      ) : (
        <Mic className="size-3.5" />
      )}
    </Button>
  );
}

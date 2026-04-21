import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
};

function getCtor(): { new (): SpeechRecognitionLike } | null {
  if (typeof window === "undefined") return null;
  // prefer the standard name; fall back to webkit-prefixed (Safari).
  const w = window as typeof window & {
    SpeechRecognition?: { new (): SpeechRecognitionLike };
    webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getCtor() !== null;
}

/**
 * Web Speech API wrapper for free-form dictation into a text field.
 *
 * - Caller provides `onTranscript(text)`; we call it with final recognised
 *   chunks. The caller decides whether to append or replace.
 * - We run in continuous + interim mode on supported engines so long-form
 *   dictation stays live. Auto-stops on silence (handled by the engine).
 * - Caller should call `stop()` when unmounting or toggling off.
 */
export function useSpeechToText(
  onTranscript: (finalText: string) => void,
  options: { lang?: string } = {},
) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Voice input is not supported on this browser.");
      return;
    }
    setError(null);
    const rec = new Ctor();
    rec.lang = options.lang ?? navigator.language ?? "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (ev: unknown) => {
      const e = ev as {
        resultIndex: number;
        results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
      };
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r && r.isFinal) onTranscript(r[0].transcript);
      }
    };
    rec.onerror = (ev: unknown) => {
      const err = ev as { error?: string };
      setError(err.error ?? "speech-error");
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch (e) {
      setError(String(e));
      setListening(false);
    }
  }, [onTranscript, options.lang]);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    recRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  return { listening, error, start, stop, supported: isSpeechRecognitionSupported() };
}

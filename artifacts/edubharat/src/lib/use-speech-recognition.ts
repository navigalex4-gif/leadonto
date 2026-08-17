import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechRecognitionStatus = "idle" | "warming" | "listening" | "processing" | "error";

type AnyWindow = Window & { webkitAudioContext?: typeof AudioContext };

const SILENCE_MS = 900;
const MIN_UTTERANCE_MS = 280;
const MAX_UTTERANCE_MS = 14_000;
const VAD_INTERVAL_MS = 50;
const VAD_THRESHOLD = 0.035;
const WARMUP_MS = 300;

function getMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

/**
 * MediaRecorder + local VAD STT.
 *
 * This deliberately does not use SpeechRecognition. Android Chrome's native
 * Web Speech service plays its own start/stop earcon, outside the page audio
 * graph. MediaRecorder is silent at the browser level; only the resulting
 * utterance is sent to the server for transcription.
 */
export function useSpeechRecognition(language = "English") {
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const shouldContinueRef = useRef(false);
  const onPhraseRef = useRef<((text: string) => void) | null>(null);
  const blockedUntilRef = useRef(0);
  const wakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const utteranceStartedRef = useRef(0);
  const lastVoiceRef = useRef(0);
  const generationRef = useRef(0);
  const captureStartingRef = useRef(false);
  const transcribingRef = useRef(false);
  const externalSuppressUntilRef = useRef(0);
  const retryCaptureRef = useRef<(() => void) | null>(null);

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const isSupported =
    typeof window !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(window.AudioContext || (window as AnyWindow).webkitAudioContext) &&
    Boolean(getMimeType());

  const clearTimers = useCallback(() => {
    if (wakeTimerRef.current !== null) clearTimeout(wakeTimerRef.current);
    if (warmupTimerRef.current !== null) clearTimeout(warmupTimerRef.current);
    wakeTimerRef.current = null;
    warmupTimerRef.current = null;
  }, []);

  const cancelRecorder = useCallback(() => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    chunksRef.current = [];
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try { recorder.stop(); } catch { /* already stopped */ }
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    cancelRecorder();
  }, [cancelRecorder]);

  const transcribe = useCallback(async (blob: Blob, generation: number) => {
    if (blob.size < 800 || generation !== generationRef.current) return;
    transcribingRef.current = true;
    setStatus("processing");
    setInterimTranscript("");
    try {
      const form = new FormData();
      form.append("audio", blob, `utterance.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
      form.append("language", language);
      const response = await fetch(`${base}/api/stt`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const body = await response.json().catch(() => ({})) as { text?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Speech transcription failed.");
      const text = body.text?.trim() ?? "";
      if (text && generation === generationRef.current && shouldContinueRef.current) {
        setTranscript((previous) => `${previous}${previous ? " " : ""}${text}`);
        onPhraseRef.current?.(text);
      }
    } catch (err) {
      if (generation === generationRef.current && shouldContinueRef.current) {
        setError(err instanceof Error ? err.message : "Speech transcription failed. Try again.");
        setStatus("error");
      }
    } finally {
      transcribingRef.current = false;
      if (generation === generationRef.current && shouldContinueRef.current) {
        setStatus("idle");
        retryCaptureRef.current?.();
      }
    }
  }, [base, language]);

  const startCapture = useCallback(async () => {
    if (!shouldContinueRef.current || !isSupported || captureStartingRef.current) return;
    if (Date.now() < blockedUntilRef.current || transcribingRef.current || recorderRef.current) return;
    captureStartingRef.current = true;
    const generation = generationRef.current;
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      }
      if (!shouldContinueRef.current || generation !== generationRef.current) return;
      if (!contextRef.current) {
        const AC = window.AudioContext ?? (window as AnyWindow).webkitAudioContext;
        if (!AC) throw new Error("Audio input is not supported in this browser.");
        contextRef.current = new AC();
        const source = contextRef.current.createMediaStreamSource(streamRef.current);
        const analyser = contextRef.current.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.2;
        source.connect(analyser);
        analyserRef.current = analyser;
      }
      await contextRef.current.resume().catch(() => {});
      setError(null);
      setStatus("warming");
      if (warmupTimerRef.current !== null) clearTimeout(warmupTimerRef.current);
      warmupTimerRef.current = setTimeout(() => {
        warmupTimerRef.current = null;
        if (shouldContinueRef.current && generation === generationRef.current) setStatus("listening");
      }, WARMUP_MS);

      const data = new Float32Array(analyserRef.current!.fftSize);
      const monitor = () => {
        if (!shouldContinueRef.current || generation !== generationRef.current) return;
        const analyser = analyserRef.current;
        if (!analyser) return;
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (const sample of data) sum += sample * sample;
        const rms = Math.sqrt(sum / data.length);
        const now = Date.now();
        const recorder = recorderRef.current;

        if (!recorder && !transcribingRef.current && now >= blockedUntilRef.current && rms >= VAD_THRESHOLD) {
          const mimeType = getMimeType();
          const nextRecorder = new MediaRecorder(streamRef.current!, mimeType ? { mimeType } : undefined);
          chunksRef.current = [];
          utteranceStartedRef.current = now;
          lastVoiceRef.current = now;
          recorderRef.current = nextRecorder;
          nextRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunksRef.current.push(event.data);
          };
          nextRecorder.onstop = () => {
            if (recorderRef.current === nextRecorder) recorderRef.current = null;
            const utterance = new Blob(chunksRef.current, { type: nextRecorder.mimeType || mimeType || "audio/webm" });
            chunksRef.current = [];
            void transcribe(utterance, generation);
          };
          nextRecorder.start(200);
          setStatus("listening");
        } else if (recorder && recorder.state === "recording") {
          if (rms >= VAD_THRESHOLD) lastVoiceRef.current = now;
          const quietLongEnough = now - lastVoiceRef.current >= SILENCE_MS;
          const maxLength = now - utteranceStartedRef.current >= MAX_UTTERANCE_MS;
          if ((quietLongEnough && now - utteranceStartedRef.current >= MIN_UTTERANCE_MS) || maxLength) {
            try { recorder.stop(); } catch { /* already stopped */ }
          }
        }
        frameRef.current = requestAnimationFrame(monitor);
      };
      frameRef.current = requestAnimationFrame(monitor);
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError(err instanceof Error ? err.message : "Microphone access failed.");
      setStatus("error");
    } finally {
      captureStartingRef.current = false;
    }
  }, [isSupported, transcribe]);

  const suppressUntil = useCallback((epochMs: number) => {
    externalSuppressUntilRef.current = epochMs;
  }, []);

  const blockFor = useCallback((ms: number) => {
    blockedUntilRef.current = Date.now() + ms;
    if (wakeTimerRef.current !== null) clearTimeout(wakeTimerRef.current);
    wakeTimerRef.current = null;
    if (ms > 0) {
      stopMonitoring();
      if (shouldContinueRef.current) {
        wakeTimerRef.current = setTimeout(() => {
          wakeTimerRef.current = null;
          void startCapture();
        }, ms + 60);
      }
    } else if (shouldContinueRef.current) {
      void startCapture();
    }
  }, [startCapture, stopMonitoring]);

  const pause = useCallback(() => {
    clearTimers();
    blockedUntilRef.current = Date.now() + 10 * 60 * 1000;
    stopMonitoring();
    setInterimTranscript("");
    setStatus("idle");
  }, [clearTimers, stopMonitoring]);

  const stop = useCallback(() => {
    shouldContinueRef.current = false;
    onPhraseRef.current = null;
    generationRef.current++;
    clearTimers();
    stopMonitoring();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (contextRef.current) void contextRef.current.close().catch(() => {});
    contextRef.current = null;
    transcribingRef.current = false;
    setStatus("idle");
    setInterimTranscript("");
  }, [clearTimers, stopMonitoring]);

  const startContinuous = useCallback((onPhrase: (text: string) => void) => {
    if (!isSupported) {
      setError("Voice input is not supported in this browser. Use Chrome or Edge.");
      setStatus("error");
      return;
    }
    const wasContinuing = shouldContinueRef.current;
    shouldContinueRef.current = true;
    onPhraseRef.current = onPhrase;
    // The continuity watchdog calls this repeatedly. Do not invalidate an
    // active recorder or an in-flight transcription when it re-kicks the loop.
    if (!wasContinuing) generationRef.current++;
    setError(null);
    void startCapture();
  }, [isSupported, startCapture]);

  const start = useCallback((onResult?: (text: string) => void) => {
    startContinuous((text) => {
      onResult?.(text);
      stop();
    });
  }, [startContinuous, stop]);

  const reset = useCallback(() => {
    stop();
    setTranscript("");
    setError(null);
  }, [stop]);

  useEffect(() => stop, [stop]);

  // If TTS wakes the mic while an utterance is still being transcribed,
  // startCapture() intentionally returns. Retry as soon as transcription
  // finishes, while still respecting the current speaker-tail block.
  useEffect(() => {
    retryCaptureRef.current = () => {
      if (!shouldContinueRef.current || transcribingRef.current || recorderRef.current) return;
      const delay = Math.max(60, blockedUntilRef.current - Date.now() + 60);
      if (wakeTimerRef.current !== null) clearTimeout(wakeTimerRef.current);
      wakeTimerRef.current = setTimeout(() => {
        wakeTimerRef.current = null;
        if (shouldContinueRef.current && !transcribingRef.current && !recorderRef.current) {
          void startCapture();
        }
      }, delay);
    };
    return () => {
      retryCaptureRef.current = null;
    };
  }, [startCapture]);

  useEffect(() => {
    const recover = () => {
      if (shouldContinueRef.current && !recorderRef.current && !transcribingRef.current) void startCapture();
    };
    document.addEventListener("visibilitychange", recover);
    window.addEventListener("pageshow", recover);
    window.addEventListener("focus", recover);
    return () => {
      document.removeEventListener("visibilitychange", recover);
      window.removeEventListener("pageshow", recover);
      window.removeEventListener("focus", recover);
    };
  }, [startCapture]);

  return {
    status,
    transcript,
    interimTranscript,
    error,
    isSupported,
    isListening: status === "listening" || status === "warming",
    isContinuous: shouldContinueRef.current,
    start,
    startContinuous,
    stop,
    reset,
    blockFor,
    suppressUntil,
    pause,
  };
}
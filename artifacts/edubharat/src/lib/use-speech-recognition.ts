import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechRecognitionStatus = "idle" | "warming" | "listening" | "processing" | "error";

type AnyWindow = Window & { webkitAudioContext?: typeof AudioContext };
type BrowserSpeechResult = { isFinal: boolean; 0?: { transcript?: string } };
type BrowserSpeechEvent = { results: ArrayLike<BrowserSpeechResult> };
type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type BrowserSpeechWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
};

// End a candidate turn promptly after they stop, while still allowing a
// natural short pause inside an answer.
// Keep natural pauses inside a candidate's answer. Cutting at 650ms was
// especially damaging on Indian English, where speakers often pause between
// clauses; the resulting fragments were harder for STT to understand.
// Keep the final clause of a naturally paced answer in the same utterance.
// This matters for Indian-English speakers who often pause briefly between
// clauses; the server model is more accurate when it receives the full thought.
const SILENCE_MS = 1_200;
const MIN_UTTERANCE_MS = 360;
const MAX_UTTERANCE_MS = 30_000;
const VAD_INTERVAL_MS = 50;
const MIN_VAD_THRESHOLD = 0.022;
const MAX_VAD_THRESHOLD = 0.06;
// Keep the state transition responsive after an interviewer finishes. The
// recorder itself starts immediately; this short visual warmup avoids showing
// a false "ready" state without delaying capture.
const WARMUP_MS = 120;
const PRE_ROLL_CHUNKS = 8;
const RECORDER_TIMESLICE_MS = 160;

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
  const [audioLevel, setAudioLevel] = useState(0);

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
  const rollingChunksRef = useRef<Blob[]>([]);
  const utteranceChunksRef = useRef<Blob[]>([]);
  const utteranceActiveRef = useRef(false);
  const utteranceStartedRef = useRef(0);
  const lastVoiceRef = useRef(0);
  const noiseFloorRef = useRef(0.008);
  const audioLevelRef = useRef(0);
  const speechStartRef = useRef(0);
  const firstAudioRef = useRef(0);
  const firstInterimRef = useRef(0);
  const generationRef = useRef(0);
  const captureStartingRef = useRef(false);
  const transcribingRef = useRef(false);
  const externalSuppressUntilRef = useRef(0);
  const retryCaptureRef = useRef<(() => void) | null>(null);
  const browserRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const serverSttUnavailableRef = useRef(false);
  const serverSttFailureCountRef = useRef(0);

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
    rollingChunksRef.current = [];
    utteranceChunksRef.current = [];
    utteranceActiveRef.current = false;
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

  const stopBrowserRecognition = useCallback(() => {
    const recognition = browserRecognitionRef.current;
    browserRecognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try { recognition.stop(); } catch { /* already stopped */ }
    }
  }, []);

  const browserLocale = ({
    English: "en-IN",
    Hindi: "hi-IN",
    Tamil: "ta-IN",
    Telugu: "te-IN",
    Bengali: "bn-IN",
    Marathi: "mr-IN",
    Gujarati: "gu-IN",
    Kannada: "kn-IN",
    Malayalam: "ml-IN",
    Punjabi: "pa-Guru-IN",
    Odia: "hi-IN",
    Assamese: "en-IN",
    Urdu: "ur-IN",
  } as Record<string, string>)[language] ?? "en-IN";

  const startBrowserRecognition = useCallback((): boolean => {
    if (!shouldContinueRef.current || browserRecognitionRef.current) return true;
    const speechWindow = window as BrowserSpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) return false;

    const recognition = new Recognition();
    recognition.lang = browserLocale;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let text = "";
      let interim = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) text += ` ${result[0]?.transcript ?? ""}`;
        else interim += ` ${result[0]?.transcript ?? ""}`;
      }
      const interimText = interim.trim();
      if (interimText) {
        firstInterimRef.current ||= performance.now();
        setInterimTranscript(interimText);
      }
      const trimmed = text.trim();
      if (trimmed && shouldContinueRef.current) {
        setInterimTranscript("");
        setTranscript((previous) => `${previous}${previous ? " " : ""}${trimmed}`);
        onPhraseRef.current?.(trimmed);
      }
    };
    recognition.onerror = () => {
      browserRecognitionRef.current = null;
      if (shouldContinueRef.current) setStatus("error");
    };
    recognition.onend = () => {
      if (browserRecognitionRef.current === recognition) browserRecognitionRef.current = null;
      if (shouldContinueRef.current && serverSttUnavailableRef.current) {
        window.setTimeout(() => void startBrowserRecognition(), 180);
      }
    };
    browserRecognitionRef.current = recognition;
    setError(null);
    setStatus("listening");
    try {
      recognition.start();
      return true;
    } catch {
      browserRecognitionRef.current = null;
      return false;
    }
  }, [browserLocale]);

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
        serverSttFailureCountRef.current = 0;
        serverSttUnavailableRef.current = false;
        setTranscript((previous) => `${previous}${previous ? " " : ""}${text}`);
        onPhraseRef.current?.(text);
      }
    } catch (err) {
      if (generation === generationRef.current && shouldContinueRef.current) {
        // A single timeout or provider hiccup should not permanently move the
        // session to browser SpeechRecognition, which is materially less
        // accurate on many Android Chrome devices. Keep the server path for
        // one retry; use the browser only after two consecutive failures.
        serverSttFailureCountRef.current += 1;
        if (serverSttFailureCountRef.current >= 2) {
          serverSttUnavailableRef.current = true;
          stopMonitoring();
          if (!startBrowserRecognition()) {
            setError(err instanceof Error ? err.message : "Speech transcription failed. Try again.");
            setStatus("error");
          }
        }
      }
    } finally {
      transcribingRef.current = false;
      if (generation === generationRef.current && shouldContinueRef.current && !browserRecognitionRef.current) {
        setStatus("listening");
      }
    }
  }, [base, language, startBrowserRecognition, stopMonitoring]);

  const startCapture = useCallback(async () => {
    if (!shouldContinueRef.current || !isSupported || captureStartingRef.current || browserRecognitionRef.current) return;
    if (Date.now() < blockedUntilRef.current || transcribingRef.current) return;
    captureStartingRef.current = true;
    const generation = generationRef.current;
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: { ideal: 48_000 },
            sampleSize: { ideal: 16 },
          },
        });
      }
      if (!shouldContinueRef.current || generation !== generationRef.current) return;
      if (!contextRef.current) {
        const AC = window.AudioContext ?? (window as AnyWindow).webkitAudioContext;
        if (!AC) throw new Error("Audio input is not supported in this browser.");
        contextRef.current = new AC({ latencyHint: "interactive", sampleRate: 48_000 });
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

      if (!recorderRef.current) {
        const mimeType = getMimeType();
        const recorder = new MediaRecorder(
          streamRef.current!,
          mimeType ? { mimeType, audioBitsPerSecond: 128_000 } : { audioBitsPerSecond: 128_000 },
        );
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (!event.data.size) return;
          firstAudioRef.current ||= performance.now();
          if (utteranceActiveRef.current) {
            utteranceChunksRef.current.push(event.data);
          } else {
            rollingChunksRef.current.push(event.data);
            if (rollingChunksRef.current.length > PRE_ROLL_CHUNKS) rollingChunksRef.current.shift();
          }
        };
        recorder.start(RECORDER_TIMESLICE_MS);
      }
      if (frameRef.current !== null) return;
      const data = new Float32Array(analyserRef.current!.fftSize);
      const monitor = () => {
        if (!shouldContinueRef.current || generation !== generationRef.current) return;
        const analyser = analyserRef.current;
        if (!analyser) return;
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (const sample of data) sum += sample * sample;
        const rms = Math.sqrt(sum / data.length);
        const normalizedLevel = Math.min(1, rms * 8);
        if (Math.abs(normalizedLevel - audioLevelRef.current) > 0.025) {
          audioLevelRef.current = normalizedLevel;
          setAudioLevel(normalizedLevel);
        }
        const now = Date.now();
        const recorder = recorderRef.current;
        const threshold = Math.min(
          MAX_VAD_THRESHOLD,
          Math.max(MIN_VAD_THRESHOLD, noiseFloorRef.current * 2.2),
        );
        if (!utteranceActiveRef.current && rms < threshold) {
          noiseFloorRef.current = noiseFloorRef.current * 0.96 + rms * 0.04;
        }

        if (recorder && !transcribingRef.current && !utteranceActiveRef.current && now >= blockedUntilRef.current && rms >= threshold) {
          utteranceActiveRef.current = true;
          utteranceChunksRef.current = [...rollingChunksRef.current];
          rollingChunksRef.current = [];
          utteranceStartedRef.current = now;
          lastVoiceRef.current = now;
          speechStartRef.current = performance.now();
          firstAudioRef.current = 0;
          firstInterimRef.current = 0;
          console.info("[stt] speech started", { atMs: Math.round(speechStartRef.current), threshold });
          setStatus("listening");
        } else if (recorder && recorder.state === "recording" && utteranceActiveRef.current) {
          if (rms >= threshold) lastVoiceRef.current = now;
          const quietLongEnough = now - lastVoiceRef.current >= SILENCE_MS;
          const maxLength = now - utteranceStartedRef.current >= MAX_UTTERANCE_MS;
          if ((quietLongEnough && now - utteranceStartedRef.current >= MIN_UTTERANCE_MS) || maxLength) {
            utteranceActiveRef.current = false;
            const utterance = new Blob(utteranceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
            utteranceChunksRef.current = [];
            console.info("[stt] speech ended", {
              atMs: Math.round(performance.now()),
              durationMs: now - utteranceStartedRef.current,
              bytes: utterance.size,
            });
            void transcribe(utterance, generation);
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
      stopBrowserRecognition();
      if (shouldContinueRef.current) {
        wakeTimerRef.current = setTimeout(() => {
          wakeTimerRef.current = null;
          if (serverSttUnavailableRef.current) void startBrowserRecognition();
          else {
            void startCapture();
            // startCapture can legitimately defer while a previous recorder
            // transition is settling. Do not leave the mic in that state:
            // retry on the next tick without creating a second recorder.
            window.setTimeout(() => {
              if (shouldContinueRef.current && !recorderRef.current && !browserRecognitionRef.current && !transcribingRef.current) {
                void startCapture();
              }
            }, 180);
          }
        }, ms + 60);
      }
    } else if (shouldContinueRef.current) {
      if (serverSttUnavailableRef.current) void startBrowserRecognition();
      else void startCapture();
    }
  }, [startBrowserRecognition, startCapture, stopBrowserRecognition, stopMonitoring]);

  const pause = useCallback(() => {
    clearTimers();
    blockedUntilRef.current = Date.now() + 10 * 60 * 1000;
    stopMonitoring();
    stopBrowserRecognition();
    setInterimTranscript("");
    setStatus("idle");
  }, [clearTimers, stopBrowserRecognition, stopMonitoring]);

  const stop = useCallback(() => {
    shouldContinueRef.current = false;
    onPhraseRef.current = null;
    generationRef.current++;
    clearTimers();
    stopMonitoring();
    stopBrowserRecognition();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (contextRef.current) void contextRef.current.close().catch(() => {});
    contextRef.current = null;
    transcribingRef.current = false;
    audioLevelRef.current = 0;
    setAudioLevel(0);
    setStatus("idle");
    setInterimTranscript("");
  }, [clearTimers, stopBrowserRecognition, stopMonitoring]);

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
    if (serverSttUnavailableRef.current) void startBrowserRecognition();
    else void startCapture();
  }, [isSupported, startBrowserRecognition, startCapture]);

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
      if (!shouldContinueRef.current || transcribingRef.current || recorderRef.current || browserRecognitionRef.current) return;
      const delay = Math.max(60, blockedUntilRef.current - Date.now() + 60);
      if (wakeTimerRef.current !== null) clearTimeout(wakeTimerRef.current);
      wakeTimerRef.current = setTimeout(() => {
        wakeTimerRef.current = null;
        if (shouldContinueRef.current && !transcribingRef.current && !recorderRef.current && !browserRecognitionRef.current) {
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
      if (shouldContinueRef.current && !recorderRef.current && !transcribingRef.current) {
        if (serverSttUnavailableRef.current) void startBrowserRecognition();
        else void startCapture();
      }
    };
    document.addEventListener("visibilitychange", recover);
    window.addEventListener("pageshow", recover);
    window.addEventListener("focus", recover);
    return () => {
      document.removeEventListener("visibilitychange", recover);
      window.removeEventListener("pageshow", recover);
      window.removeEventListener("focus", recover);
    };
  }, [startBrowserRecognition, startCapture]);

  return {
    status,
    transcript,
    interimTranscript,
    audioLevel,
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
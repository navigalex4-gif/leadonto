import { WebSocketServer, WebSocket, type RawData } from "ws";
import type { Server } from "node:http";

const LIVE_PATH = "/api/stt/live";
const DEEPGRAM_URL = "wss://api.deepgram.com/v1/listen";

type LiveStartMessage = {
  type: "start";
  language?: string;
};

const LANGUAGE_CODES: Record<string, string> = {
  English: "en-IN",
  Hindi: "hi",
  Tamil: "ta",
  Telugu: "te",
  Bengali: "bn",
  Marathi: "mr",
  Gujarati: "gu",
  Kannada: "kn",
  Malayalam: "ml",
  Punjabi: "pa",
  Odia: "or",
  Assamese: "as",
  Urdu: "ur",
};

function deepgramLanguage(language: string): string {
  return LANGUAGE_CODES[language] ?? "en-IN";
}

function isStartMessage(value: unknown): value is LiveStartMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<LiveStartMessage>;
  return message.type === "start";
}

function sendJson(socket: WebSocket, value: Record<string, unknown>): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
}

function rawToBuffer(raw: RawData): Buffer {
  if (Buffer.isBuffer(raw)) return raw;
  if (Array.isArray(raw)) return Buffer.concat(raw);
  return Buffer.from(raw as ArrayBuffer);
}

/**
 * Browser-to-Deepgram relay. The provider key stays on the API server; the
 * browser only sees normalized transcript events.
 */
export function attachDeepgramLive(server: Server): void {
  const proxy = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname !== LIVE_PATH) return;
    proxy.handleUpgrade(request, socket, head, (client) => proxy.emit("connection", client, request));
  });

  proxy.on("connection", (browser) => {
    let deepgram: WebSocket | null = null;
    let started = false;
    let closed = false;
    const pendingAudio: Buffer[] = [];

    const closeBoth = () => {
      if (closed) return;
      closed = true;
      if (deepgram && deepgram.readyState === WebSocket.OPEN) deepgram.close(1000, "client closed");
      if (browser.readyState === WebSocket.OPEN) browser.close(1000, "stream closed");
    };

    browser.on("message", (raw, isBinary) => {
      if (!isBinary) {
        let message: unknown;
        try {
          message = JSON.parse(raw.toString());
        } catch {
          sendJson(browser, { type: "error", error: "Invalid realtime message." });
          return;
        }
        if (!isStartMessage(message) || started) return;
        started = true;
        const language = deepgramLanguage(message.language ?? "English");
        const params = new URLSearchParams({
          model: "nova-3",
          language,
          encoding: "opus",
          sample_rate: "48000",
          interim_results: "true",
          smart_format: "true",
          punctuate: "true",
          endpointing: "300",
          utterance_end_ms: "1000",
          vad_events: "true",
          filler_words: "true",
          numerals: "true",
        });
        const apiKey = process.env["DEEPGRAM_API_KEY"];
        if (!apiKey) {
          sendJson(browser, { type: "error", error: "Realtime speech is unavailable." });
          closeBoth();
          return;
        }
        deepgram = new WebSocket(`${DEEPGRAM_URL}?${params}`, {
          headers: { Authorization: `Token ${apiKey}` },
        });
        deepgram.on("open", () => {
          sendJson(browser, { type: "ready" });
          for (const chunk of pendingAudio) deepgram?.send(chunk);
          pendingAudio.length = 0;
        });
        deepgram.on("message", (providerRaw) => {
          try {
            const data = JSON.parse(providerRaw.toString()) as {
              type?: string;
              is_final?: boolean;
              speech_final?: boolean;
              channel?: { alternatives?: Array<{ transcript?: string }> };
            };
            const transcript = data.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
            if (transcript) {
              sendJson(browser, {
                type: data.speech_final ? "final" : data.is_final ? "interim" : "interim",
                text: transcript,
                speechFinal: Boolean(data.speech_final),
              });
            }
          } catch {
            // Ignore non-transcript provider messages such as KeepAlive/VAD.
          }
        });
        deepgram.on("error", () => sendJson(browser, { type: "error", error: "Realtime speech connection failed." }));
        deepgram.on("close", () => {
          if (!closed) sendJson(browser, { type: "closed" });
        });
        return;
      }

      const audio = rawToBuffer(raw);
      if (!audio.length) return;
      if (deepgram?.readyState === WebSocket.OPEN) deepgram.send(audio);
      else if (pendingAudio.length < 20) pendingAudio.push(audio);
    });

    browser.on("close", closeBoth);
    browser.on("error", closeBoth);
    setTimeout(() => closeBoth(), 90_000);
  });
}
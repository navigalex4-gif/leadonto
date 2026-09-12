import { Platform } from 'react-native';

type SpeechHandle = { stop: () => void };

export function canUseBrowserSpeech(): boolean {
  if (Platform.OS !== 'web') return false;
  const root = globalThis as unknown as {
    SpeechRecognition?: new () => any;
    webkitSpeechRecognition?: new () => any;
  };
  return Boolean(root.SpeechRecognition || root.webkitSpeechRecognition);
}

export function startBrowserSpeech(
  onText: (text: string) => void,
  onError?: (message: string) => void,
  locale = 'en-IN',
): SpeechHandle | null {
  if (!canUseBrowserSpeech()) return null;
  const root = globalThis as unknown as {
    SpeechRecognition?: new () => any;
    webkitSpeechRecognition?: new () => any;
  };
  const Recognition = root.SpeechRecognition || root.webkitSpeechRecognition;
  if (!Recognition) return null;
  const recognition = new Recognition();
  recognition.lang = locale;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (event: any) => {
    const text = event.results?.[0]?.[0]?.transcript;
    if (text) onText(String(text));
  };
  recognition.onerror = (event: any) => onError?.(event?.error || 'Microphone input failed');
  try {
    recognition.start();
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Microphone could not start');
  }
  return { stop: () => { try { recognition.stop(); } catch { /* already stopped */ } } };
}

export function speakText(text: string, rate = 1.05): void {
  if (Platform.OS !== 'web') return;
  const root = globalThis as unknown as {
    speechSynthesis?: { cancel: () => void; speak: (utterance: any) => void };
    SpeechSynthesisUtterance?: new (text: string) => any;
  };
  if (!root.speechSynthesis || !root.SpeechSynthesisUtterance) return;
  root.speechSynthesis.cancel();
  const utterance = new root.SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  root.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (Platform.OS !== 'web') return;
  const synthesis = (globalThis as unknown as { speechSynthesis?: { cancel: () => void } }).speechSynthesis;
  synthesis?.cancel();
}
---
name: Native translation intent
description: Live English Guru translation requests need deterministic intent handling and a retry separate from normal coaching.
---

When a learner asks to say, speak, read, repeat, explain, or translate an English sentence in an Indian language, treat it as a translation turn, not a coaching turn. Use the most recent real English teacher sentence as the source (never a later native fallback). Route it through a dedicated translation-only request and retry generic acknowledgements.

**Why:** Short live-chat model responses repeatedly chose familiar encouragement phrases even when the broader system prompt explicitly requested a translation.

**How to apply:** Keep translation detection broad across English and native-script phrasing, pass the exact source sentence, require the full native-script translation, and guard against known generic acknowledgements. Never allow a native-script safety fallback to replace a translation turn; it can turn malformed output into the same generic “practise slowly” sentence the learner explicitly rejected.

Native-script translations can also arrive with a space between every grapheme, which makes TTS spell the reply character by character. Detect that fragmented pattern, retry with an explicit normal-word formatting instruction, then collapse accidental intra-script spacing before TTS as a final guard.

English Guru should keep the learner's speech-recognition locale set to English even when a native helper language is selected; the helper language is for tutor explanations and TTS, not English transcript display.
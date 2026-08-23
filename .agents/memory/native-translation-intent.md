---
name: Native translation intent
description: Live English Guru translation requests need deterministic intent handling and a retry separate from normal coaching.
---

When a learner asks to say, repeat, explain, or translate an English sentence in an Indian language, treat it as a translation turn, not a coaching turn. If the request refers to “what you asked,” use the immediately previous teacher sentence as the source. A generic native-language acknowledgement must trigger a concise translation-only retry.

**Why:** Short live-chat model responses repeatedly chose familiar encouragement phrases even when the broader system prompt explicitly requested a translation.

**How to apply:** Keep translation detection broad across English and native-script phrasing, pass the exact source sentence, require the full native-script translation, and guard against known generic acknowledgements.
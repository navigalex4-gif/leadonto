import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { getAI } from "./ai.js";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.post("/stt", upload.single("audio"), async (req: Request, res: Response) => {
  if (!req.file?.buffer?.length) {
    res.status(400).json({ error: "No microphone audio was received." });
    return;
  }
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      // The current project Gemini account exposes 3.6 Flash for audio input;
      // keep this isolated to transcription so existing response-model
      // selection remains unchanged.
      model: "gemini-3.6-flash",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              data: req.file.buffer.toString("base64"),
              mimeType: req.file.mimetype || "audio/webm",
            },
          },
          {
            text: `Transcribe this short microphone utterance exactly. Return only the spoken words, with no labels, commentary, or punctuation added. The speaker is using ${String(req.body.language || "English")}.`,
          },
        ],
      }],
      config: { maxOutputTokens: 8192 },
    });
    res.json({ text: response.text?.trim() ?? "" });
  } catch (error) {
    console.error("[stt] transcription failed:", error);
    res.status(502).json({ error: "Speech transcription is temporarily unavailable." });
  }
});

export default router;
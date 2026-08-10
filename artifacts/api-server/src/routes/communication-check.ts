import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { db, communicationChecksTable } from "@workspace/db";
import { generateTextWithFallback } from "./ai.js";
import { sendEmail } from "../lib/mailer.js";

const router: IRouter = Router();

const answerSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().max(5000).default(""),
});

const submitSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  targetRole: z.string().trim().max(120).optional().default(""),
  experienceLevel: z.string().trim().max(60).optional().default(""),
  anonymousId: z.string().trim().max(100).optional().default(""),
  answers: z.array(answerSchema).min(1).max(4),
  durationSeconds: z.number().int().min(0).max(120).optional().default(0),
});

type Feedback = {
  overallScore: number;
  communicationScore: number;
  confidenceScore: number;
  clarityScore: number;
  headline: string;
  strengths: string[];
  oneNextStep: string;
  summary: string;
};

function clampScore(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
}

function fallbackFeedback(answers: Array<{ answer: string }>): Feedback {
  const words = answers.map((item) => item.answer.trim().split(/\s+/).filter(Boolean).length);
  const totalWords = words.reduce((sum, value) => sum + value, 0);
  const answered = words.filter((value) => value > 0).length;
  const base = Math.max(42, Math.min(84, 48 + Math.min(24, totalWords) + answered * 5));
  return {
    overallScore: base,
    communicationScore: Math.max(35, Math.min(90, base + (answered ? 2 : -8))),
    confidenceScore: Math.max(35, Math.min(88, base - 2)),
    clarityScore: Math.max(35, Math.min(88, base + 1)),
    headline: answered ? "You have a workable foundation." : "Start by getting your voice heard.",
    strengths: answered
      ? ["You completed the speaking check", "You communicated your main idea"]
      : ["You took the first step toward practice"],
    oneNextStep: "Answer in three parts: point, example, and result.",
    summary: "This is an indicative check. Practice one spoken answer daily to build a clearer, more confident delivery.",
  };
}

function parseFeedback(raw: string, fallback: Feedback): Feedback {
  try {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned) as Record<string, unknown>;
    const strengths = Array.isArray(parsed.strengths)
      ? parsed.strengths.map(String).filter(Boolean).slice(0, 3)
      : fallback.strengths;
    return {
      overallScore: clampScore(parsed.overallScore, fallback.overallScore),
      communicationScore: clampScore(parsed.communicationScore, fallback.communicationScore),
      confidenceScore: clampScore(parsed.confidenceScore, fallback.confidenceScore),
      clarityScore: clampScore(parsed.clarityScore, fallback.clarityScore),
      headline: String(parsed.headline || fallback.headline).slice(0, 160),
      strengths: strengths.length ? strengths : fallback.strengths,
      oneNextStep: String(parsed.oneNextStep || fallback.oneNextStep).slice(0, 220),
      summary: String(parsed.summary || fallback.summary).slice(0, 360),
    };
  } catch {
    return fallback;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resultEmailHtml(name: string, feedback: Feedback): string {
  const score = (label: string, value: number) => `
    <td style="width:25%;padding:6px">
      <div style="border:1px solid #fed7aa;border-radius:12px;padding:14px 8px;text-align:center;background:#fffaf5">
        <div style="font-size:26px;font-weight:800;color:#172033">${value}<span style="font-size:12px;color:#94a3b8">/100</span></div>
        <div style="margin-top:4px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b">${label}</div>
      </div>
    </td>`;
  const strengths = feedback.strengths.map((item) => `<li style="margin:7px 0">${escapeHtml(item)}</li>`).join("");
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033">
    <div style="padding:28px 30px;background:#172033;border-radius:18px 18px 0 0;color:#fff">
      <div style="font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#fb923c">Lead Onto</div>
      <h1 style="margin:10px 0 4px;font-size:28px">Your 90-second result</h1>
      <p style="margin:0;color:#cbd5e1">Communication, confidence and clarity snapshot</p>
    </div>
    <div style="padding:26px 30px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 18px 18px">
      <p>Hi ${escapeHtml(name)},</p>
      <h2 style="margin:18px 0 8px;color:#ea580c">${escapeHtml(feedback.headline)}</h2>
      <p style="line-height:1.6;color:#475569">${escapeHtml(feedback.summary)}</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;margin:22px 0">
        <tr>
          ${score("Overall", feedback.overallScore)}
          ${score("Communication", feedback.communicationScore)}
          ${score("Confidence", feedback.confidenceScore)}
          ${score("Clarity", feedback.clarityScore)}
        </tr>
      </table>
      <h3 style="margin:22px 0 8px">What came through</h3>
      <ul style="padding-left:20px;color:#475569">${strengths}</ul>
      <div style="margin-top:22px;padding:16px;border:1px solid #fed7aa;border-radius:12px;background:#fff7ed">
        <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#c2410c">Your one next step</div>
        <div style="margin-top:7px;font-weight:700;line-height:1.5">${escapeHtml(feedback.oneNextStep)}</div>
      </div>
      <p style="margin-top:26px;color:#64748b;font-size:12px">This is an indicative practice check, not a hiring decision. Keep practising and build your confidence one answer at a time.</p>
    </div>
  </div>`;
}

router.post("/communication-checks", async (req: Request, res: Response) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide your name, a valid email, and your spoken answers." });
    return;
  }

  const input = parsed.data;
  const fallback = fallbackFeedback(input.answers);
  let feedback = fallback;

  try {
    const aiPromise = generateTextWithFallback({
      maxTokens: 420,
      prompt: `Assess this candidate's spoken communication from a short 90-second practice check.
Candidate: ${input.name}
Target role: ${input.targetRole || "Not specified"}
Experience: ${input.experienceLevel || "Not specified"}
Answers:
${input.answers.map((item, index) => `Question ${index + 1}: ${item.question}\nAnswer: ${item.answer || "(no answer)"}`).join("\n\n")}

Return JSON only with exactly these fields:
{
  "overallScore": number 0-100,
  "communicationScore": number 0-100,
  "confidenceScore": number 0-100,
  "clarityScore": number 0-100,
  "headline": "one short honest sentence",
  "strengths": ["two short specific strengths"],
  "oneNextStep": "one specific practice action",
  "summary": "one concise sentence, maximum 30 words"
}
Be encouraging but accurate. Judge only what is present in the answers; do not invent achievements or personality traits.`,
      system: "You are a concise Indian career communication coach. Never make hiring decisions. Return valid JSON only.",
    });
    const raw = await Promise.race([
      aiPromise,
      new Promise<string>((resolve) => setTimeout(() => resolve(""), 3500)),
    ]);
    if (raw.trim()) feedback = parseFeedback(raw, fallback);
  } catch {
    // The candidate still receives a useful indicative score if a provider is unavailable.
  }

  try {
    const [record] = await db.insert(communicationChecksTable).values({
      userId: req.session.userId ?? null,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      location: input.location || null,
      targetRole: input.targetRole || null,
      experienceLevel: input.experienceLevel || null,
      anonymousId: input.anonymousId || null,
      answersJson: JSON.stringify(input.answers),
      feedbackJson: JSON.stringify(feedback),
      overallScore: feedback.overallScore,
      communicationScore: feedback.communicationScore,
      confidenceScore: feedback.confidenceScore,
      clarityScore: feedback.clarityScore,
      durationSeconds: input.durationSeconds,
    }).returning({ id: communicationChecksTable.id });

    let emailSent = false;
    try {
      const sent = await sendEmail({
        to: input.email,
        subject: "Your Lead Onto 90-second communication result",
        html: resultEmailHtml(input.name, feedback),
      });
      emailSent = sent.ok && !sent.dev;
      if (!emailSent) {
        req.log.warn({ email: input.email, sent }, "communication check result email was not delivered");
      }
    } catch (err) {
      req.log.error({ err, email: input.email }, "communication check result email failed");
    }

    res.status(201).json({
      checkId: record?.id,
      feedback,
      emailSent,
      emailMessage: emailSent
        ? "Your result was sent to your email."
        : "Your result is ready here, but the email could not be delivered.",
    });
  } catch (err) {
    req.log.error({ err }, "communication check save failed");
    res.status(500).json({ error: "Your feedback could not be saved. Please try once more." });
  }
});

export default router;
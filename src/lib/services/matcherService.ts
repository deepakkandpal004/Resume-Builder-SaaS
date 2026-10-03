/**
 * Layered architecture — resume-vs-JD matching business logic.
 * The route owns auth/quota/HTTP; ranking, JD resolution and AI
 * orchestration live here.
 */
import Resume from "@/lib/models/Resume";
import { getMongoUserId } from "@/lib/utils/userHelper";
import { refundQuotaOnError } from "@/lib/middlewares/quota";
import { safeFetchText } from "@/lib/utils/safeFetch";
import { buildResumeText } from "@/lib/services/atsService";
import { ServiceError } from "./errors";
import { chatText, extractJson, GROQ_MODEL } from "./aiService";

const MAX_RESUMES = 10;

const isHttpUrl = (u: unknown): u is string =>
  typeof u === "string" && /^https?:\/\/[^\s<>"')]+$/i.test(u.trim());

// Strip a fetched job page down to readable text for the AI to match against.
// Best-effort: JS-heavy pages (Naukri) and login-walled pages (LinkedIn)
// may return only partial text.
const htmlToText = (html: string): string | null => {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text.length >= 200 ? text.slice(0, 8000) : null;
};

const clampScore = (v: unknown): number => {
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

const cleanStrArray = (arr: unknown, max = 8): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .map((s) => String(s).trim().slice(0, 60))
    .slice(0, max);
};

export interface RankedResume {
  resumeId: string;
  title: string;
  template: string;
  lastAts: number | null;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reason: string;
}

export interface MatchResult {
  company: string;
  role: string;
  jobUrl: string;
  jdText: string;
  rankings: RankedResume[];
}

export interface MatchInput {
  text: string;
  url: string;
}

/** Validate raw input. Throws 400 — call before claiming quota. */
export function parseMatchInput(input: { jobText: unknown; jobUrl: unknown }): MatchInput {
  const text = typeof input.jobText === "string" ? input.jobText.trim() : "";
  const url = isHttpUrl(input.jobUrl) ? (input.jobUrl as string).trim() : "";

  if (!text && !url) {
    throw new ServiceError("Paste the job description or a job link.", 400);
  }
  if (text && text.length > 10000) {
    throw new ServiceError("Job description is too long (max 10,000 characters).", 400);
  }
  if (text && text.length < 50 && !url) {
    throw new ServiceError(
      "Paste a longer job description (at least 50 characters) or a job link.",
      400
    );
  }
  return { text, url };
}

export async function matchResumes(
  firebaseUserId: string,
  parsed: MatchInput
): Promise<MatchResult> {
  const refund = () => refundQuotaOnError(firebaseUserId, "match");
  const { text, url } = parsed;

  const userId = await getMongoUserId(firebaseUserId);
  if (!userId) {
    await refund();
    throw new ServiceError("Unauthorized", 401);
  }

  // Resolve the JD text: pasted text wins, otherwise fetch the linked page.
  let jdText = text.length >= 50 ? text : "";
  let usedUrl = "";
  if (!jdText && url) {
    const html = await safeFetchText(url.trim());
    const pageText = html ? htmlToText(html) : null;
    if (!pageText) {
      await refund();
      throw new ServiceError(
        "Could not read the job page (it may need login). Paste the job description text instead.",
        422
      );
    }
    jdText = pageText;
    usedUrl = url;
  } else if (url) {
    usedUrl = url;
  }

  const resumes: any[] = await Resume.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(MAX_RESUMES)
    .lean();

  if (!resumes.length) {
    await refund();
    throw new ServiceError("No resumes found. Create a resume first.", 404);
  }

  const resumeInputs = resumes.map((r: any) => ({
    id: String(r._id),
    title: r.title || "Untitled resume",
    template: r.template || "classic",
    lastAts: r.lastAts?.atsScore ?? null,
    text: buildResumeText(r).slice(0, 1500),
  }));

  const resumeBlock = resumeInputs
    .map((r, i) => `[${i + 1}] id: ${r.id}\nTitle: ${r.title}\n${r.text}`)
    .join("\n\n");

  let aiResult: any;
  try {
    const raw = await chatText(
      "You are a resume-job matching expert. Compare each resume against the job description and rank them. Respond with ONLY valid JSON, no markdown, no explanation.",
      `Rank the resumes below against this job description. Score each 0-100 weighing: skills overlap 40%, role/title relevance 30%, experience relevance 30%.

JOB DESCRIPTION:
${jdText}

RESUMES:
${resumeBlock}

Return ONLY this JSON:
{
  "company": "<hiring company name, or empty string>",
  "role": "<job title, or empty string>",
  "rankings": [
    {
      "resumeId": "<id from the list above>",
      "score": <0-100>,
      "matchedSkills": ["<up to 8 skills from the resume that match the JD>"],
      "missingSkills": ["<up to 8 important JD skills missing from the resume>"],
      "reason": "<one short line on why this resume fits or doesn't>"
    }
  ]
}
Include every resume id exactly once, best first. Never invent skills the resume doesn't have.`,
      { model: GROQ_MODEL, temperature: 0.1 }
    );
    aiResult = extractJson(raw);
    if (!aiResult || !Array.isArray(aiResult.rankings)) {
      throw new Error("Invalid AI response");
    }
  } catch (err: any) {
    await refund();
    // Log the real cause server-side (no secrets in this message).
    console.error("[match] AI call failed:", String(err?.message || "").slice(0, 500));
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("AI service error. Please try again.", 500);
  }

  const byId = new Map(resumeInputs.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const rankings: RankedResume[] = (aiResult.rankings as any[])
    .filter((rk) => rk && typeof rk.resumeId === "string" && byId.has(rk.resumeId) && !seen.has(rk.resumeId))
    .map((rk) => {
      seen.add(rk.resumeId);
      const r = byId.get(rk.resumeId)!;
      return {
        resumeId: r.id,
        title: r.title,
        template: r.template,
        lastAts: r.lastAts,
        score: clampScore(rk.score),
        matchedSkills: cleanStrArray(rk.matchedSkills),
        missingSkills: cleanStrArray(rk.missingSkills),
        reason: typeof rk.reason === "string" ? rk.reason.slice(0, 200) : "",
      };
    })
    .sort((a, b) => b.score - a.score);

  if (!rankings.length) {
    await refund();
    throw new ServiceError("Could not rank resumes. Please try again.", 500);
  }

  return {
    company: typeof aiResult.company === "string" ? aiResult.company.slice(0, 120) : "",
    role: typeof aiResult.role === "string" ? aiResult.role.slice(0, 120) : "",
    jobUrl: usedUrl,
    // Normalized JD text actually used for ranking — the client reuses this
    // for "tailor in builder" so link-only input tailors real content, not the URL.
    jdText: jdText.slice(0, 10000),
    rankings,
  };
}

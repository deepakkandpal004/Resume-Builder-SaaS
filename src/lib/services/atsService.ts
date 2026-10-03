export function buildAtsPrompt(resumeText: string, jdText: string) {
  const systemContent = `You are an ATS (Applicant Tracking System) compatibility expert.
Analyze the provided resume and job description, then return ONLY valid JSON — no markdown fences,
no explanation. Compute the ats_score as an integer 0–100 using this exact weighting:
  - keyword_match_rate: 40%
  - skills_coverage_rate: 25%
  - experience_education_relevance: 20%
  - title_and_completeness: 15%

Limits:
  - Extract at most 30 keywords; exclude common stop words (the, and, is, a, etc.).
  - Return at most 15 skills gap items, highest priority first (High = >=3 JD mentions, Medium = 2, Low = 1).
  - Return 3–7 improvement suggestions ranked by score impact (integer 1–20 pts) descending.
  - Categorize skills gap items as "Technical", "Soft Skills", or "Tools/Platforms" when possible.
  - For each suggestion include the target resume section key: "summary", "experience", "education",
    "projects", "skills", or a custom section name.`;

  const userContent = `RESUME:
${resumeText}

JOB DESCRIPTION:
${jdText}

Return JSON matching exactly this schema:
{
  "ats_score": <integer 0-100>,
  "matched_keywords": ["<keyword>", ...],
  "missing_keywords": ["<keyword>", ...],
  "skills_gap": [
    { "skill": "<string>", "priority": "High|Medium|Low", "category": "<string>" }
  ],
  "suggestions": [
    { "text": "<string>", "score_impact": <integer 1-20>, "section": "<string>" }
  ]
}`;

  return [
    { role: "system", content: systemContent },
    { role: "user", content: userContent },
  ];
}

export function clampScore(value: number) {
  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  if (rounded > 100) return 100;
  return rounded;
}

export class AtsParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtsParseError";
  }
}

export function parseAtsResponse(rawContent: string) {
  const stripped = rawContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "");

  let parsed;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new AtsParseError("Failed to parse AI response");
  }

  const rawScore = parsed.ats_score;
  if (!Number.isFinite(rawScore)) {
    throw new AtsParseError("Invalid score");
  }

  const atsScore = clampScore(rawScore);

  const rawMatched = Array.isArray(parsed.matched_keywords) ? parsed.matched_keywords : [];
  const rawMissing = Array.isArray(parsed.missing_keywords) ? parsed.missing_keywords : [];
  const rawSkillsGap = Array.isArray(parsed.skills_gap) ? parsed.skills_gap : [];
  const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

  const KEYWORD_CAP = 30;
  const matchedKeywords = rawMatched.slice(0, KEYWORD_CAP);
  const remainingSlots = KEYWORD_CAP - matchedKeywords.length;
  const missingKeywords = rawMissing.slice(0, remainingSlots);

  const skillsGap = rawSkillsGap.slice(0, 15).map((item: any) => ({
    skill: item.skill ?? "",
    priority: item.priority ?? "",
    category: item.category ?? "",
  }));

  const suggestions = rawSuggestions.slice(0, 7).map((item: any) => ({
    text: item.text ?? "",
    scoreImpact: item.score_impact ?? 0,
    section: item.section ?? "",
  }));

  return {
    atsScore,
    matchedKeywords,
    missingKeywords,
    skillsGap,
    suggestions,
  };
}

export function buildResumeText(resumeDoc: any) {
  const parts: string[] = [];

  const push = (val: any) => {
    if (typeof val === "string" && val.trim().length > 0) {
      parts.push(val.trim());
    }
  };

  const pi = resumeDoc?.personal_info ?? {};
  push(pi.full_name);
  push(pi.profession);
  push(resumeDoc?.professional_summary);

  const skills = resumeDoc?.skills ?? [];
  for (const skill of skills) {
    push(skill);
  }

  const experience = resumeDoc?.experience ?? [];
  for (const exp of experience) {
    push(exp?.position);
    push(exp?.company);
    push(exp?.description);
  }

  const education = resumeDoc?.education ?? [];
  for (const edu of education) {
    push(edu?.degree);
    push(edu?.institution);
  }

  const project = resumeDoc?.project ?? [];
  for (const proj of project) {
    push(proj?.name);
    push(proj?.description);
  }

  const customSections = resumeDoc?.custom_sections ?? [];
  for (const section of customSections) {
    push(section?.content);
  }

  const certifications = resumeDoc?.certifications ?? [];
  for (const cert of certifications) {
    push(cert?.name);
    push(cert?.issuer);
  }

  const languages = resumeDoc?.languages ?? [];
  for (const lang of languages) {
    push(lang?.name);
    push(lang?.proficiency);
  }

  return parts.join(" ");
}

export function normalizeText(rawText: string) {
  if (typeof rawText !== "string") return "";
  return rawText.toLowerCase().replace(/[^a-z0-9 /-]/g, "");
}

export function checkKeywordMatch(keyword: string, normalizedResumeText: string) {
  const normalizedKeyword = normalizeText(keyword);
  if (normalizedKeyword.length === 0) return false;
  return normalizedResumeText.includes(normalizedKeyword);
}

// ---------------------------------------------------------------------------
// Layered architecture — full ATS scan workflow (extracted from the route).
// ---------------------------------------------------------------------------
import mongoose from "mongoose";
import Resume from "@/lib/models/Resume";
import AtsScore from "@/lib/models/AtsScore";
import User from "@/lib/models/User";
import getAI from "@/lib/config/ai";
import { getMongoUserId } from "@/lib/utils/userHelper";
import logger from "@/lib/observability/logger";
import { ServiceError } from "./errors";

const ATS_GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

export interface AtsScanResult {
  atsScore: number;
  scanId: unknown;
  scansRemainingToday: number | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  skillsGap: { skill: string; priority: string; category: string }[];
  suggestions: { text: string; scoreImpact: number; section: string }[];
}

export async function runAtsScan(
  firebaseUserId: string,
  input: { resumeId: unknown; jobDescription: unknown }
): Promise<AtsScanResult> {
  const { resumeId, jobDescription } = input;

  if (!resumeId || !jobDescription) {
    throw new ServiceError("resumeId and jobDescription are required.", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(resumeId as string)) {
    throw new ServiceError("Invalid resume ID.", 400);
  }
  if (
    typeof jobDescription !== "string" ||
    jobDescription.length < 50 ||
    jobDescription.length > 10000
  ) {
    throw new ServiceError("jobDescription must be between 50 and 10,000 characters.", 400);
  }

  let resume: any;
  try {
    resume = await Resume.findById(resumeId);
  } catch {
    throw new ServiceError("Database unavailable. Please try again.", 503);
  }
  if (!resume) throw new ServiceError("Resume not found.", 404);

  const mongoUserId = await getMongoUserId(firebaseUserId);
  if (resume.userId.toString() !== mongoUserId?.toString()) {
    throw new ServiceError("Access denied.", 403);
  }

  const normalizedResumeText = normalizeText(buildResumeText(resume));
  if (normalizedResumeText.trim().length === 0) {
    throw new ServiceError(
      "Resume has no content to analyze. Please add content to your resume before running an ATS scan.",
      422
    );
  }

  const messages = buildAtsPrompt(normalizedResumeText, jobDescription as string);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  let aiResponse: any;
  try {
    aiResponse = await getAI().chat.completions.create(
      {
        model: ATS_GROQ_MODEL,
        messages,
        // NOTE: gpt-oss models on Groq reject response_format json_object with 400.
        // The system prompt already enforces JSON-only output and parseAtsResponse strips fences.
        // reasoning_effort "low" stops the model from burning its token budget on
        // chain-of-thought (previously returned empty content with finish_reason "length").
        reasoning_effort: "low",
        max_completion_tokens: 4096,
      } as any,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError" || err.code === "ABORT_ERR" || err.message?.includes("abort")) {
      throw new ServiceError("Analysis timed out. Please try again.", 504);
    }
    logger.error({ status: err?.status, message: err?.message }, "ATS AI call failed");
    throw new ServiceError("AI scoring service is temporarily unavailable. Please try again.", 503);
  }

  const rawContent = aiResponse.choices[0]?.message?.content || "";
  let parsed: ReturnType<typeof parseAtsResponse>;
  try {
    parsed = parseAtsResponse(rawContent);
  } catch (err: any) {
    if (err instanceof AtsParseError) {
      const dbgMsg: any = aiResponse?.choices?.[0]?.message || {};
      logger.error(
        {
          contentPreview: String(rawContent).slice(0, 500),
          finishReason: aiResponse?.choices?.[0]?.finish_reason,
          hasReasoningContent: Boolean(dbgMsg.reasoning_content),
          reasoningPreview: String(dbgMsg.reasoning_content || "").slice(0, 500),
        },
        "ATS parse error"
      );
      if (err.message.includes("Invalid score")) {
        throw new ServiceError("AI returned an invalid score. Please try again.", 500);
      }
      throw new ServiceError("Failed to process AI analysis. Please try again.", 500);
    }
    throw new ServiceError("Failed to process AI analysis. Please try again.", 500);
  }

  const existingCount = await AtsScore.countDocuments({ resumeId });
  if (existingCount >= 10) {
    const oldest = await AtsScore.findOne({ resumeId }).sort({ createdAt: 1 });
    if (oldest) {
      try {
        await AtsScore.deleteOne({ _id: oldest._id });
      } catch {
        throw new ServiceError("Failed to save scan results. Please try again.", 500);
      }
    }
  }

  const newScan = new AtsScore({
    userId: mongoUserId,
    resumeId,
    jdSnippet: (jobDescription as string).slice(0, 500),
    atsScore: parsed.atsScore,
    matchedKeywords: parsed.matchedKeywords,
    missingKeywords: parsed.missingKeywords,
    skillsGap: parsed.skillsGap,
    suggestions: parsed.suggestions,
  });

  try {
    await newScan.save();
  } catch {
    throw new ServiceError("Failed to save scan results. Please try again.", 500);
  }

  let scansRemainingToday: number | null = null;
  try {
    const user = await User.findById(mongoUserId).select("subscriptionTier");
    if (!user || user.subscriptionTier !== "premium") {
      const utcDayStart = new Date();
      utcDayStart.setUTCHours(0, 0, 0, 0);
      const todayCount = await AtsScore.countDocuments({
        userId: mongoUserId,
        createdAt: { $gte: utcDayStart },
      });
      scansRemainingToday = Math.max(0, 1 - todayCount);
    }
  } catch {
    scansRemainingToday = null;
  }

  return {
    atsScore: parsed.atsScore,
    scanId: newScan._id,
    scansRemainingToday,
    matchedKeywords: parsed.matchedKeywords,
    missingKeywords: parsed.missingKeywords,
    skillsGap: parsed.skillsGap,
    suggestions: parsed.suggestions,
  };
}

/**
 * List the last 10 ATS scans for a resume (history view).
 */
export async function getAtsScanHistory(
  firebaseUserId: string,
  resumeId: string
): Promise<{ scans: any[] }> {
  if (!mongoose.Types.ObjectId.isValid(resumeId)) {
    throw new ServiceError("Invalid resume ID.", 400);
  }

  let resume: any;
  try {
    resume = await Resume.findById(resumeId);
  } catch {
    throw new ServiceError("Database unavailable. Please try again.", 503);
  }
  if (!resume) throw new ServiceError("Resume not found.", 404);

  const mongoUserId = await getMongoUserId(firebaseUserId);
  if (resume.userId.toString() !== mongoUserId?.toString()) {
    throw new ServiceError("Access denied.", 403);
  }

  const scans = await AtsScore.find({ resumeId }).sort({ createdAt: -1 }).limit(10);

  return {
    scans: scans.map((doc: any) => ({
      scanId: doc._id,
      atsScore: doc.atsScore,
      jdSnippet: doc.jdSnippet,
      matchedKeywords: doc.matchedKeywords,
      missingKeywords: doc.missingKeywords,
      skillsGap: doc.skillsGap,
      suggestions: doc.suggestions,
      createdAt: doc.createdAt,
    })),
  };
}

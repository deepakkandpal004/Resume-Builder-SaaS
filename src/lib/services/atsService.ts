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

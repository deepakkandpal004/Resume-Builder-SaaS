/**
 * Layered architecture — enhance/suggest business logic.
 * Pure text-in/text-out AI features. No auth, quota or HTTP here;
 * the route (controller) owns those cross-cutting concerns.
 */
import { ServiceError } from "./errors";
import { chatText, stripCodeFences, LEGACY_GROQ_MODEL } from "./aiService";

function requireText(value: unknown, max: number, field = "userContent"): string {
  if (!value) throw new ServiceError("Missing required fields", 400);
  if (typeof value !== "string" || value.length > max) {
    throw new ServiceError(`${field} must be a string of at most ${max.toLocaleString()} characters.`, 400);
  }
  return value;
}

export async function enhanceProfessionalSummary(userContent: unknown): Promise<string> {
  const text = requireText(userContent, 5000);
  return chatText(
    "You are an expert resume writer. Enhance the professional summary in 2-3 compelling sentences highlighting key skills, experience, and career objectives. Make it ATS-friendly. Return only the text, no options or formatting.",
    text,
    { model: LEGACY_GROQ_MODEL }
  );
}

export async function enhanceJobDescription(userContent: unknown): Promise<string> {
  const text = requireText(userContent, 5000);
  return chatText(
    "You are an expert resume writer. Enhance this job description in 1-2 sentences highlighting key responsibilities and achievements. Use action verbs and quantifiable results. Make it ATS-friendly. Return only the text, no options or formatting.",
    text,
    { model: LEGACY_GROQ_MODEL }
  );
}

export async function rewriteBullets(input: {
  text: unknown;
  position?: unknown;
  company?: unknown;
}): Promise<string> {
  const { text, position, company } = input;
  if (!text || (typeof text === "string" && !text.trim())) {
    throw new ServiceError("Missing description text to rewrite", 400);
  }
  if (typeof text !== "string" || text.length > 5000) {
    throw new ServiceError("text must be a string of at most 5,000 characters.", 400);
  }
  const context = [position, company].filter(Boolean).join(" at ") || "this role";
  return chatText(
    "You are an expert resume writer. Rewrite the following bullet points for a resume position. " +
      "For each bullet: use strong action verbs, include quantifiable results where possible, " +
      "keep each bullet concise (1 line), and make it ATS-friendly. " +
      "Return ONLY the rewritten bullet points, one per line, with no numbering, no dashes, no extra text.",
    `Position: ${context}\n\nCurrent bullet points:\n${text}`,
    { model: LEGACY_GROQ_MODEL }
  );
}

export interface SuggestedSkills {
  technical: string[];
  soft: string[];
  tools: string[];
}

export async function suggestSkills(input: {
  targetRole: unknown;
  currentSkills?: unknown;
}): Promise<SuggestedSkills> {
  const { targetRole, currentSkills } = input;
  if (!targetRole || (typeof targetRole === "string" && !targetRole.trim())) {
    throw new ServiceError("Target role is required.", 400);
  }
  const role = String(targetRole).trim();
  const skillsContext =
    Array.isArray(currentSkills) && currentSkills.length > 0
      ? `\nCurrent skills on resume: ${currentSkills.join(", ")}`
      : "";
  const raw = await chatText(
    "You are an expert career coach and skills advisor. Given a target role and optionally the user's current skills, suggest relevant skills they should add to their resume. " +
      "Respond with ONLY valid JSON, no markdown formatting.",
    `Target Role: ${role}${skillsContext}\n\n` +
      `Suggest 12-15 relevant skills for this role, grouped into three categories: ` +
      `"technical" (hard skills, programming languages, frameworks), ` +
      `"soft" (interpersonal skills), and ` +
      `"tools" (software, platforms, technologies). ` +
      `Avoid duplicating skills the user already has. ` +
      `Return ONLY this JSON structure:\n` +
      `{\n` +
      `  "technical": ["skill1", "skill2", ...],\n` +
      `  "soft": ["skill1", "skill2", ...],\n` +
      `  "tools": ["skill1", "skill2", ...]\n` +
      `}`,
    { model: LEGACY_GROQ_MODEL, responseFormatJson: true }
  );
  if (!raw) throw new ServiceError("Invalid AI response", 500);
  let parsed: any;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    throw new ServiceError("Failed to parse AI response as JSON", 500);
  }
  return {
    technical: Array.isArray(parsed.technical) ? parsed.technical.map(String) : [],
    soft: Array.isArray(parsed.soft) ? parsed.soft.map(String) : [],
    tools: Array.isArray(parsed.tools) ? parsed.tools.map(String) : [],
  };
}

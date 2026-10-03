/**
 * Layered architecture — resume scoring business logic.
 */
import mongoose from "mongoose";
import Resume from "@/lib/models/Resume";
import { getMongoUserId } from "@/lib/utils/userHelper";
import { ServiceError } from "./errors";
import { chatText, stripCodeFences, LEGACY_GROQ_MODEL } from "./aiService";

export interface ResumeScores {
  overall: number;
  contentQuality: number;
  completeness: number;
  skillsPresentation: number;
  formatting: number;
}

export interface ScoreResult {
  scores: ResumeScores;
  suggestions: { section: string; text: string }[];
}

const clamp = (v: unknown): number => {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

export async function scoreResume(
  firebaseUserId: string,
  input: { resumeId: unknown }
): Promise<ScoreResult> {
  const { resumeId } = input;
  if (!resumeId) throw new ServiceError("resumeId is required.", 400);
  if (!mongoose.Types.ObjectId.isValid(resumeId as string)) {
    throw new ServiceError("Invalid resume ID.", 400);
  }

  const mongoUserId = await getMongoUserId(firebaseUserId);
  const resume: any = await Resume.findOne({ _id: resumeId, userId: mongoUserId });
  if (!resume) throw new ServiceError("Resume not found.", 404);

  const systemPrompt = `You are an expert resume reviewer and career coach. Analyze the resume data and score it on these dimensions (each 0-100):

1. **overall** — Overall resume quality and effectiveness
2. **contentQuality** — Quality of experience descriptions: action verbs, quantifiable achievements, impact
3. **completeness** — How well each section is filled out; missing sections reduce the score
4. **skillsPresentation** — How skills are listed, organized, and their relevance
5. **formatting** — Structure, readability, consistency of formatting

Also provide 3-5 specific, actionable suggestions to improve the resume.

Respond with ONLY valid JSON using this structure:
{
  "scores": { "overall": 0, "contentQuality": 0, "completeness": 0, "skillsPresentation": 0, "formatting": 0 },
  "suggestions": [
    { "section": "experience|skills|summary|education|formatting", "text": "specific suggestion" }
  ]
}`;

  const userPrompt = `Score this resume data:\n${JSON.stringify({
    professional_summary: resume.professional_summary,
    skills: resume.skills,
    experience: resume.experience?.map((e: any) => ({ company: e.company, position: e.position, description: e.description, start_date: e.start_date, end_date: e.end_date })),
    education: resume.education?.map((e: any) => ({ institution: e.institution, degree: e.degree, field: e.field, gpa: e.gpa })),
    projects: resume.project?.map((p: any) => ({ name: p.name, description: p.description })),
    certifications: resume.certifications?.map((c: any) => ({ name: c.name, issuer: c.issuer })),
    languages: resume.languages,
  }, null, 2)}`;

  const raw = await chatText(systemPrompt, userPrompt, { model: LEGACY_GROQ_MODEL });
  if (!raw) throw new ServiceError("Invalid AI response", 500);

  let parseData: any;
  try {
    parseData = JSON.parse(stripCodeFences(raw));
  } catch {
    throw new ServiceError("Failed to parse AI response", 500);
  }

  return {
    scores: {
      overall: clamp(parseData.scores?.overall),
      contentQuality: clamp(parseData.scores?.contentQuality),
      completeness: clamp(parseData.scores?.completeness),
      skillsPresentation: clamp(parseData.scores?.skillsPresentation),
      formatting: clamp(parseData.scores?.formatting),
    },
    suggestions: Array.isArray(parseData.suggestions) ? parseData.suggestions.slice(0, 5) : [],
  };
}

/**
 * Layered architecture — interview question generation business logic.
 */
import mongoose from "mongoose";
import Resume from "@/lib/models/Resume";
import InterviewQuestion from "@/lib/models/InterviewQuestion";
import { getMongoUserId } from "@/lib/utils/userHelper";
import { ServiceError } from "./errors";
import { chatText, stripCodeFences, LEGACY_GROQ_MODEL } from "./aiService";
const INTERVIEW_PER_RESUME_CAP = 5;
export async function generateInterviewQuestions(firebaseUserId, input) {
    const { resumeId, targetRole, jobDescription } = input;
    const userId = await getMongoUserId(firebaseUserId);
    if (!userId)
        throw new ServiceError("Unauthorized", 401);
    if (!resumeId)
        throw new ServiceError("resumeId is required.", 400);
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
        throw new ServiceError("Invalid resume ID.", 400);
    }
    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume)
        throw new ServiceError("Resume not found.", 404);
    const fullName = resume.personal_info?.full_name || "the candidate";
    const profession = resume.personal_info?.profession || "";
    const summary = resume.professional_summary || "";
    const skills = (resume.skills || []).slice(0, 20).join(", ");
    const experienceSnippet = (resume.experience || [])
        .slice(0, 4)
        .map((e) => `${e.position} at ${e.company}: ${(e.description || "").slice(0, 200)}`)
        .join("\n");
    const projectSnippet = (resume.project || [])
        .slice(0, 3)
        .map((p) => `${p.name}: ${(p.description || "").slice(0, 150)}`)
        .join("\n");
    const education = (resume.education || [])
        .slice(0, 2)
        .map((e) => `${e.degree} in ${e.field || "?"} from ${e.institution}`)
        .join(", ");
    const role = typeof targetRole === "string" ? targetRole.trim() : "";
    const jd = typeof jobDescription === "string" ? jobDescription.trim() : "";
    const roleContext = role
        ? `Target Role: ${role}`
        : profession
            ? `Current/Target Profession: ${profession}`
            : "";
    const jdContext = jd ? `\nJob Description Snippet:\n${jd.slice(0, 500)}` : "";
    const systemPrompt = `You are an expert technical interviewer and career coach.
Generate exactly 10 interview questions with suggested answers tailored to the candidate's resume.
Respond with ONLY valid JSON — no markdown, no explanation outside the JSON.`;
    const userPrompt = `Generate 10 interview questions with suggested answers for:

Candidate: ${fullName}
${roleContext}${jdContext}

Resume snapshot:
- Professional Summary: ${summary || "N/A"}
- Skills: ${skills || "N/A"}
- Experience:
${experienceSnippet || "N/A"}
- Projects:
${projectSnippet || "N/A"}
- Education: ${education || "N/A"}

Instructions:
1. Mix the 10 questions across 4 categories: "Behavioural", "Technical", "Situational", "Role-Specific"
2. Each suggested answer must reference specific details from the candidate's resume (company names, skills, projects, etc.)
3. Keep each suggested answer to 3-5 sentences — concise but substantive
4. Return ONLY this JSON structure:
{
  "questions": [
    {
      "category": "Behavioural" | "Technical" | "Situational" | "Role-Specific",
      "question": "...",
      "suggestedAnswer": "..."
    }
  ]
}`;
    const raw = await chatText(systemPrompt, userPrompt, {
        model: LEGACY_GROQ_MODEL,
        responseFormatJson: true,
    });
    if (!raw)
        throw new ServiceError("Invalid AI response", 500);
    let parsed;
    try {
        parsed = JSON.parse(stripCodeFences(raw));
    }
    catch {
        throw new ServiceError("Failed to parse AI response as JSON", 500);
    }
    const questions = Array.isArray(parsed.questions)
        ? parsed.questions.slice(0, 10).map((q) => ({
            category: q.category || "General",
            question: q.question || "",
            suggestedAnswer: q.suggestedAnswer || "",
        }))
        : [];
    try {
        const existingCount = await InterviewQuestion.countDocuments({ resumeId });
        if (existingCount >= INTERVIEW_PER_RESUME_CAP) {
            const oldest = await InterviewQuestion.findOne({ resumeId }).sort({ createdAt: 1 });
            if (oldest)
                await InterviewQuestion.deleteOne({ _id: oldest._id });
        }
        await InterviewQuestion.create({
            userId,
            resumeId,
            targetRole: role || "",
            jobDescription: jd.slice(0, 500) || "",
            questions,
        });
    }
    catch {
        // Non-fatal: history save must not fail the generation
    }
    return { questions };
}
/**
 * List the last 5 interview question sets for a resume (history view).
 */
export async function getInterviewHistory(firebaseUserId, resumeId) {
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
        throw new ServiceError("Invalid resume ID.", 400);
    }
    const resume = await Resume.findById(resumeId);
    if (!resume)
        throw new ServiceError("Resume not found.", 404);
    const mongoUserId = await getMongoUserId(firebaseUserId);
    if (resume.userId.toString() !== mongoUserId?.toString()) {
        throw new ServiceError("Access denied.", 403);
    }
    const sets = await InterviewQuestion.find({ resumeId })
        .sort({ createdAt: -1 })
        .limit(INTERVIEW_PER_RESUME_CAP);
    return {
        sets: sets.map((s) => ({
            setId: s._id,
            targetRole: s.targetRole,
            questions: s.questions,
            createdAt: s.createdAt,
        })),
    };
}

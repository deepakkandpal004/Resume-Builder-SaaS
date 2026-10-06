/**
 * Layered architecture — resume tailoring business logic.
 * The route owns auth/quota/HTTP; everything else lives here.
 */
import mongoose from "mongoose";
import Resume from "@/lib/models/Resume";
import { getMongoUserId } from "@/lib/utils/userHelper";
import { ServiceError } from "./errors";
import { chatText, stripCodeFences, LEGACY_GROQ_MODEL } from "./aiService";
const shapeExperience = (list) => (list || []).map((exp) => ({
    company: exp.company || "",
    position: exp.position || "",
    description: exp.description || "",
}));
const shapeProjects = (list) => (list || []).map((proj) => ({
    name: proj.name || "",
    description: proj.description || "",
}));
export async function tailorResume(firebaseUserId, input) {
    const { resumeId, jobDescription } = input;
    const userId = await getMongoUserId(firebaseUserId);
    if (!userId)
        throw new ServiceError("Unauthorized", 401);
    if (!resumeId || !jobDescription) {
        throw new ServiceError("resumeId and jobDescription are required.", 400);
    }
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
        throw new ServiceError("Invalid resume ID.", 400);
    }
    if (typeof jobDescription !== "string" ||
        jobDescription.length < 50 ||
        jobDescription.length > 10000) {
        throw new ServiceError("jobDescription must be between 50 and 10,000 characters.", 400);
    }
    const resume = await Resume.findOne({ userId, _id: resumeId });
    if (!resume)
        throw new ServiceError("Resume not found.", 404);
    const systemPrompt = "You are an expert ATS optimization engine. Respond with ONLY valid JSON, no markdown formatting or text outside the JSON.";
    const userPrompt = `You are a professional resume writer. Your task is to tailor a user's resume for a specific Job Description (JD).
Modify the professional summary, skills list, experience descriptions, and project descriptions to make them ATS-friendly and directly align with the requirements of the job.

INSTRUCTIONS:
1. Rewrite 'professional_summary' to highlight skills/experience matching the JD in 2-3 sentences.
2. In 'skills', preserve their original skills and add relevant missing technical or soft skills mentioned in the JD that fit their profession. Return as a flat array of strings.
3. In 'experience', rewrite the 'description' field for each experience. Keep the original 'company' and 'position'. Rewrite the 'description' to incorporate keywords from the JD, use active verbs, highlight achievements, and retain any metrics. Do NOT change dates or other fields. The array must contain exactly the same number of items, in the exact same order.
4. In 'project', rewrite the 'description' field for each project to emphasize relevant technologies from the JD. The array must contain exactly the same number of items, in the exact same order.
5. You MUST return ONLY a valid JSON object matching this structure:
{
  "professional_summary": "rewritten summary...",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    { "company": "original company name", "position": "original position", "description": "rewritten description..." }
  ],
  "project": [
    { "name": "original project name", "description": "rewritten description..." }
  ]
}

DATA:
Job Description:
${jobDescription}

Current Resume Data:
- Professional Summary: ${resume.professional_summary || ""}
- Skills: ${JSON.stringify(resume.skills || [])}
- Experience: ${JSON.stringify((resume.experience || []).map((exp) => ({ company: exp.company, position: exp.position, description: exp.description })))}
- Projects: ${JSON.stringify((resume.project || []).map((proj) => ({ name: proj.name, description: proj.description })))}`;
    const raw = await chatText(systemPrompt, userPrompt, {
        model: LEGACY_GROQ_MODEL,
        responseFormatJson: true,
    });
    if (!raw)
        throw new ServiceError("Invalid AI response", 500);
    let parseData;
    try {
        parseData = JSON.parse(stripCodeFences(raw));
    }
    catch {
        throw new ServiceError("Failed to parse tailored data as JSON", 500);
    }
    return {
        original: {
            professional_summary: resume.professional_summary || "",
            skills: resume.skills || [],
            experience: (resume.experience || []).map((exp) => ({
                company: exp.company,
                position: exp.position,
                description: exp.description,
            })),
            project: (resume.project || []).map((proj) => ({
                name: proj.name,
                description: proj.description,
            })),
        },
        tailored: {
            professional_summary: parseData.professional_summary || "",
            skills: Array.isArray(parseData.skills) ? parseData.skills.map(String) : [],
            experience: Array.isArray(parseData.experience) ? shapeExperience(parseData.experience) : [],
            project: Array.isArray(parseData.project) ? shapeProjects(parseData.project) : [],
        },
    };
}

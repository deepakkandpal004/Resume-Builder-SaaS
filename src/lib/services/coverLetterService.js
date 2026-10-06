/**
 * Layered architecture — cover letter business logic.
 */
import mongoose from "mongoose";
import Resume from "@/lib/models/Resume";
import CoverLetter from "@/lib/models/CoverLetter";
import User from "@/lib/models/User";
import { getMongoUserId } from "@/lib/utils/userHelper";
import logger from "@/lib/observability/logger";
import { ServiceError } from "./errors";
import { chatText, LEGACY_GROQ_MODEL } from "./aiService";
const COVER_LETTER_DAILY_LIMIT = 3;
const COVER_LETTER_PER_RESUME_CAP = 10;
export async function generateCoverLetter(firebaseUserId, input) {
    const { resumeId, jobDescription, companyName, positionTitle, tone } = input;
    const userId = await getMongoUserId(firebaseUserId);
    if (!userId)
        throw new ServiceError("Unauthorized", 401);
    if (!resumeId || !jobDescription || !companyName || !positionTitle) {
        throw new ServiceError("resumeId, jobDescription, companyName and positionTitle are required.", 400);
    }
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
        throw new ServiceError("Invalid resume ID.", 400);
    }
    if (typeof jobDescription !== "string" ||
        jobDescription.length < 50 ||
        jobDescription.length > 10000) {
        throw new ServiceError("jobDescription must be between 50 and 10,000 characters.", 400);
    }
    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume)
        throw new ServiceError("Resume not found.", 404);
    const fullName = resume.personal_info?.full_name || "Candidate";
    const professionalSummary = resume.professional_summary || "";
    const topExperiences = (resume.experience || []).slice(0, 3).map((exp) => `${exp.position} at ${exp.company}: ${exp.description}`).join("\n");
    const skills = (resume.skills || []).join(", ");
    const toneMap = {
        formal: "professional and formal",
        conversational: "friendly and conversational",
        enthusiastic: "enthusiastic and energetic",
    };
    const selectedTone = toneMap[tone || "formal"] || "professional and formal";
    const systemPrompt = `You are an expert cover letter writer. Generate a compelling, ATS-friendly cover letter that:
- Matches the job description keywords naturally
- Highlights relevant experience from the resume
- Uses a ${selectedTone} tone
- Is 250-350 words long
- Has 3 paragraphs: intro (express interest + role fit), body (highlight relevant achievements), closing (call to action)
- Return ONLY the cover letter body text, no subject line, no salutation, no sign-off — just the 3 paragraphs`;
    const userPrompt = `Write a cover letter for:

Candidate Name: ${fullName}
Company: ${companyName}
Position: ${positionTitle}

Professional Summary: ${professionalSummary}

Top Experience:
${topExperiences}

Skills: ${skills}

Job Description:
${jobDescription}`;
    let generatedContent;
    try {
        const raw = await chatText(systemPrompt, userPrompt, { model: LEGACY_GROQ_MODEL });
        if (!raw)
            throw new Error("Invalid AI response");
        generatedContent = raw.trim();
    }
    catch (error) {
        logger.error("[Cover Letter] generation failed:", error?.status, error?.message);
        throw error;
    }
    const existingCount = await CoverLetter.countDocuments({ resumeId });
    if (existingCount >= COVER_LETTER_PER_RESUME_CAP) {
        const oldest = await CoverLetter.findOne({ resumeId }).sort({ createdAt: 1 });
        if (oldest) {
            await CoverLetter.deleteOne({ _id: oldest._id });
        }
    }
    const letter = await CoverLetter.create({
        userId,
        resumeId,
        companyName,
        positionTitle,
        jobDescription: jobDescription.slice(0, 2000),
        tone: ["formal", "conversational", "enthusiastic"].includes(tone) ? tone : "formal",
        content: generatedContent,
    });
    let lettersRemainingToday = null;
    try {
        const user = await User.findById(userId).select("subscriptionTier");
        if (!user || user.subscriptionTier !== "premium") {
            const utcDayStart = new Date();
            utcDayStart.setUTCHours(0, 0, 0, 0);
            const todayCount = await CoverLetter.countDocuments({
                userId,
                createdAt: { $gte: utcDayStart },
            });
            lettersRemainingToday = Math.max(0, COVER_LETTER_DAILY_LIMIT - todayCount);
        }
    }
    catch {
        lettersRemainingToday = null;
    }
    return {
        coverLetterId: letter._id,
        content: letter.content,
        companyName: letter.companyName,
        positionTitle: letter.positionTitle,
        tone: letter.tone,
        createdAt: letter.createdAt,
        lettersRemainingToday,
    };
}
export async function getCoverLetterHistory(firebaseUserId, resumeId) {
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
        throw new ServiceError("Invalid resume ID.", 400);
    }
    let resume;
    try {
        resume = await Resume.findById(resumeId);
    }
    catch {
        throw new ServiceError("Database unavailable. Please try again.", 503);
    }
    if (!resume)
        throw new ServiceError("Resume not found.", 404);
    const mongoUserId = await getMongoUserId(firebaseUserId);
    if (resume.userId.toString() !== mongoUserId?.toString()) {
        throw new ServiceError("Access denied.", 403);
    }
    const letters = await CoverLetter.find({ resumeId })
        .sort({ createdAt: -1 })
        .limit(COVER_LETTER_PER_RESUME_CAP);
    return {
        letters: letters.map((doc) => ({
            letterId: doc._id,
            companyName: doc.companyName,
            positionTitle: doc.positionTitle,
            tone: doc.tone,
            jobDescription: doc.jobDescription,
            content: doc.content,
            createdAt: doc.createdAt,
        })),
    };
}
export async function deleteCoverLetter(firebaseUserId, letterId) {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
        throw new ServiceError("Invalid cover letter ID.", 400);
    }
    let letter;
    try {
        const userId = await getMongoUserId(firebaseUserId);
        letter = await CoverLetter.findOne({ _id: letterId, userId });
    }
    catch {
        throw new ServiceError("Database unavailable. Please try again.", 503);
    }
    if (!letter)
        throw new ServiceError("Cover letter not found.", 404);
    await CoverLetter.deleteOne({ _id: letter._id });
    return { message: "Cover letter deleted successfully." };
}

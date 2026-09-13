import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import getAI from "@/lib/config/ai";
import Resume from "@/lib/models/Resume";
import CoverLetter from "@/lib/models/CoverLetter";
import User from "@/lib/models/User";
import { getMongoUserId } from "@/lib/utils/userHelper";
import { checkQuota } from "@/lib/middlewares/quota";
import mongoose from "mongoose";

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const COVER_LETTER_DAILY_LIMIT = 3;
const COVER_LETTER_PER_RESUME_CAP = 10;

const handleAIError = (error: any) => {
  const msg = error.message || "";
  if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
    return NextResponse.json({ message: "AI service is busy. Please try again in a moment." }, { status: 429 });
  }
  if (msg.includes("401") || msg.includes("API key") || msg.includes("INVALID_ARGUMENT")) {
    return NextResponse.json({ message: "AI service configuration error. Please contact support." }, { status: 500 });
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return NextResponse.json({ message: "AI request timed out. Please try again." }, { status: 504 });
  }
  return NextResponse.json({ message: "AI service error. Please try again." }, { status: 500 });
};

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const quotaResult = await checkQuota(request, authResult.userId, "coverLetter", 3);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const userId = await getMongoUserId(authResult.userId);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { resumeId, jobDescription, companyName, positionTitle, tone } = await request.json();
    if (!resumeId || !jobDescription || !companyName || !positionTitle) {
      return NextResponse.json({ message: "resumeId, jobDescription, companyName and positionTitle are required." }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return NextResponse.json({ message: "Invalid resume ID." }, { status: 400 });
    }
    if (jobDescription.length < 50 || jobDescription.length > 10000) {
      return NextResponse.json({ message: "jobDescription must be between 50 and 10,000 characters." }, { status: 400 });
    }

    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      return NextResponse.json({ message: "Resume not found." }, { status: 404 });
    }

    const fullName = resume.personal_info?.full_name || "Candidate";
    const professionalSummary = resume.professional_summary || "";
    const topExperiences = (resume.experience || []).slice(0, 3).map((exp: any) =>
      `${exp.position} at ${exp.company}: ${exp.description}`
    ).join("\n");
    const skills = (resume.skills || []).join(", ");

    const toneMap: Record<string, string> = {
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

    const response = await getAI().chat.completions.create({
      model: GROQ_MODEL as any,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    if (!response?.choices?.[0]) {
      throw new Error("Invalid AI response");
    }

    const generatedContent = (response.choices[0].message?.content || "").trim();

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
    } catch {
      lettersRemainingToday = null;
    }

    return NextResponse.json({
      coverLetterId: letter._id,
      content: letter.content,
      companyName: letter.companyName,
      positionTitle: letter.positionTitle,
      tone: letter.tone,
      createdAt: letter.createdAt,
      lettersRemainingToday,
    });
  } catch (error: any) {
    return handleAIError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import getAI from "@/lib/config/ai";
import Resume from "@/lib/models/Resume";
import InterviewQuestion from "@/lib/models/InterviewQuestion";
import { getMongoUserId } from "@/lib/utils/userHelper";
import { checkQuota } from "@/lib/middlewares/quota";
import mongoose from "mongoose";

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const INTERVIEW_PER_RESUME_CAP = 5;

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

    const quotaResult = await checkQuota(request, authResult.userId, "interview", 3);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const userId = await getMongoUserId(authResult.userId);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { resumeId, targetRole, jobDescription } = await request.json();
    if (!resumeId) {
      return NextResponse.json({ message: "resumeId is required." }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return NextResponse.json({ message: "Invalid resume ID." }, { status: 400 });
    }

    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      return NextResponse.json({ message: "Resume not found." }, { status: 404 });
    }

    const fullName = resume.personal_info?.full_name || "the candidate";
    const profession = resume.personal_info?.profession || "";
    const summary = resume.professional_summary || "";
    const skills = (resume.skills || []).slice(0, 20).join(", ");
    const experienceSnippet = (resume.experience || [])
      .slice(0, 4)
      .map((e: any) => `${e.position} at ${e.company}: ${(e.description || "").slice(0, 200)}`)
      .join("\n");
    const projectSnippet = (resume.project || [])
      .slice(0, 3)
      .map((p: any) => `${p.name}: ${(p.description || "").slice(0, 150)}`)
      .join("\n");
    const education = (resume.education || [])
      .slice(0, 2)
      .map((e: any) => `${e.degree} in ${e.field || "?"} from ${e.institution}`)
      .join(", ");

    const roleContext = targetRole?.trim()
      ? `Target Role: ${targetRole.trim()}`
      : profession
        ? `Current/Target Profession: ${profession}`
        : "";

    const jdContext =
      jobDescription?.trim()
        ? `\nJob Description Snippet:\n${jobDescription.trim().slice(0, 500)}`
        : "";

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

    const response = await getAI().chat.completions.create({
      model: GROQ_MODEL as any,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    if (!response?.choices?.[0]) {
      throw new Error("Invalid AI response");
    }

    const raw = (response.choices[0].message?.content || "")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      throw new Error("Failed to parse AI response as JSON");
    }

    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.slice(0, 10).map((q: any) => ({
          category: q.category || "General",
          question: q.question || "",
          suggestedAnswer: q.suggestedAnswer || "",
        }))
      : [];

    try {
      const existingCount = await InterviewQuestion.countDocuments({ resumeId });
      if (existingCount >= INTERVIEW_PER_RESUME_CAP) {
        const oldest = await InterviewQuestion.findOne({ resumeId }).sort({ createdAt: 1 });
        if (oldest) await InterviewQuestion.deleteOne({ _id: oldest._id });
      }
      await InterviewQuestion.create({
        userId,
        resumeId,
        targetRole: targetRole?.trim() || "",
        jobDescription: jobDescription?.trim().slice(0, 500) || "",
        questions,
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ questions });
  } catch (error: any) {
    return handleAIError(error);
  }
}

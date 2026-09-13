import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import getAI from "@/lib/config/ai";
import Resume from "@/lib/models/Resume";
import { getMongoUserId } from "@/lib/utils/userHelper";
import { checkQuota } from "@/lib/middlewares/quota";
import mongoose from "mongoose";

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

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

    const quotaResult = await checkQuota(request, authResult.userId, "scoreResume", 5);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const { resumeId } = await request.json();
    if (!resumeId) {
      return NextResponse.json({ message: "resumeId is required." }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return NextResponse.json({ message: "Invalid resume ID." }, { status: 400 });
    }

    const mongoUserId = await getMongoUserId(authResult.userId);
    const resume = await Resume.findOne({ _id: resumeId, userId: mongoUserId });
    if (!resume) {
      return NextResponse.json({ message: "Resume not found." }, { status: 404 });
    }

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

    const cleanedData = (response.choices[0].message?.content || "")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parseData;
    try {
      parseData = JSON.parse(cleanedData);
    } catch (parseError) {
      throw new Error("Failed to parse AI response");
    }

    return NextResponse.json({
      scores: {
        overall: Math.min(100, Math.max(0, parseData.scores?.overall ?? 0)),
        contentQuality: Math.min(100, Math.max(0, parseData.scores?.contentQuality ?? 0)),
        completeness: Math.min(100, Math.max(0, parseData.scores?.completeness ?? 0)),
        skillsPresentation: Math.min(100, Math.max(0, parseData.scores?.skillsPresentation ?? 0)),
        formatting: Math.min(100, Math.max(0, parseData.scores?.formatting ?? 0)),
      },
      suggestions: Array.isArray(parseData.suggestions) ? parseData.suggestions.slice(0, 5) : [],
    });
  } catch (error: any) {
    return handleAIError(error);
  }
}

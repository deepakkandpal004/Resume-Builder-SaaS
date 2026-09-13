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

    const quotaResult = await checkQuota(request, authResult.userId, "tailor", 3);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const userId = await getMongoUserId(authResult.userId);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { resumeId, jobDescription } = await request.json();
    if (!resumeId || !jobDescription) {
      return NextResponse.json({ message: "resumeId and jobDescription are required." }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return NextResponse.json({ message: "Invalid resume ID." }, { status: 400 });
    }
    if (typeof jobDescription !== "string" || jobDescription.length < 50 || jobDescription.length > 10000) {
      return NextResponse.json({ message: "jobDescription must be between 50 and 10,000 characters." }, { status: 400 });
    }

    const resume = await Resume.findOne({ userId, _id: resumeId });
    if (!resume) {
      return NextResponse.json({ message: "Resume not found." }, { status: 404 });
    }

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
- Experience: ${JSON.stringify((resume.experience || []).map((exp: any) => ({ company: exp.company, position: exp.position, description: exp.description })))}
- Projects: ${JSON.stringify((resume.project || []).map((proj: any) => ({ name: proj.name, description: proj.description })))}`;

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

    const cleanedData = (response.choices[0].message?.content || "")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parseData;
    try {
      parseData = JSON.parse(cleanedData);
    } catch (parseError) {
      throw new Error("Failed to parse tailored data as JSON");
    }

    return NextResponse.json({
      original: {
        professional_summary: resume.professional_summary || "",
        skills: resume.skills || [],
        experience: (resume.experience || []).map((exp: any) => ({ company: exp.company, position: exp.position, description: exp.description })),
        project: (resume.project || []).map((proj: any) => ({ name: proj.name, description: proj.description })),
      },
      tailored: {
        professional_summary: parseData.professional_summary || "",
        skills: Array.isArray(parseData.skills) ? parseData.skills.map(String) : [],
        experience: Array.isArray(parseData.experience) ? parseData.experience.map((exp: any) => ({
          company: exp.company || "",
          position: exp.position || "",
          description: exp.description || "",
        })) : [],
        project: Array.isArray(parseData.project) ? parseData.project.map((proj: any) => ({
          name: proj.name || "",
          description: proj.description || "",
        })) : [],
      },
    });
  } catch (error: any) {
    return handleAIError(error);
  }
}

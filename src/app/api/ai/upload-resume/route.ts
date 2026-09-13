import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import getAI from "@/lib/config/ai";
import Resume from "@/lib/models/Resume";
import { getMongoUserId } from "@/lib/utils/userHelper";
import { checkQuota } from "@/lib/middlewares/quota";

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

    const quotaResult = await checkQuota(request, authResult.userId, "uploadResume", 10);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const userId = await getMongoUserId(authResult.userId);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { resumeText, title } = await request.json();
    if (!resumeText || resumeText.trim() === "") {
      return NextResponse.json({ message: "Resume text is required" }, { status: 400 });
    }
    if (typeof resumeText !== "string" || resumeText.length > 20000) {
      return NextResponse.json({ message: "resumeText must be a string of at most 20,000 characters." }, { status: 400 });
    }

    const systemPrompt =
      "You are an expert at extracting structured data from resumes. Respond with ONLY valid JSON, no markdown or explanation.";

    const userPrompt = `Extract all information from this resume and return ONLY valid JSON:

${resumeText}

Use this exact structure:
{
  "professional_summary": "text or empty string",
  "skills": "comma-separated skills or empty string",
  "full_name": "name or empty string",
  "profession": "title or empty string",
  "email": "email or empty string",
  "phone": "phone or empty string",
  "location": "location or empty string",
  "linkedin": "url or empty string",
  "website": "url or empty string",
  "experience": [
    { "company": "name", "position": "title", "start_date": "YYYY-MM", "end_date": "YYYY-MM", "description": "text", "is_current": false }
  ],
  "project": [
    { "name": "name", "type": "type", "description": "text" }
  ],
  "education": [
    { "institution": "name", "degree": "degree", "field": "field", "graduation_date": "YYYY-MM", "gpa": "gpa" }
  ],
  "certifications": [
    { "name": "cert name", "issuer": "issuer name", "issue_date": "YYYY-MM", "expiry_date": "YYYY-MM", "credential_url": "url or empty string" }
  ],
  "languages": [
    { "name": "language name", "proficiency": "Elementary|Conversational|Professional|Fluent|Native / Bilingual" }
  ]
}`;

    const response = await getAI().chat.completions.create({
      model: GROQ_MODEL as any,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    if (!response?.choices?.[0]) {
      throw new Error("Invalid AI API response");
    }

    const cleanedData = (response.choices[0].message?.content || "")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parseData;
    try {
      parseData = JSON.parse(cleanedData);
    } catch (parseError) {
      throw new Error("Failed to parse AI response as JSON");
    }

    const sanitizeArray = (arr: any[], fields: string[]) => {
      if (!Array.isArray(arr)) return [];
      return arr.map((item) => {
        const out: any = {};
        fields.forEach((f) => {
          out[f] = f === "is_current" ? Boolean(item[f]) : item[f] ? String(item[f]) : "";
        });
        return out;
      });
    };

    const resumeData = {
      userId,
      title: title?.trim() || "Untitled Resume",
      professional_summary: parseData.professional_summary ? String(parseData.professional_summary) : "",
      skills: parseData.skills
        ? Array.isArray(parseData.skills)
          ? parseData.skills.map(String)
          : String(parseData.skills).split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
      personal_info: {
        image: "",
        full_name: parseData.full_name ? String(parseData.full_name) : "",
        profession: parseData.profession ? String(parseData.profession) : "",
        email: parseData.email ? String(parseData.email) : "",
        phone: parseData.phone ? String(parseData.phone) : "",
        location: parseData.location ? String(parseData.location) : "",
        linkedin: parseData.linkedin ? String(parseData.linkedin) : "",
        website: parseData.website ? String(parseData.website) : "",
      },
      experience: sanitizeArray(parseData.experience, [
        "company", "position", "start_date", "end_date", "description", "is_current",
      ]),
      project: sanitizeArray(parseData.project, ["name", "type", "description"]),
      education: sanitizeArray(parseData.education, [
        "institution", "degree", "field", "graduation_date", "gpa",
      ]),
      certifications: sanitizeArray(parseData.certifications, ["name", "issuer", "issue_date", "expiry_date", "credential_url"]),
      languages: Array.isArray(parseData.languages) ? parseData.languages.map((l: any) => ({ name: l.name || "", proficiency: l.proficiency || "Conversational" })) : [],
    };

    const newResume = await Resume.create(resumeData);
    return NextResponse.json({
      message: "Resume uploaded successfully",
      resumeId: newResume._id,
    });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      return NextResponse.json({ message: "Invalid resume data." }, { status: 400 });
    }
    if (error.message?.includes("JSON")) {
      return NextResponse.json({ message: "Failed to process resume. Please try again." }, { status: 500 });
    }
    return handleAIError(error);
  }
}

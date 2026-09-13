import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import getAI from "@/lib/config/ai";
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

    const quotaResult = await checkQuota(request, authResult.userId, "suggestSkills", 5);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const { targetRole, currentSkills } = await request.json();
    if (!targetRole || !targetRole.trim()) {
      return NextResponse.json({ message: "Target role is required." }, { status: 400 });
    }

    const skillsContext = Array.isArray(currentSkills) && currentSkills.length > 0
      ? `\nCurrent skills on resume: ${currentSkills.join(", ")}`
      : "";

    const response = await getAI().chat.completions.create({
      model: GROQ_MODEL as any,
      messages: [
        {
          role: "system",
          content:
            "You are an expert career coach and skills advisor. Given a target role and optionally the user's current skills, suggest relevant skills they should add to their resume. " +
            "Respond with ONLY valid JSON, no markdown formatting.",
        },
        {
          role: "user",
          content:
            `Target Role: ${targetRole.trim()}${skillsContext}\n\n` +
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
        },
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

    return NextResponse.json({
      suggestedSkills: {
        technical: Array.isArray(parsed.technical) ? parsed.technical.map(String) : [],
        soft: Array.isArray(parsed.soft) ? parsed.soft.map(String) : [],
        tools: Array.isArray(parsed.tools) ? parsed.tools.map(String) : [],
      },
    });
  } catch (error: any) {
    return handleAIError(error);
  }
}

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

    const quotaResult = await checkQuota(request, authResult.userId, "enhance", 10);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const { userContent } = await request.json();
    if (!userContent) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }
    if (typeof userContent !== "string" || userContent.length > 5000) {
      return NextResponse.json({ message: "userContent must be a string of at most 5,000 characters." }, { status: 400 });
    }

    const response = await getAI().chat.completions.create({
      model: GROQ_MODEL as any,
      messages: [
        {
          role: "system",
          content:
            "You are an expert resume writer. Enhance this job description in 1-2 sentences highlighting key responsibilities and achievements. Use action verbs and quantifiable results. Make it ATS-friendly. Return only the text, no options or formatting.",
        },
        { role: "user", content: userContent },
      ],
    });

    const enhancedContent = response.choices[0]?.message?.content || "";
    return NextResponse.json({ enhancedContent });
  } catch (error: any) {
    return handleAIError(error);
  }
}

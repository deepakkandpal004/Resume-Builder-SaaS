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

    const quotaResult = await checkQuota(request, authResult.userId, "rewrite", 10);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const { text, position, company } = await request.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ message: "Missing description text to rewrite" }, { status: 400 });
    }
    if (typeof text !== "string" || text.length > 5000) {
      return NextResponse.json({ message: "text must be a string of at most 5,000 characters." }, { status: 400 });
    }

    const context = [position, company].filter(Boolean).join(" at ") || "this role";

    const response = await getAI().chat.completions.create({
      model: GROQ_MODEL as any,
      messages: [
        {
          role: "system",
          content:
            "You are an expert resume writer. Rewrite the following bullet points for a resume position. " +
            "For each bullet: use strong action verbs, include quantifiable results where possible, " +
            "keep each bullet concise (1 line), and make it ATS-friendly. " +
            "Return ONLY the rewritten bullet points, one per line, with no numbering, no dashes, no extra text.",
        },
        {
          role: "user",
          content: `Position: ${context}\n\nCurrent bullet points:\n${text}`,
        },
      ],
    });

    const rewrittenText = response.choices[0]?.message?.content || "";
    return NextResponse.json({ rewrittenText });
  } catch (error: any) {
    return handleAIError(error);
  }
}

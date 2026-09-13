import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Resume from "@/lib/models/Resume";
import AtsScore from "@/lib/models/AtsScore";
import User from "@/lib/models/User";
import getAI from "@/lib/config/ai";
import { buildResumeText, normalizeText, buildAtsPrompt, parseAtsResponse, AtsParseError } from "@/lib/services/atsService";
import { getMongoUserId } from "@/lib/utils/userHelper";
import { checkQuota } from "@/lib/middlewares/quota";
import mongoose from "mongoose";
import logger from "@/lib/observability/logger";

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const quotaResult = await checkQuota(request, authResult.userId, "ats", 1);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const { resumeId, jobDescription } = await request.json();

    if (!resumeId || !jobDescription) {
      return NextResponse.json({ message: "resumeId and jobDescription are required." }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return NextResponse.json({ message: "Invalid resume ID." }, { status: 400 });
    }

    if (jobDescription.length < 50 || jobDescription.length > 10000) {
      return NextResponse.json({ message: "jobDescription must be between 50 and 10,000 characters." }, { status: 400 });
    }

    let resume;
    try {
      resume = await Resume.findById(resumeId);
    } catch {
      return NextResponse.json({ message: "Database unavailable. Please try again." }, { status: 503 });
    }

    if (!resume) {
      return NextResponse.json({ message: "Resume not found." }, { status: 404 });
    }

    const mongoUserId = await getMongoUserId(authResult.userId);
    if (resume.userId.toString() !== mongoUserId?.toString()) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const rawText = buildResumeText(resume);
    const normalizedResumeText = normalizeText(rawText);

    if (normalizedResumeText.trim().length === 0) {
      return NextResponse.json({
        message: "Resume has no content to analyze. Please add content to your resume before running an ATS scan.",
      }, { status: 422 });
    }

    const messages = buildAtsPrompt(normalizedResumeText, jobDescription);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let aiResponse;
    try {
      aiResponse = await getAI().chat.completions.create(
        {
          model: GROQ_MODEL as any,
          messages: messages as any,
          response_format: { type: "json_object" },
        },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError" || err.code === "ABORT_ERR" || err.message?.includes("abort")) {
        return NextResponse.json({ message: "Analysis timed out. Please try again." }, { status: 504 });
      }
      return NextResponse.json({ message: "AI scoring service is temporarily unavailable. Please try again." }, { status: 503 });
    }

    const rawContent = aiResponse.choices[0]?.message?.content || "";
    let parsed;
    try {
      parsed = parseAtsResponse(rawContent);
    } catch (err: any) {
      if (err instanceof AtsParseError) {
        logger.error({ contentPreview: String(rawContent).slice(0, 500) }, "ATS parse error");
        if (err.message.includes("Invalid score")) {
          return NextResponse.json({ message: "AI returned an invalid score. Please try again." }, { status: 500 });
        }
        return NextResponse.json({ message: "Failed to process AI analysis. Please try again." }, { status: 500 });
      }
      return NextResponse.json({ message: "Failed to process AI analysis. Please try again." }, { status: 500 });
    }

    const existingCount = await AtsScore.countDocuments({ resumeId });
    if (existingCount >= 10) {
      const oldest = await AtsScore.findOne({ resumeId }).sort({ createdAt: 1 });
      if (oldest) {
        try {
          await AtsScore.deleteOne({ _id: oldest._id });
        } catch {
          return NextResponse.json({ message: "Failed to save scan results. Please try again." }, { status: 500 });
        }
      }
    }

    const newScan = new AtsScore({
      userId: mongoUserId,
      resumeId,
      jdSnippet: jobDescription.slice(0, 500),
      atsScore: parsed.atsScore,
      matchedKeywords: parsed.matchedKeywords,
      missingKeywords: parsed.missingKeywords,
      skillsGap: parsed.skillsGap,
      suggestions: parsed.suggestions,
    });

    try {
      await newScan.save();
    } catch {
      return NextResponse.json({ message: "Failed to save scan results. Please try again." }, { status: 500 });
    }

    let scansRemainingToday = null;
    try {
      const user = await User.findById(mongoUserId).select("subscriptionTier");
      if (!user || user.subscriptionTier !== "premium") {
        const utcDayStart = new Date();
        utcDayStart.setUTCHours(0, 0, 0, 0);
        const todayCount = await AtsScore.countDocuments({
          userId: mongoUserId,
          createdAt: { $gte: utcDayStart },
        });
        scansRemainingToday = Math.max(0, 1 - todayCount);
      }
    } catch {
      scansRemainingToday = null;
    }

    return NextResponse.json({
      atsScore: parsed.atsScore,
      scanId: newScan._id,
      scansRemainingToday,
      matchedKeywords: parsed.matchedKeywords,
      missingKeywords: parsed.missingKeywords,
      skillsGap: parsed.skillsGap,
      suggestions: parsed.suggestions,
    });
  } catch (error: any) {
    logger.error("runAtsScan failed:", error.message);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

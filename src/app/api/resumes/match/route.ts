import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import getAI from "@/lib/config/ai";
import Resume from "@/lib/models/Resume";
import { getMongoUserId } from "@/lib/utils/userHelper";
import { checkQuota, refundQuotaOnError } from "@/lib/middlewares/quota";
import { buildResumeText } from "@/lib/services/atsService";

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_RESUMES = 10;

const extractJson = (text: string): any | null => {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
};

const isHttpUrl = (u: unknown): u is string =>
  typeof u === "string" && /^https?:\/\/[^\s<>"')]+$/i.test(u.trim());

// Fetch a job link and pull readable text so the AI can match against it.
// Best-effort: JS-heavy pages (Naukri) and login-walled pages (LinkedIn)
// may return only partial text.
const fetchPageText = async (url: string): Promise<string | null> => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url.trim(), {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
    return text.length >= 200 ? text.slice(0, 8000) : null;
  } catch {
    return null;
  }
};

const clampScore = (v: unknown): number => {
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

const cleanStrArray = (arr: unknown, max = 8): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .map((s) => String(s).trim().slice(0, 60))
    .slice(0, max);
};

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    // Validate input before claiming quota so bad requests don't burn it.
    const { jobText, jobUrl } = await request.json();
    const text = typeof jobText === "string" ? jobText.trim() : "";
    const url = isHttpUrl(jobUrl) ? jobUrl.trim() : "";

    if (!text && !url) {
      return NextResponse.json(
        { message: "Paste the job description or a job link." },
        { status: 400 }
      );
    }
    if (text && text.length > 10000) {
      return NextResponse.json(
        { message: "Job description is too long (max 10,000 characters)." },
        { status: 400 }
      );
    }

    const quotaResult = await checkQuota(request, authResult.userId, "match", 10);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const userId = await getMongoUserId(authResult.userId);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Resolve the JD text: pasted text wins, otherwise fetch the linked page.
    let jdText = text.length >= 50 ? text : "";
    let usedUrl = "";
    if (!jdText && url) {
      const pageText = await fetchPageText(url);
      if (!pageText) {
        await refundQuotaOnError(authResult.userId, "match");
        return NextResponse.json(
          {
            message:
              "Could not read the job page (it may need login). Paste the job description text instead.",
          },
          { status: 422 }
        );
      }
      jdText = pageText;
      usedUrl = url;
    } else if (url) {
      usedUrl = url;
    }

    const resumes = await Resume.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(MAX_RESUMES)
      .lean();

    if (!resumes.length) {
      await refundQuotaOnError(authResult.userId, "match");
      return NextResponse.json(
        { message: "No resumes found. Create a resume first." },
        { status: 404 }
      );
    }

    const resumeInputs = resumes.map((r: any) => ({
      id: String(r._id),
      title: r.title || "Untitled resume",
      template: r.template || "classic",
      lastAts: r.lastAts?.atsScore ?? null,
      text: buildResumeText(r).slice(0, 1500),
    }));

    const resumeBlock = resumeInputs
      .map((r, i) => `[${i + 1}] id: ${r.id}\nTitle: ${r.title}\n${r.text}`)
      .join("\n\n");

    let parsed: any;
    try {
      const response = await getAI().chat.completions.create({
        model: GROQ_MODEL as any,
        messages: [
          {
            role: "system",
            content:
              "You are a resume-job matching expert. Compare each resume against the job description and rank them. Respond with ONLY valid JSON, no markdown, no explanation.",
          },
          {
            role: "user",
            content: `Rank the resumes below against this job description. Score each 0-100 weighing: skills overlap 40%, role/title relevance 30%, experience relevance 30%.

JOB DESCRIPTION:
${jdText}

RESUMES:
${resumeBlock}

Return ONLY this JSON:
{
  "company": "<hiring company name, or empty string>",
  "role": "<job title, or empty string>",
  "rankings": [
    {
      "resumeId": "<id from the list above>",
      "score": <0-100>,
      "matchedSkills": ["<up to 8 skills from the resume that match the JD>"],
      "missingSkills": ["<up to 8 important JD skills missing from the resume>"],
      "reason": "<one short line on why this resume fits or doesn't>"
    }
  ]
}
Include every resume id exactly once, best first. Never invent skills the resume doesn't have.`,
          },
        ],
      });
      const content = response?.choices?.[0]?.message?.content || "";
      parsed = extractJson(content);
      if (!parsed || !Array.isArray(parsed.rankings)) {
        throw new Error("Invalid AI response");
      }
    } catch (err) {
      await refundQuotaOnError(authResult.userId, "match");
      const msg = (err as Error)?.message || "";
      if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        return NextResponse.json(
          { message: "AI service is busy. Please try again in a moment." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { message: "AI service error. Please try again." },
        { status: 500 }
      );
    }

    const byId = new Map(resumeInputs.map((r) => [r.id, r]));
    const seen = new Set<string>();
    const rankings = (parsed.rankings as any[])
      .filter((rk) => rk && typeof rk.resumeId === "string" && byId.has(rk.resumeId) && !seen.has(rk.resumeId))
      .map((rk) => {
        seen.add(rk.resumeId);
        const r = byId.get(rk.resumeId)!;
        return {
          resumeId: r.id,
          title: r.title,
          template: r.template,
          lastAts: r.lastAts,
          score: clampScore(rk.score),
          matchedSkills: cleanStrArray(rk.matchedSkills),
          missingSkills: cleanStrArray(rk.missingSkills),
          reason: typeof rk.reason === "string" ? rk.reason.slice(0, 200) : "",
        };
      })
      .sort((a, b) => b.score - a.score);

    if (!rankings.length) {
      await refundQuotaOnError(authResult.userId, "match");
      return NextResponse.json(
        { message: "Could not rank resumes. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      company: typeof parsed.company === "string" ? parsed.company.slice(0, 120) : "",
      role: typeof parsed.role === "string" ? parsed.role.slice(0, 120) : "",
      jobUrl: usedUrl,
      rankings,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
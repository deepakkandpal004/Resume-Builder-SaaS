import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import getAI from "@/lib/config/ai";
import { checkQuota, refundQuotaOnError } from "@/lib/middlewares/quota";

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const normalizeSource = (s: unknown): string => {
  if (typeof s !== "string") return "other";
  const v = s.trim().toLowerCase();
  if (v === "naukri") return "naukri";
  if (v === "linkedin") return "linkedin";
  if (v === "referral") return "referral";
  if (v === "company site" || v === "company-site" || v === "company website" || v === "careers page")
    return "company-site";
  return "other";
};

const normalizeDate = (d: unknown): string | null => {
  if (typeof d !== "string") return null;
  const v = d.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (v > today) return null;
  return v;
};

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

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

const pickMeta = (html: string, re: RegExp): string => {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim().slice(0, 300) : "";
};

// Fetch a pasted job link and pull its title/meta description so the AI
// has something to extract from when the user pastes only a URL.
const fetchPageSummary = async (url: string): Promise<string | null> => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
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
    const title = pickMeta(html, /<title[^>]*>([^<]*)<\/title>/i);
    const ogTitle = pickMeta(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)/i);
    const desc = pickMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i);
    const ogDesc = pickMeta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)/i);
    const site = pickMeta(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)/i);
    const parts = [
      title && `Page title: ${title}`,
      ogTitle && ogTitle !== title && `og:title: ${ogTitle}`,
      desc && `Meta description: ${desc}`,
      ogDesc && ogDesc !== desc && `og:description: ${ogDesc}`,
      site && `Site: ${site}`,
    ].filter(Boolean);
    return parts.length ? parts.join("\n") : null;
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const quotaResult = await checkQuota(request, authResult.userId, "extract", 30);
    if (quotaResult.error) {
      return NextResponse.json({ message: quotaResult.message }, { status: quotaResult.status });
    }

    const { text } = await request.json();
    if (typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json(
        { message: "Paste the confirmation message first." },
        { status: 400 }
      );
    }
    if (text.length > 5000) {
      return NextResponse.json(
        { message: "Pasted text is too long (max 5,000 characters)." },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    // If the user pasted mostly just a link, fetch the page for context
    // so the AI has a title/description to extract from.
    const urls = [...new Set((text.match(URL_RE) || []).map((u) => u.replace(/[.,;!?]+$/, "")))];
    const textWithoutUrls = text.replace(URL_RE, "").trim();
    let aiInput = text.trim();
    if (urls.length > 0 && textWithoutUrls.length < 40) {
      const summary = await fetchPageSummary(urls[0]);
      if (summary) {
        aiInput = `The user pasted this job link: ${urls[0]}\n${summary}\n\nOriginal pasted text:\n${text.trim()}`;
      }
    }

    let content: string;
    try {
      const response = await getAI().chat.completions.create({
        model: GROQ_MODEL as any,
        messages: [
          {
            role: "system",
            content: `You extract job application details from a pasted confirmation message (email, SMS, WhatsApp or chat text). Today is ${today}.

Return ONLY a JSON object with these keys, no markdown, no explanation:
{
  "company": string | null,
  "role": string | null,
  "source": "Naukri" | "LinkedIn" | "Referral" | "Company site" | "Other",
  "appliedDate": string | null,
  "jobUrl": string | null
}

Rules:
- "company": the employer name. "role": the job title. Never invent values; use null when unsure.
- "source": "Naukri" if the text mentions Naukri; "LinkedIn" if it mentions LinkedIn; "Company site" if it mentions a company careers page or website; "Referral" if a person referred the candidate; otherwise "Other".
- "appliedDate": YYYY-MM-DD format. Use the date mentioned in the text; resolve relative dates ("today", "yesterday") against ${today}. Use null if no date is mentioned.
- "jobUrl": a job or apply link if one appears in the text, else null. If the input starts with "The user pasted this job link:", use that URL as "jobUrl" and extract company/role from the page title/summary below it.`,
          },
          { role: "user", content: aiInput },
        ],
      });
      content = response.choices[0]?.message?.content || "";
    } catch (aiError: any) {
      await refundQuotaOnError(authResult.userId, "extract");
      throw aiError;
    }

    const parsed = extractJson(content);
    const company = typeof parsed?.company === "string" ? parsed.company.trim() : "";
    const role = typeof parsed?.role === "string" ? parsed.role.trim() : "";

    if (!company && !role) {
      await refundQuotaOnError(authResult.userId, "extract");
      return NextResponse.json(
        { message: "Could not find application details in the pasted text. Please fill the form manually." },
        { status: 422 }
      );
    }

    const rawUrl = typeof parsed?.jobUrl === "string" ? parsed.jobUrl.trim() : "";
    const jobUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : null;

    return NextResponse.json({
      extracted: {
        company: company || null,
        role: role || null,
        source: normalizeSource(parsed?.source),
        appliedDate: normalizeDate(parsed?.appliedDate),
        jobUrl,
      },
    });
  } catch (error: any) {
    const msg = error?.message || "";
    if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      return NextResponse.json(
        { message: "AI service is busy. Please try again in a moment." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { message: "Could not extract details. Please fill the form manually." },
      { status: 500 }
    );
  }
}

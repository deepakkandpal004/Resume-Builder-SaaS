/**
 * Layered architecture — application tracker business logic.
 */
import mongoose from "mongoose";
import Application, {
  APPLICATION_STATUSES,
  APPLICATION_SOURCES,
} from "@/lib/models/Application";
import { getMongoUserId } from "@/lib/utils/userHelper";
import { refundQuotaOnError } from "@/lib/middlewares/quota";
import { safeFetchText } from "@/lib/utils/safeFetch";
import { ServiceError } from "./errors";
import { chatText, extractJson } from "./aiService";

async function requireMongoUser(firebaseUserId: string) {
  const userId = await getMongoUserId(firebaseUserId);
  if (!userId) throw new ServiceError("User not found", 404);
  return userId;
}

// ── Create ──────────────────────────────────────────────────────────────

export async function createApplication(firebaseUserId: string, body: any) {
  const userId = await requireMongoUser(firebaseUserId);

  const {
    company,
    role,
    source,
    jobUrl,
    resumeId,
    versionId,
    atsScoreAtApply,
    appliedAt,
    notes,
  } = body ?? {};

  if (!company?.trim() || !role?.trim()) {
    throw new ServiceError("Company and role are required", 400);
  }

  if (source && !(APPLICATION_SOURCES as readonly string[]).includes(source)) {
    throw new ServiceError("Invalid source", 400);
  }

  const appliedDate = appliedAt ? new Date(appliedAt) : new Date();

  const application: any = await Application.create({
    userId,
    company: company.trim(),
    role: role.trim(),
    source: source || "other",
    jobUrl: jobUrl?.trim() || "",
    resumeId: resumeId || null,
    versionId: versionId || null,
    atsScoreAtApply: typeof atsScoreAtApply === "number" ? atsScoreAtApply : null,
    status: "applied",
    statusHistory: [{ status: "applied", at: appliedDate }],
    appliedAt: appliedDate,
    notes: notes?.trim() || "",
  });

  await application.populate("resumeId", "title template");
  return { message: "Application tracked", application };
}

// ── List ────────────────────────────────────────────────────────────────

export async function listApplications(firebaseUserId: string, status?: string | null) {
  const userId = await requireMongoUser(firebaseUserId);

  const filter: Record<string, unknown> = { userId };
  if (status && (APPLICATION_STATUSES as readonly string[]).includes(status)) {
    filter.status = status;
  }

  const applications = await Application.find(filter)
    .populate("resumeId", "title template")
    .sort({ appliedAt: -1 })
    .lean();

  return { applications };
}

// ── Update ──────────────────────────────────────────────────────────────

export async function updateApplication(
  firebaseUserId: string,
  id: string,
  body: any
) {
  const userId = await requireMongoUser(firebaseUserId);

  const application: any = mongoose.isValidObjectId(id)
    ? await Application.findOne({ _id: id, userId })
    : null;
  if (!application) throw new ServiceError("Application not found", 404);

  const {
    status,
    company,
    role,
    source,
    jobUrl,
    resumeId,
    versionId,
    atsScoreAtApply,
    appliedAt,
    notes,
  } = body ?? {};

  if (status !== undefined && !(APPLICATION_STATUSES as readonly string[]).includes(status)) {
    throw new ServiceError("Invalid status", 400);
  }
  if (source !== undefined && !(APPLICATION_SOURCES as readonly string[]).includes(source)) {
    throw new ServiceError("Invalid source", 400);
  }

  if (status && status !== application.status) {
    application.status = status;
    application.statusHistory.push({ status, at: new Date() });
  }
  if (company !== undefined) application.company = String(company).trim();
  if (role !== undefined) application.role = String(role).trim();
  if (source !== undefined) application.source = source;
  if (jobUrl !== undefined) application.jobUrl = String(jobUrl).trim();
  if (resumeId !== undefined) application.resumeId = resumeId || null;
  if (versionId !== undefined) application.versionId = versionId || null;
  if (atsScoreAtApply !== undefined)
    application.atsScoreAtApply = typeof atsScoreAtApply === "number" ? atsScoreAtApply : null;
  if (appliedAt !== undefined) application.appliedAt = new Date(appliedAt);
  if (notes !== undefined) application.notes = String(notes);

  await application.save();
  await application.populate("resumeId", "title template");
  return { message: "Application updated", application };
}

// ── Delete ──────────────────────────────────────────────────────────────

export async function deleteApplication(firebaseUserId: string, id: string) {
  const userId = await requireMongoUser(firebaseUserId);
  if (!mongoose.isValidObjectId(id)) {
    throw new ServiceError("Invalid application id", 400);
  }
  await Application.findOneAndDelete({ _id: id, userId });
  return { message: "Application deleted" };
}

// ── Extract details from a pasted confirmation ──────────────────────────

/** Validate before quota is claimed — bad input must not burn quota. */
export function parseExtractInput(body: any): string {
  const { text } = body ?? {};
  if (typeof text !== "string" || text.trim().length < 10) {
    throw new ServiceError("Paste the confirmation message first.", 400);
  }
  if (text.length > 5000) {
    throw new ServiceError("Pasted text is too long (max 5,000 characters).", 400);
  }
  return text;
}

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

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

const pickMeta = (html: string, re: RegExp): string => {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim().slice(0, 300) : "";
};

// Fetch a pasted job link and pull its title/meta description so the AI
// has something to extract from when the user pastes only a URL.
// Uses the SSRF-guarded fetch shared with the resume matcher.
const fetchPageSummary = async (url: string): Promise<string | null> => {
  const html = await safeFetchText(url);
  if (!html) return null;
  try {
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

export async function extractApplicationDetails(firebaseUserId: string, text: string) {
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
    content = await chatText(
      `You extract job application details from a pasted confirmation message (email, SMS, WhatsApp or chat text). Today is ${today}.

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
      aiInput
    );
  } catch (aiError: any) {
    await refundQuotaOnError(firebaseUserId, "extract");
    throw aiError;
  }

  const parsed = extractJson(content);
  const company = typeof parsed?.company === "string" ? parsed.company.trim() : "";
  const role = typeof parsed?.role === "string" ? parsed.role.trim() : "";

  if (!company && !role) {
    await refundQuotaOnError(firebaseUserId, "extract");
    throw new ServiceError(
      "Could not find application details in the pasted text. Please fill the form manually.",
      422
    );
  }

  const rawUrl = typeof parsed?.jobUrl === "string" ? parsed.jobUrl.trim() : "";
  const jobUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : null;

  return {
    extracted: {
      company: company || null,
      role: role || null,
      source: normalizeSource(parsed?.source),
      appliedDate: normalizeDate(parsed?.appliedDate),
      jobUrl,
    },
  };
}

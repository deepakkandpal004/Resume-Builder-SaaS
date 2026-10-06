/**
 * Layered architecture — resume CRUD, versioning, sharing and AI import.
 */
import mongoose from "mongoose";
import Resume from "@/lib/models/Resume";
import ResumeVersion from "@/lib/models/ResumeVersion";
import { getMongoUserId } from "@/lib/utils/userHelper";
import logger from "@/lib/observability/logger";
import { ServiceError } from "./errors";
import { chatText, stripCodeFences, mapAIError, LEGACY_GROQ_MODEL } from "./aiService";
const VERSION_RETENTION = 20;
async function requireMongoUser(firebaseUserId) {
    const userId = await getMongoUserId(firebaseUserId);
    if (!userId)
        throw new ServiceError("User not found", 404);
    return userId;
}
function requireValidId(id, message = "Invalid resume id") {
    if (!mongoose.isValidObjectId(id))
        throw new ServiceError(message, 400);
}
// ── Create ──────────────────────────────────────────────────────────────
export async function createResume(firebaseUserId, input) {
    const userId = await requireMongoUser(firebaseUserId);
    const newResume = await Resume.create({
        userId,
        title: input.title || "Untitled Resume",
        template: input.template || "classic",
    });
    return { message: "Resume created successfully", resume: newResume };
}
// ── Read ────────────────────────────────────────────────────────────────
export async function getResumeById(firebaseUserId, resumeId) {
    const userId = await requireMongoUser(firebaseUserId);
    requireValidId(resumeId);
    const resume = await Resume.findOne({ userId, _id: resumeId });
    if (!resume)
        throw new ServiceError("Resume not found", 404);
    return { resume };
}
export async function getPublicResume(resumeId) {
    requireValidId(resumeId);
    const resume = await Resume.findOne({ public: true, _id: resumeId });
    if (!resume)
        throw new ServiceError("Resume not found", 404);
    return resume;
}
// ── Update ──────────────────────────────────────────────────────────────
const EDITABLE_FIELDS = [
    "title", "template", "accent_color", "professional_summary", "skills",
    "personal_info", "experience", "project", "education", "certifications",
    "languages", "custom_sections", "style_options", "section_headings", "public",
];
const parsePayload = (payload) => {
    let data = payload;
    for (let i = 0; i < 2; i++) {
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            }
            catch {
                break;
            }
        }
    }
    if (!data || typeof data !== "object")
        throw new Error("INVALID_RESUME_DATA");
    return data;
};
const buildSafeUpdate = (payload) => {
    const data = parsePayload(payload);
    const safeUpdate = {};
    for (const key of EDITABLE_FIELDS) {
        if (data[key] !== undefined)
            safeUpdate[key] = data[key];
    }
    if (!safeUpdate.personal_info)
        safeUpdate.personal_info = {};
    return safeUpdate;
};
export async function updateResume(firebaseUserId, input) {
    const userId = await requireMongoUser(firebaseUserId);
    requireValidId(input.resumeId);
    const existingResume = await Resume.findOne({ userId, _id: input.resumeId });
    let safeUpdate;
    try {
        safeUpdate = buildSafeUpdate(input.resumeData);
    }
    catch {
        throw new ServiceError("Invalid resumeData payload", 400);
    }
    if (safeUpdate.personal_info && safeUpdate.personal_info.image === undefined) {
        safeUpdate.personal_info.image = existingResume?.personal_info?.image || "";
    }
    // Image uploads are a placeholder for now — keep the existing image.
    if (input.imageFile) {
        logger.info("Image upload requested but ImageKit SDK needs configuration");
    }
    if (existingResume) {
        await ResumeVersion.create({
            userId,
            resumeId: input.resumeId,
            label: "",
            snapshot: existingResume.toObject(),
        });
        const versions = await ResumeVersion.find({ resumeId: input.resumeId })
            .sort({ createdAt: -1 })
            .lean();
        if (versions.length > VERSION_RETENTION) {
            const toDelete = versions.slice(VERSION_RETENTION).map((v) => v._id);
            await ResumeVersion.deleteMany({ _id: { $in: toDelete } });
        }
    }
    const resume = await Resume.findOneAndUpdate({ userId, _id: input.resumeId }, safeUpdate, { new: true });
    if (!resume)
        throw new ServiceError("Resume not found", 404);
    return { message: "Saved successfully", resume };
}
// ── Delete ──────────────────────────────────────────────────────────────
export async function deleteResume(firebaseUserId, resumeId) {
    const userId = await requireMongoUser(firebaseUserId);
    requireValidId(resumeId);
    await Resume.findOneAndDelete({ userId, _id: resumeId });
    return { message: "Resume deleted successfully" };
}
// ── Duplicate ───────────────────────────────────────────────────────────
export async function duplicateResume(firebaseUserId, resumeId) {
    const userId = await requireMongoUser(firebaseUserId);
    requireValidId(resumeId);
    const original = (await Resume.findOne({ userId, _id: resumeId }).lean());
    if (!original)
        throw new ServiceError("Resume not found", 404);
    const { _id, createdAt, updatedAt, __v, ...rest } = original;
    const copy = await Resume.create({
        ...rest,
        title: `${original.title} (Copy)`,
        public: false,
    });
    return { message: "Resume duplicated", resume: copy };
}
// ── Versions ────────────────────────────────────────────────────────────
export async function listResumeVersions(firebaseUserId, resumeId) {
    const userId = await requireMongoUser(firebaseUserId);
    requireValidId(resumeId);
    const resume = await Resume.findOne({ userId, _id: resumeId });
    if (!resume)
        throw new ServiceError("Resume not found", 404);
    const versions = await ResumeVersion.find({ resumeId })
        .select("createdAt label _id")
        .sort({ createdAt: -1 })
        .lean();
    return { versions };
}
export async function restoreResumeVersion(firebaseUserId, resumeId, versionId) {
    const userId = await requireMongoUser(firebaseUserId);
    requireValidId(resumeId, "Invalid id");
    requireValidId(versionId, "Invalid id");
    const resume = await Resume.findOne({ userId, _id: resumeId });
    if (!resume)
        throw new ServiceError("Resume not found", 404);
    const version = await ResumeVersion.findOne({ _id: versionId, resumeId });
    if (!version)
        throw new ServiceError("Version not found", 404);
    const { _id, __v, userId: vUserId, resumeId: vResumeId, createdAt, updatedAt, ...snapshot } = version.snapshot;
    const restored = await Resume.findOneAndUpdate({ userId, _id: resumeId }, snapshot, { new: true });
    return { message: "Restored successfully", resume: restored };
}
// ── Share ───────────────────────────────────────────────────────────────
export async function toggleShare(firebaseUserId, input) {
    const userId = await getMongoUserId(firebaseUserId);
    if (!userId)
        throw new ServiceError("Unauthorized", 401);
    const { resumeId, share } = input;
    if (!mongoose.isValidObjectId(resumeId)) {
        throw new ServiceError("Invalid resume id", 400);
    }
    if (typeof share !== "boolean") {
        throw new ServiceError("Invalid share flag", 400);
    }
    const resume = await Resume.findOneAndUpdate({ _id: resumeId, userId }, { public: share }, { new: true }).select("_id public");
    if (!resume)
        throw new ServiceError("Resume not found", 404);
    return { resumeId: String(resume._id), public: resume.public };
}
// ── AI import (PDF upload → structured resume) ──────────────────────────
export function parseUploadInput(body) {
    const { resumeText, title } = body ?? {};
    if (!resumeText || (typeof resumeText === "string" && resumeText.trim() === "")) {
        throw new ServiceError("Resume text is required", 400);
    }
    if (typeof resumeText !== "string" || resumeText.length > 20000) {
        throw new ServiceError("resumeText must be a string of at most 20,000 characters.", 400);
    }
    return { resumeText, title };
}
export async function importResumeFromText(firebaseUserId, input) {
    const userId = await getMongoUserId(firebaseUserId);
    if (!userId)
        throw new ServiceError("Unauthorized", 401);
    const systemPrompt = "You are an expert at extracting structured data from resumes. Respond with ONLY valid JSON, no markdown or explanation.";
    const userPrompt = `Extract all information from this resume and return ONLY valid JSON:

${input.resumeText}

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
    let parseData;
    try {
        const raw = await chatText(systemPrompt, userPrompt, { model: LEGACY_GROQ_MODEL });
        if (!raw)
            throw new Error("Invalid AI API response");
        try {
            parseData = JSON.parse(stripCodeFences(raw));
        }
        catch {
            throw new Error("Failed to parse AI response as JSON");
        }
    }
    catch (error) {
        if (error.name === "ValidationError") {
            throw new ServiceError("Invalid resume data.", 400);
        }
        if (error.message?.includes("JSON")) {
            throw new ServiceError("Failed to process resume. Please try again.", 500);
        }
        throw mapAIError(error);
    }
    const sanitizeArray = (arr, fields) => {
        if (!Array.isArray(arr))
            return [];
        return arr.map((item) => {
            const out = {};
            fields.forEach((f) => {
                out[f] = f === "is_current" ? Boolean(item[f]) : item[f] ? String(item[f]) : "";
            });
            return out;
        });
    };
    try {
        const newResume = await Resume.create({
            userId,
            title: input.title?.trim() || "Untitled Resume",
            professional_summary: parseData.professional_summary ? String(parseData.professional_summary) : "",
            skills: parseData.skills
                ? Array.isArray(parseData.skills)
                    ? parseData.skills.map(String)
                    : String(parseData.skills).split(",").map((s) => s.trim()).filter(Boolean)
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
            languages: Array.isArray(parseData.languages)
                ? parseData.languages.map((l) => ({ name: l.name || "", proficiency: l.proficiency || "Conversational" }))
                : [],
        });
        return { message: "Resume uploaded successfully", resumeId: newResume._id };
    }
    catch (error) {
        if (error.name === "ValidationError") {
            throw new ServiceError("Invalid resume data.", 400);
        }
        throw error;
    }
}

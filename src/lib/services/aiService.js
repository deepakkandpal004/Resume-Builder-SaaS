/**
 * Layered architecture — shared AI plumbing for the service layer.
 * All Groq chat calls go through here so model selection, JSON extraction
 * and provider-error mapping live in one place instead of every route.
 */
import getAI from "@/lib/config/ai";
import { ServiceError } from "./errors";
export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
/** Fallback each feature used before the model env was standardized. */
export const LEGACY_GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
/** Map a Groq/provider failure to a user-facing ServiceError (never leaks internals). */
export function mapAIError(error) {
    // Never re-map an error that is already user-facing.
    if (error instanceof ServiceError)
        return error;
    const msg = error?.message || "";
    if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        return new ServiceError("AI service is busy. Please try again in a moment.", 429);
    }
    if (msg.includes("401") || msg.includes("API key") || msg.includes("INVALID_ARGUMENT")) {
        return new ServiceError("AI service configuration error. Please contact support.", 500);
    }
    if (msg.includes("timeout") || msg.includes("timed out")) {
        return new ServiceError("AI request timed out. Please try again.", 504);
    }
    return new ServiceError("AI service error. Please try again.", 500);
}
/** Single chat completion returning raw text. Throws ServiceError on provider failure. */
export async function chatText(system, user, options = {}) {
    const { model = GROQ_MODEL, temperature, responseFormatJson, reasoningEffort, maxCompletionTokens, signal, } = options;
    try {
        const response = await getAI().chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
            ...(temperature !== undefined ? { temperature } : {}),
            ...(responseFormatJson ? { response_format: { type: "json_object" } } : {}),
            ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
            ...(maxCompletionTokens ? { max_completion_tokens: maxCompletionTokens } : {}),
        }, signal ? { signal } : undefined);
        return response?.choices?.[0]?.message?.content || "";
    }
    catch (error) {
        throw mapAIError(error);
    }
}
/** Remove ```json / ``` fences the model sometimes adds around JSON output. */
export function stripCodeFences(text) {
    return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}
/** Extract the first {...} JSON object from free-form model output. */
export function extractJson(text) {
    const cleaned = stripCodeFences(text);
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start)
        return null;
    try {
        return JSON.parse(cleaned.slice(start, end + 1));
    }
    catch {
        return null;
    }
}

"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Plus,
} from "lucide-react";
import api from "@/lib/config/apiClient";

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-muted";

const scoreColor = (s) =>
  s >= 75 ? "bg-emerald-500" : s >= 50 ? "bg-amber-500" : "bg-rose-500";

const guessSource = (jobUrl) => {
  if (!jobUrl) return "other";
  const u = jobUrl.toLowerCase();
  if (u.includes("naukri")) return "naukri";
  if (u.includes("linkedin")) return "linkedin";
  return "other";
};

const Matcher = () => {
  const { user, loading } = useSelector((state) => state.auth);
  const router = useRouter();

  const [jdText, setJdText] = useState("");
  const [matching, setMatching] = useState(false);
  const [result, setResult] = useState(null);

  const findBestMatch = async () => {
    const input = jdText.trim();
    if (!input || matching) return;
    const isUrl = /^https?:\/\/[^\s]+$/i.test(input);
    if (!isUrl && input.length < 50) {
      toast.error("Paste the full job description (at least 50 characters) or a job link.");
      return;
    }
    setMatching(true);
    try {
      const { data } = await api.post("/api/resumes/match", {
        jobText: isUrl ? "" : input,
        jobUrl: isUrl ? input : "",
      });
      // Prefer the normalized JD text the server actually ranked against —
      // for link-only input this is the fetched page text, not the URL.
      setResult({ ...data, jdText: data.jdText && data.jdText.length >= 50 ? data.jdText : input });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not match resumes");
    } finally {
      setMatching(false);
    }
  };

  const tailorInBuilder = (resumeId) => {
    try {
      sessionStorage.setItem("cf_prefill_jd", result?.jdText || "");
      // Tell the builder to open the "Tailor to JD" tab on arrival
      sessionStorage.setItem("cf_open_tailor", "1");
    } catch {
      // storage unavailable — builder will just open without a prefilled JD
    }
    router.push(`/app/builder/${resumeId}`);
  };

  const trackApplication = (r) => {
    const q = new URLSearchParams({
      resumeId: r.resumeId,
      company: result?.company || "",
      role: result?.role || "",
      jobUrl: result?.jobUrl || "",
      source: guessSource(result?.jobUrl),
    });
    router.push(`/app/applications?${q.toString()}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-line/30" />
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-line/30" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-muted">Please log in to use the resume matcher.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={() => router.push("/app")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Dashboard
      </button>

      <h1 className="text-2xl font-bold text-ink">Resume matcher</h1>
      <p className="mt-1 text-sm text-muted">
        Paste a job description — AI ranks your resumes by fit so you know which one to tailor.
      </p>

      {/* JD input */}
      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <label className="mb-2 block text-sm font-medium text-ink">
          Job description
        </label>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={8}
          maxLength={10000}
          placeholder="Paste the full job description here, or just a job link…"
          className={`${inputClass} resize-none`}
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted">
            {jdText.length.toLocaleString()} / 10,000
          </p>
          <button
            type="button"
            onClick={findBestMatch}
            disabled={!jdText.trim() || matching}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {matching && <Loader2 className="size-4 animate-spin" />}
            {matching ? "Matching…" : "Find best match"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Tip: pasting the JD text gives the most accurate match. Links work best for
          public job pages — LinkedIn links usually need login.
        </p>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6">
          {(result.company || result.role) && (
            <p className="mb-4 text-sm text-muted">
              Matching against{" "}
              <span className="font-medium text-ink">
                {[result.role, result.company].filter(Boolean).join(" · ")}
              </span>
            </p>
          )}
          <div className="space-y-3">
            {result.rankings.map((r, i) => (
              <div
                key={r.resumeId}
                className={`rounded-2xl border p-5 ${
                  i === 0
                    ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                    : "border-line bg-surface"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="size-4 shrink-0 text-muted" />
                      <p className="truncate text-sm font-semibold text-ink">{r.title}</p>
                      {i === 0 && (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                          Best match
                        </span>
                      )}
                    </div>
                    {r.reason && (
                      <p className="mt-1.5 text-sm text-body">{r.reason}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-bold text-ink">{r.score}</p>
                    <p className="text-[11px] text-muted">/ 100</p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/40">
                  <div
                    className={`h-full rounded-full ${scoreColor(r.score)}`}
                    style={{ width: `${r.score}%` }}
                  />
                </div>

                {/* Skills */}
                <div className="mt-3 space-y-2">
                  {r.matchedSkills?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Check className="size-3.5 text-emerald-500" /> Matched:
                      </span>
                      {r.matchedSkills.map((s, j) => (
                        <span
                          key={j}
                          className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.missingSkills?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted">Missing:</span>
                      {r.missingSkills.map((s, j) => (
                        <span
                          key={j}
                          className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-700 dark:text-amber-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => tailorInBuilder(r.resumeId)}
                    className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-xs font-medium text-surface transition hover:opacity-90 dark:bg-surface dark:text-ink"
                  >
                    Tailor in builder
                    <ArrowRight className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => trackApplication(r)}
                    className="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-xs font-medium text-ink transition hover:bg-line/20"
                  >
                    <Plus className="size-3.5" />
                    Track application
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Matcher;

"use client";
/**
 * Calculates how complete a resume is as a percentage (0–100).
 * Each section is weighted by its importance to a strong resume.
 */

export interface ResumeDataForCompleteness {
  personal_info?: {
    full_name?: string;
    email?: string;
    phone?: string;
    location?: string;
    profession?: string;
  };
  professional_summary?: string;
  experience?: unknown[];
  education?: unknown[];
  skills?: unknown[];
  project?: unknown[];
  certifications?: unknown[];
  languages?: unknown[];
}

interface CompletenessCheck {
  label: string;
  weight: number;
  test: (r: ResumeDataForCompleteness) => boolean;
}

const CHECKS: CompletenessCheck[] = [
  // Personal info — 30 pts total
  { label: "Full name",       weight: 8,  test: (r) => !!r.personal_info?.full_name?.trim() },
  { label: "Email",           weight: 8,  test: (r) => !!r.personal_info?.email?.trim() },
  { label: "Phone",           weight: 5,  test: (r) => !!r.personal_info?.phone?.trim() },
  { label: "Location",        weight: 4,  test: (r) => !!r.personal_info?.location?.trim() },
  { label: "Profession",      weight: 5,  test: (r) => !!r.personal_info?.profession?.trim() },
  // Summary — 15 pts
  { label: "Professional summary", weight: 15, test: (r) => (r.professional_summary?.trim().length ?? 0) > 50 },
  // Experience — 25 pts
  { label: "Work experience", weight: 25, test: (r) => (r.experience?.length ?? 0) > 0 },
  // Education — 10 pts
  { label: "Education",       weight: 10, test: (r) => (r.education?.length ?? 0) > 0 },
  // Skills — 10 pts
  { label: "Skills",          weight: 10, test: (r) => (r.skills?.length ?? 0) >= 3 },
  // Projects — 5 pts (bonus)
  { label: "Projects",        weight: 5,  test: (r) => (r.project?.length ?? 0) > 0 },
  // Certifications — 5 pts (bonus)
  { label: "Certifications",  weight: 5,  test: (r) => (r.certifications?.length ?? 0) > 0 },
  // Languages — 3 pts (bonus)
  { label: "Languages",       weight: 3,  test: (r) => (r.languages?.length ?? 0) > 0 },
];

export interface CompletenessResult {
  /** integer 0–100 */
  score: number;
  /** labels of incomplete sections sorted by weight descending */
  missing: string[];
}

export function getCompleteness(resumeData: ResumeDataForCompleteness): CompletenessResult {
  let earned = 0;
  const missing: { label: string; weight: number }[] = [];

  for (const check of CHECKS) {
    if (check.test(resumeData)) {
      earned += check.weight;
    } else {
      missing.push({ label: check.label, weight: check.weight });
    }
  }

  missing.sort((a, b) => b.weight - a.weight);

  return {
    score: Math.min(100, earned),
    missing: missing.map((m) => m.label),
  };
}

export interface CompletenessColors {
  bar: string;
  text: string;
}

export function getCompletenessColor(score: number): CompletenessColors {
  if (score >= 80) return { bar: "bg-teal-500", text: "text-teal-600 dark:text-teal-400" };
  if (score >= 50) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };
}

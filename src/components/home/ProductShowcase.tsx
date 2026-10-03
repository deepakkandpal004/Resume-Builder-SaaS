"use client";
import { Check, ArrowRight, ChevronDown } from "lucide-react";
import Reveal from "./Reveal";
import ClassicTemplate from "../templates/ClassicTemplate";
import ModernTemplate from "../templates/ModernTemplate";
import MinimalTemplate from "../templates/MinimalTemplate";
import ExecutiveTemplate from "../templates/ExecutiveTemplate";
import CreativeTemplate from "../templates/CreativeTemplate";
import CompactTemplate from "../templates/CompactTemplate";
import { dummyResumeData } from "@/assets/assets";

/*
  Product tour as a detailed walkthrough, not tabs.
  Each feature gets its own row: what it does in plain words,
  three concrete points, and the screen itself.
*/

/* ---------- screen visuals (sample data) ---------- */

/* Mirrors the real builder: step nav on the left, live template preview on the right. */
const BuilderVisual = () => {
  const data = dummyResumeData[0];
  const steps: string[] = [
    "Personal Info",
    "Summary",
    "Experience",
    "Education",
    "Projects",
    "Skills",
  ];
  const tools: string[] = ["ATS Score", "Tailor to JD", "Cover Letter"];
  return (
    <div className="flex min-h-[420px] bg-canvas">
      <div className="w-40 shrink-0 border-r border-line bg-surface p-3 sm:w-44">
        <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
          Content
        </p>
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
              i === 2
                ? "bg-emerald-500/10 font-semibold text-emerald-700"
                : "text-body"
            }`}
          >
            {i < 2 ? (
              <Check className="size-3 shrink-0 text-emerald-500" />
            ) : i === 2 ? (
              <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
            ) : (
              <span className="size-1.5 shrink-0 rounded-full bg-line" />
            )}
            <span className="truncate">{s}</span>
          </div>
        ))}
        <p className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted">
          Tools
        </p>
        {tools.map((t) => (
          <div
            key={t}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-body"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-line" />
            <span className="truncate">{t}</span>
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1 p-4">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted">
          Live preview
        </p>
        <div className="relative h-80 overflow-hidden rounded-lg border border-line bg-white">
          <div
            style={{
              transform: "scale(0.32)",
              width: "312.5%",
              transformOrigin: "top left",
            }}
          >
            <ModernTemplate
              data={data}
              accentColor="#10b981"
              styleOptions={{
                fontSize: 11,
                lineSpacing: 1.3,
                pageSize: "letter",
              }}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
        </div>
      </div>
    </div>
  );
};

/* Mirrors the real tailor panel: toolbar + diff cards with Before/After. */
const TailorVisual = () => (
  <div className="min-h-[420px] space-y-3 bg-canvas p-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <Check className="size-4 text-teal-500" />
        Tailored for this role
      </p>
      <span className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-medium text-white">
        Apply to Resume
      </span>
    </div>

    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-2 p-4">
        <span className="size-2 shrink-0 rounded-full bg-teal-500" />
        <span className="truncate text-sm font-medium text-ink">
          Professional Summary
        </span>
        <span className="hidden text-xs text-muted sm:inline">
          — 4 new keywords added
        </span>
      </div>
      <div className="border-t border-line">
        <div className="p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-rose-500">
            Before
          </p>
          <p className="text-sm leading-relaxed text-body">
            MERN developer with 2 years of experience building dashboards
            and REST APIs.
          </p>
        </div>
        <div className="border-t border-line bg-teal-50/50 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-teal-600">
            After
          </p>
          <p className="text-sm leading-relaxed text-teal-800">
            MERN developer with 2 years of experience building scalable
            dashboards and REST APIs, with Redis caching and Docker-based
            deployments.
          </p>
        </div>
      </div>
    </div>

    {[
      { label: "Skills", summary: "3 new skills added" },
      { label: "Experience", summary: "2 entries updated" },
    ].map((c) => (
      <div
        key={c.label}
        className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-teal-500" />
          <span className="truncate text-sm font-medium text-ink">
            {c.label}
          </span>
          <span className="hidden text-xs text-muted sm:inline">
            — {c.summary}
          </span>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted" />
      </div>
    ))}

    <p className="pt-1 text-center text-[11px] font-semibold text-muted">
      Every suggestion shows before and after — nothing changes without your
      approval.
    </p>
  </div>
);

/* Mirrors the real ATS results panel: Score Summary + Keywords sections. */
const AtsVisual = () => {
  const stats: { value: string; label: string; color: string }[] = [
    { value: "77", label: "Score", color: "text-brand-600" },
    { value: "30", label: "Matched", color: "text-green-600" },
    { value: "5", label: "Missing", color: "text-red-500" },
    { value: "8", label: "Gaps", color: "text-amber-500" },
  ];
  return (
    <div className="min-h-[420px] space-y-4 bg-canvas p-6">
      <p className="text-xs text-muted">Last analyzed: 2 hours ago</p>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <p className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
          Score Summary
        </p>
        <div className="flex flex-wrap items-center gap-4 p-4">
          <div className="relative size-24 shrink-0">
            <svg viewBox="0 0 96 96" className="size-24 -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                strokeWidth="10"
                stroke="var(--line)"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                className="stroke-brand-600"
                strokeDasharray={`${0.77 * 251.3} 251.3`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-ink">
              77
            </span>
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex min-w-[68px] flex-1 flex-col items-center rounded-lg border border-line bg-canvas px-3 py-2.5"
              >
                <span className={`text-xl font-bold ${s.color}`}>
                  {s.value}
                </span>
                <span className="mt-0.5 text-xs text-muted">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end border-t border-line p-3">
          <span className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white">
            Create tailored draft
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <p className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
          Keywords
        </p>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">
              Matched: 4
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["React", "Node.js", "REST APIs", "MongoDB"].map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
              Missing: 2
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["Docker", "Redis"].map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Real template renders, scaled down — the same components the app uses. */
const tourTemplates: { name: string; accent: string; component: any }[] = [
  { name: "Modern", accent: "#10b981", component: ModernTemplate },
  { name: "Classic", accent: "#6366f1", component: ClassicTemplate },
  { name: "Minimal", accent: "#2dd4bf", component: MinimalTemplate },
  { name: "Executive", accent: "#2563EB", component: ExecutiveTemplate },
  { name: "Creative", accent: "#E11D48", component: CreativeTemplate },
  { name: "Compact", accent: "#D97706", component: CompactTemplate },
];

const TemplatesVisual = () => {
  const data = dummyResumeData[0];
  return (
    <div className="bg-canvas p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tourTemplates.map((t) => {
          const Template = t.component;
          return (
            <div
              key={t.name}
              className="overflow-hidden rounded-xl border border-line bg-surface"
            >
              <div className="relative h-44 overflow-hidden bg-white">
                <div
                  className="origin-top-left"
                  style={{
                    transform: "scale(0.32)",
                    width: "312.5%",
                    transformOrigin: "top left",
                  }}
                >
                  <Template
                    data={data}
                    accentColor={t.accent}
                    styleOptions={{
                      fontSize: 11,
                      lineSpacing: 1.3,
                      pageSize: "letter",
                    }}
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
              </div>
              <p className="border-t border-line px-3 py-2 text-xs font-bold text-ink">
                {t.name}
              </p>
            </div>
          );
        })}
      </div>
      <p className="pt-5 text-center text-[11px] font-semibold text-muted">
        Switch templates anytime — your content stays intact.
      </p>
    </div>
  );
};

const ScreenPanel = ({ children }: { children: React.ReactNode }) => (
  <div className="fx-panel overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-32px_rgba(6,78,59,0.18)]">
    {children}
  </div>
);

interface TourFeature {
  n: string;
  name: string;
  tagline: string;
  desc: string;
  bullets: string[];
  visual: React.ReactNode;
}

const features: TourFeature[] = [
  {
    n: "01",
    name: "Resume builder",
    tagline: "A guided builder, not a blank canvas.",
    desc: "Fourteen steps take you from personal info to interview prep. Every step pairs a focused form with a live preview, so you always see exactly what a recruiter will see, and a completion tracker shows what is left.",
    bullets: [
      "Live preview with zoom — switch templates and accent colors without losing content",
      "Import your existing PDF and keep editing from there",
      "One-click export to a print-ready one-page PDF",
    ],
    visual: <BuilderVisual />,
  },
  {
    n: "02",
    name: "Tailor to JD",
    tagline: "Rewrite for the role. Approve every line.",
    desc: "Paste any job description, or just the job link. The tailor rewrites your summary, experience bullets, and skills to match the role, and shows each suggestion as a before-and-after diff. Coming from the matcher, the JD arrives prefilled.",
    bullets: [
      "Before-and-after diffs for summary, bullets, and skills",
      "Every change needs your approval — nothing is rewritten silently",
      "One click in the matcher sends the JD straight into the tailor",
    ],
    visual: <TailorVisual />,
  },
  {
    n: "03",
    name: "ATS checker",
    tagline: "Know your score before you apply.",
    desc: "Paste the job description and get an ATS compatibility score with the exact gaps spelled out. See which required keywords you already cover and which ones you are missing, then close the gaps before the application goes out.",
    bullets: [
      "A score out of 100 with a breakdown you can act on",
      "Missing and covered keywords, mapped to the actual job post",
      "Re-check after tailoring to watch the score climb",
    ],
    visual: <AtsVisual />,
  },
  {
    n: "04",
    name: "Templates",
    tagline: "Six layouts. Zero rework.",
    desc: "Switch between six professional layouts in one click — your content, section order, and styling choices stay exactly as they were. Every template uses clean, parser-friendly structure, and the PDF export is print-ready.",
    bullets: [
      "One-click switching with content fully preserved",
      "Parser-friendly structure built for ATS software",
      "Template and accent-color controls right in the builder",
    ],
    visual: <TemplatesVisual />,
  },
];

const ProductShowcase = () => {
  return (
    <section
      id="product-showcase"
      className="relative overflow-hidden px-6 py-20 md:px-10 md:py-28"
    >
      <div className="section-line absolute inset-x-0 top-0" />

      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
            Product tour
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Every screen, explained
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-body">
            What each part of the workspace does, in plain words. Sample
            data shown throughout.
          </p>
        </Reveal>

        <div className="mt-16 space-y-20 md:space-y-24">
          {features.map((f, i) => (
            <Reveal key={f.n}>
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                  <p className="text-xs font-extrabold tracking-widest text-brand-600">
                    {f.n}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-ink">{f.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-brand-700">
                    {f.tagline}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-body">
                    {f.desc}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {f.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2.5 text-sm text-body"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                  <ScreenPanel>{f.visual}</ScreenPanel>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={100}>
          <div className="mt-20 flex justify-center">
            <a
              href="/app"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98]"
            >
              <span>Open the workspace</span>
              <ArrowRight className="size-4" />
            </a>
          </div>
        </Reveal>
      </div>

      <div className="section-line absolute inset-x-0 bottom-0" />
    </section>
  );
};

export default ProductShowcase;

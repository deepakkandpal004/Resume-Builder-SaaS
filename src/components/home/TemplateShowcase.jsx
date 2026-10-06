"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Reveal from "./Reveal";
import { useRouter } from "next/navigation";
import ClassicTemplate from "../templates/ClassicTemplate";
import ModernTemplate from "../templates/ModernTemplate";
import MinimalTemplate from "../templates/MinimalTemplate";
import ExecutiveTemplate from "../templates/ExecutiveTemplate";
import CreativeTemplate from "../templates/CreativeTemplate";
import CompactTemplate from "../templates/CompactTemplate";
import { dummyResumeData } from "@/assets/assets";
const templates = [
    {
        id: "modern",
        name: "Modern",
        tag: "Two-column layout",
        accent: "#10b981",
        desc: "For software engineers",
        ats: "Clear section hierarchy",
        component: ModernTemplate,
    },
    {
        id: "classic",
        name: "Classic",
        tag: "Traditional layout",
        accent: "#6366f1",
        desc: "Traditional corporate resume",
        ats: "Single-column flow",
        component: ClassicTemplate,
    },
    {
        id: "minimal",
        name: "Minimal",
        tag: "Low-ink layout",
        accent: "#2dd4bf",
        desc: "Clean ATS-friendly layout",
        ats: "Readable spacing",
        component: MinimalTemplate,
    },
    {
        id: "executive",
        name: "Executive",
        tag: "Leadership focus",
        accent: "#2563EB",
        desc: "For management roles",
        ats: "Strong hierarchy",
        component: ExecutiveTemplate,
    },
    {
        id: "creative",
        name: "Creative",
        tag: "Portfolio-forward",
        accent: "#E11D48",
        desc: "For design roles",
        ats: "Structured sections",
        component: CreativeTemplate,
    },
    {
        id: "compact",
        name: "Compact",
        tag: "One-page layout",
        accent: "#D97706",
        desc: "One-page professional layout",
        ats: "Dense information flow",
        component: CompactTemplate,
    },
];
const TemplateShowcase = () => {
    const data = dummyResumeData[0];
    const router = useRouter();
    return (<section id="templates" className="relative scroll-mt-24 overflow-hidden px-6 py-24 md:px-10">
      <div className="section-line absolute top-0 inset-x-0"/>

      <div className="mx-auto max-w-7xl">
        {/* Header Block */}
        <Reveal>
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
            Templates
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Professional templates that pass ATS scans
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-body">
            Six layouts, one click to switch — your content stays intact and the PDF export is print-ready.
          </p>
        </div>
        </Reveal>

        {/* Grid Container */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {templates.map((t, i) => {
            const Template = t.component;
            return (<Reveal key={t.id} delay={Math.min(i, 5) * 70} className="h-full">
              <div className="h-full">
                <div role="link" tabIndex={0} onClick={() => router.push(`/app?template=${t.id}`)} onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/app?template=${t.id}`);
                    }
                }} aria-label={`Use ${t.name} Template`} className="fx-tilt group relative flex flex-col h-full overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-colors cursor-pointer outline-none hover:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500">
                  {/* Top Color Line */}
                  <div className="absolute top-0 inset-x-0 h-1 z-10 opacity-60" style={{ backgroundColor: t.accent }}/>

                  {/* Accent badge */}
                  <div className="absolute top-4 right-4 z-20 rounded-full px-3.5 py-1 text-[10.5px] font-bold border" style={{
                    backgroundColor: `${t.accent}15`,
                    borderColor: `${t.accent}35`,
                    color: t.accent,
                }}>
                    <span className="flex items-center gap-1">
                      {t.tag}
                    </span>
                  </div>

                  {/* Document Preview Area */}
                  <div className="relative h-[310px] w-full overflow-hidden bg-canvas/20 flex items-center justify-center p-5 border-b border-line/45">

                    {/* Inner border */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl border border-black/[0.03] z-10"/>

                    <div className="resume-preview relative w-full h-full bg-white dark:bg-neutral-900 shadow-sm rounded-2xl overflow-hidden border border-line/10 text-slate-900 dark:text-neutral-100">
                      <div className="origin-top" style={{
                    transform: "scale(0.32)",
                    width: "calc(100% / 0.32)",
                    transformOrigin: "top left",
                }}>
                        <Template data={data} accentColor={t.accent} styleOptions={{ fontSize: 11, lineSpacing: 1.3, pageSize: "letter" }}/>
                      </div>

                      {/* Gradient Fade out */}
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-neutral-900 via-white/80 dark:via-neutral-900/80 to-transparent z-10"/>
                    </div>

                    {/* Use Template Overlay Button */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/[0.02] dark:bg-black/[0.08] md:bg-transparent md:group-hover:bg-black/10 z-20">
                      <div className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-extrabold opacity-100 md:opacity-0 md:group-hover:opacity-100">
                        Use template
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Info */}
                  <div className="flex flex-col gap-1.5 p-5 bg-surface">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: t.accent }}/>
                        <h3 className="font-bold text-ink text-sm sm:text-base">{t.name}</h3>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {t.ats}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed font-semibold mt-0.5">
                      {t.desc}
                    </p>
                  </div>

                </div>
              </div>
              </Reveal>);
        })}
        </div>

        {/* Global CTA Bottom */}
        <Reveal delay={100}>
        <div className="mt-14 flex flex-col items-center gap-3">
          <Link href="/app" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition active:scale-[0.98]">
            <span>Explore all templates</span>
            <ArrowRight className="size-4"/>
          </Link>
        </div>
        </Reveal>
      </div>

      <div className="section-line absolute bottom-0 inset-x-0"/>
    </section>);
};
export default TemplateShowcase;

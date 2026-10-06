"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import Reveal from "./Reveal";
const features = [
    {
        title: "Resume matcher",
        desc: "Paste a job description or link. Your resumes get ranked by fit, with matched and missing skills.",
        tag: "Start here",
    },
    {
        title: "Tailor to JD",
        desc: "Rewrite your summary, experience bullets, and skills for a specific role. You review every change.",
    },
    {
        title: "Application tracker",
        desc: "Track every application from applied to offer, with notes, history, and response stats.",
    },
    {
        title: "ATS score checker",
        desc: "Check keyword gaps and compatibility against a job post before you apply.",
    },
    {
        title: "Cover letter generator",
        desc: "Draft a cover letter matched to the role in one click.",
    },
    {
        title: "Interview prep",
        desc: "Role-specific questions with suggested answers, across behavioural and technical rounds.",
    },
    {
        title: "Shareable resume links",
        desc: "Share a public link that always shows your latest version. Turn it off anytime.",
    },
    {
        title: "Professional templates",
        desc: "Clean layouts recruiters can scan in seconds.",
    },
    {
        title: "PDF import and export",
        desc: "Import an existing resume or export a print-ready one-page PDF.",
    },
];
export default function Features() {
    const [open, setOpen] = useState(0);
    return (<section id="features" className="scroll-mt-24 px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
            Features
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-ink md:text-4xl">
            More than a resume builder
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-body">
            Matching, tailoring, tracking, and interview prep live alongside
            the editor.
          </p>
        </Reveal>

        <div className="mt-12 border-b border-line">
          {features.map((f, i) => {
            const isOpen = open === i;
            return (<Reveal key={f.title} delay={Math.min(i, 5) * 40}>
                <div className="border-t border-line">
                  <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen} className="group flex w-full items-center gap-5 py-5 text-left md:gap-8 md:py-6">
                    <span className={`w-8 shrink-0 text-sm font-bold tabular-nums transition-colors ${isOpen ? "text-brand-600" : "text-ink/30"}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex flex-1 flex-wrap items-center gap-3">
                      <span className={`text-base font-bold transition-all duration-300 group-hover:translate-x-1 md:text-lg ${isOpen ? "text-brand-700" : "text-ink"}`}>
                        {f.title}
                      </span>
                      {f.tag && (<span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
                          {f.tag}
                        </span>)}
                    </span>
                    <Plus className={`size-5 shrink-0 transition-transform duration-300 ${isOpen
                    ? "rotate-45 text-brand-600"
                    : "text-ink/40 group-hover:text-ink"}`}/>
                  </button>
                  <div className={`grid transition-all duration-300 ease-out ${isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                      <p className="max-w-2xl pb-6 pl-13 text-sm leading-relaxed text-body md:pl-16 md:text-[15px]">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>);
        })}
        </div>

        <Reveal delay={100}>
          <div className="mt-14">
            <Link href="/app/matcher" className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-8 py-4 text-base font-semibold text-ink transition hover:border-ink/30 active:scale-[0.98]">
              Try the matcher
              <ArrowRight className="size-5 transition group-hover:translate-x-0.5"/>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>);
}

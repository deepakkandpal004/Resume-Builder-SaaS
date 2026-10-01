"use client";
import React from "react";
import Link from "next/link";
import { FileText, Palette, Lightbulb, Share2, ArrowRight, Clock, Check } from "lucide-react";
import Title from "./Title";

const steps = [
  {
    icon: FileText,
    title: "Choose a template",
    time: "30 sec",
    desc: "Pick from ATS-friendly templates and preview them before you start.",
  },
  {
    icon: Palette,
    title: "Add your information",
    time: "5 min",
    desc: "Fill in your experience, education, and skills, or import an existing resume to parse the details.",
  },
  {
    icon: Lightbulb,
    title: "Rewrite and optimize",
    time: "20 sec",
    desc: "Rewrite bullet points, improve ATS compatibility, strengthen action verbs, and tailor your resume to the job description.",
  },
  {
    icon: Share2,
    title: "Download or share",
    time: "Instant",
    desc: "Export a print-ready PDF or share a hosted link.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative overflow-hidden px-6 py-28 md:px-10">
      <div className="section-line absolute top-0 inset-x-0" />

      <div className="mx-auto max-w-7xl">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-brand-400">
            <FileText className="size-4 text-brand-500" />
            <span>How it works</span>
          </div>
          <Title
            title="Create your resume in minutes"
            description="A simple flow for building, formatting, and improving your resume."
          />
        </div>

        {/* Product Walkthrough Content Grid */}
        <div className="mt-16 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
          
          {/* Left Panel: Live Workflow Demonstration */}
          <div className="rounded-[24px] border border-line bg-surface p-8 md:p-10 flex flex-col justify-between">
            
            <div className="relative z-10 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">
                  What happens
                </p>
                <h3 className="mt-4 text-3xl font-bold tracking-tight text-ink md:text-4xl">
                  Track your progress
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-body max-w-md">
                  See formatting, keywords, and your ATS score update as you build.
                </p>
              </div>

              {/* Progress Panel Simulation */}
              <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
                
                {/* Resume build progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-ink mb-1.5">
                    <span>Formatting Status</span>
                    <span>Live preview</span>
                  </div>
                  <div className="h-2 w-full bg-line rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-emerald-500" />
                  </div>
                </div>

                {/* Job-description comparison */}
                <div className="p-3.5 rounded-xl border border-line/65 bg-canvas/30 space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-brand-600 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-brand-500" />
                      Job-description review
                    </span>
                    <span className="text-[9px] text-muted font-bold">Review before applying</span>
                  </div>

                  <div className="text-[11px] leading-relaxed text-ink font-semibold">
                    <span className="text-ink">Compare your experience with the language used in the role.</span>
                  </div>
                </div>

                {/* Score and checkmarks grid */}
                <div className="grid grid-cols-2 gap-3.5 pt-1">
                  
                  {/* ATS Score card */}
                  <div className="p-3.5 rounded-xl border border-line/65 bg-canvas/30 text-center flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-muted uppercase">ATS Score</span>
                    <span className="text-2xl font-extrabold text-brand-600 mt-1">Review</span>
                    <span className="text-[8.5px] font-bold text-ink mt-0.5">
                      See what needs attention
                    </span>
                  </div>

                  {/* Checklist indicators */}
                  <div className="space-y-1.5 justify-center flex flex-col text-xs font-semibold text-body">
                    {[
                      { label: "Experience added", ok: true },
                      { label: "Role compared", ok: true },
                      { label: "PDF export available", ok: true }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={`size-4 rounded-full flex items-center justify-center text-[9px] ${
                          item.ok ? "bg-emerald-500/10 text-emerald-500" : "bg-line text-muted/50"
                        }`}>
                          <Check className="size-2.5" />
                        </span>
                        <span className={item.ok ? "text-ink font-bold" : "text-muted"}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>

                </div>

              </div>
            </div>

            {/* Static assurance footer */}
            <div className="mt-8 text-xs font-bold text-muted flex items-center gap-2 border-t border-line/45 pt-4">
              <span className="size-1.5 rounded-full bg-brand-500" />
              <span>Import an existing PDF or start with a blank resume.</span>
            </div>

          </div>

          {/* Right Panel: Staggered Workflow timeline */}
          <div className="relative flex flex-col justify-between">
            
            {/* Desktop timeline line overlay */}
            <div className="absolute left-[36px] top-8 hidden h-[84%] w-px bg-line lg:block" />

            <div className="space-y-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="relative rounded-[22px] border border-line bg-surface p-5 md:p-6 transition-colors hover:border-brand-500/40"
                  >
                    <div className="flex items-start gap-4 md:gap-5">
                      
                      {/* step icon wrapper */}
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                        <Icon className="size-5" />
                      </div>

                      <div className="flex-1">
                        
                        {/* step header: index, title, completion time */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold tracking-[0.2em] text-brand-600">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <h3 className="text-base font-bold text-ink">
                              {step.title}
                            </h3>
                          </div>
                          <span className="flex items-center gap-1 text-[9.5px] font-bold text-muted bg-canvas px-2.5 py-0.5 rounded-full border border-line">
                            <Clock className="size-2.5" />
                            <span>{step.time}</span>
                          </span>
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-body md:max-w-xl">
                          {step.desc}
                        </p>

                        {/* Mini product preview block inside card */}
                        <div className="mt-3.5 border-t border-line/40 pt-3">
                          {index === 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-muted uppercase">Layout Grid:</span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3].map((v) => (
                                  <div key={v} className="h-6 w-5 rounded border border-line bg-surface flex flex-col p-0.5 gap-0.5">
                                    <div className="h-1 w-full bg-brand-500/20 rounded-xs" />
                                    <div className="h-0.5 w-3 bg-muted/20 rounded-xs" />
                                    <div className="h-0.5 w-2.5 bg-muted/25 rounded-xs" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {index === 1 && (
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-muted uppercase">Data Form:</span>
                              <div className="flex gap-1">
                                <div className="h-4.5 w-16 rounded border border-line bg-surface px-1 py-0.5 text-[7px] text-muted truncate">
                                  Alex Smith
                                </div>
                                <div className="h-4.5 w-20 rounded border border-brand-300 bg-surface px-1 py-0.5 text-[7px] text-brand-600 truncate font-semibold">
                                  Engineer
                                </div>
                              </div>
                            </div>
                          )}

                          {index === 2 && (
                            <div className="flex items-center gap-1.5 text-[9px] text-brand-600 font-bold">
                              <span>Suggests stronger action verbs.</span>
                            </div>
                          )}

                          {index === 3 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9.5px] text-emerald-500 font-bold flex items-center gap-1">
                                <span className="size-1 rounded-full bg-emerald-500" />
                                ready_for_export.pdf
                              </span>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Section bottom CTA transition */}
        <div className="mt-16 flex flex-col items-center justify-center text-center space-y-3 pt-10 border-t border-line/45">
          <h4 className="text-lg font-bold text-ink">Ready to build your resume?</h4>
          <Link
            href="/app"
            className="btn-primary px-8 py-3 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
            style={{ minHeight: "2.75rem" }}
          >
            <span>Build my resume</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

      </div>

      <div className="section-line absolute bottom-0 inset-x-0" />
    </section>
  );
};

export default HowItWorks;

"use client";
import React from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { ArrowRight, Download, Eye, Lightbulb, Search } from "lucide-react";
import ModernTemplate from "../templates/ModernTemplate";
import { dummyResumeData } from "@/assets/assets";

const Hero = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-[90px] pb-16">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-canvas" />

      <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-6 py-12 lg:py-16 lg:px-8 z-10 gap-14">
        
        {/* Main Content Fold (Centered Layout) */}
        <div className="flex flex-col items-center text-center max-w-4xl">
          
          {/* Headline */}
          <h1
            className="mt-6 text-4xl font-extrabold leading-[1.1] text-ink sm:text-5xl md:text-6xl lg:text-7xl tracking-tight max-w-4xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            Build a resume that fits the role <span className="text-brand-600">you are applying for</span>
          </h1>

          {/* Description */}
          <p
            className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-body font-medium"
          >
            Start with your experience, compare it with a job description, and make deliberate edits before exporting a clean PDF.
          </p>

          {/* Feature highlights */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted">
            <span>Clean layouts</span>
            <span aria-hidden="true">·</span>
            <span>Job-description review</span>
            <span aria-hidden="true">·</span>
            <span>PDF export</span>
          </div>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col items-center gap-3.5 sm:flex-row sm:justify-center w-full sm:w-auto">
            <Link
              href="/app"
              aria-label={user ? "Go to dashboard" : "Build my resume"}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-emerald-600 text-white px-9 py-3.5 text-center text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              <span>{user ? "Go to dashboard" : "Build my resume"}</span>
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#templates"
              aria-label="Browse templates"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-line bg-surface hover:border-brand-500/40 text-body hover:text-ink px-8 py-3.5 text-center text-sm font-bold transition-colors"
            >
              <span>Browse templates</span>
            </a>
          </div>

          {/* Reassurance text */}
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-[11px] font-extrabold text-muted select-none">
            <span>No credit card</span>
            <span>Instant PDF export</span>
            <span>No hidden charges</span>
          </div>

        </div>

        {/* Product Preview Centered Below Content */}
        <div className="w-full relative max-w-4xl mt-6">
          <div className="relative">
            {/* Browser Mockup Container */}
            <div>
              <div className="relative overflow-hidden rounded-[20px] border border-line bg-surface">
                
                {/* Browser address bar chrome */}
                <div className="flex items-center gap-1.5 border-b border-line px-4 py-3 bg-surface">
                  <span className="size-2.5 rounded-full bg-red-400/70" />
                  <span className="size-2.5 rounded-full bg-yellow-400/70" />
                  <span className="size-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-3 rounded-md bg-canvas px-3 py-1 text-[9px] font-bold text-muted border border-line/60 select-none">
                    resumebuilder.com/editor
                  </span>
                </div>

                {/* Editor Content */}
                <div className="p-4 bg-canvas">
                  <div className="grid grid-cols-5 gap-4">
                    
                    {/* Left: editor panel */}
                    <div className="col-span-2 space-y-3 rounded-xl border border-line bg-surface p-3.5 text-left">
                      <div className="flex items-center gap-1.5 border-b border-line/50 pb-2">
                        <span className="size-1.5 rounded-full bg-brand-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Resume Editor</span>
                      </div>
                      
                      <div className="space-y-2.5">
                        <div>
                          <div className="text-[8px] text-muted font-bold mb-1 uppercase tracking-wide">Full Name</div>
                          <div className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[10px] text-ink font-semibold">
                            Jordan Lee
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-[8px] text-muted font-bold mb-1 uppercase tracking-wide">Job Title</div>
                          <div className="rounded-lg border border-brand-300 bg-surface px-2.5 py-1.5 text-[10px] text-brand-600 dark:text-brand-400 font-bold min-h-[28px] flex items-center">
                            <span>Product Designer</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl border border-brand-500/30 bg-brand-500/5">
                          <div className="text-[8px] text-muted font-bold mb-1 uppercase tracking-wide">Experience Bullet</div>
                          <div className="text-[9.5px] leading-relaxed text-ink font-semibold">
                            <span>Boosted load speeds by 40% with virtualized list rendering.</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-2.5 text-left shadow-xs">
                        <div className="flex items-center gap-1.5 text-[8px] font-bold text-brand-600">
                          <span className="size-1.5 rounded-full bg-brand-500" />
                          <span>Suggested edit</span>
                        </div>
                        <p className="mt-1 text-[7.5px] leading-normal text-muted font-medium">
                          "Added a clear outcome and a measurable result."
                        </p>
                      </div>
                    </div>

                    {/* Right: A4 preview */}
                    <div className="col-span-3 flex flex-col rounded-xl border border-line bg-surface p-3.5 shadow-sm">
                      <div className="mb-2 flex items-center gap-1.5 text-left">
                        <span className="size-1.5 rounded-full bg-teal-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">A4 Preview</span>
                      </div>

                      <div className="relative flex-1 overflow-hidden rounded-lg bg-white shadow-inner border border-line/60" style={{ minHeight: "260px" }}>
                        <div 
                          className="absolute left-0 top-0 origin-top-left" 
                          style={{ 
                            transform: "scale(0.42)", 
                            width: "238%", 
                            height: "238%" 
                          }}
                        >
                          <ModernTemplate
                            data={dummyResumeData[0]}
                            accentColor="#10b981"
                            styleOptions={{}}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status bar */}
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-brand-500" />
                      <span className="text-[10px] text-muted font-semibold">
                        Saved • Updated just now
                      </span>
                    </div>
                    <span className="text-[8.5px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md dark:bg-brand-500/10">
                      Saved ✓
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Keep the preview factual instead of presenting a guaranteed score. */}
            <div className="absolute -bottom-4 -left-4 rounded-xl border border-line bg-surface px-4 py-2.5 flex items-center gap-3.5 z-20">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-500 font-extrabold text-sm">Ready to review</span>
                <span className="text-line">|</span>
                <span className="text-ink font-bold text-[11px]">Your edits stay in your hands</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards Fold */}
        <div className="w-full border-t border-line/45 pt-12 mt-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <p className="mb-3 text-[10px] font-bold text-muted uppercase tracking-wider select-none">
              Built for job seekers
            </p>
              <h3 className="text-2xl font-bold text-ink tracking-tight sm:text-3xl">
              A focused workspace for each application
            </h3>
            <p className="text-xs sm:text-sm text-muted max-w-md mt-2 leading-relaxed font-semibold">
              Keep the document, job description, and final export together while you make your edits.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              {[
              { value: "Live", label: "Resume preview", desc: "See layout changes as you edit each section.", icon: Eye, accent: "#475569" },
              { value: "Role", label: "Job-description review", desc: "Compare your resume with the language used in a target role.", icon: Search, accent: "#0f766e" },
              { value: "Clear", label: "Suggested edits", desc: "Review writing suggestions before deciding what to keep.", icon: Lightbulb, accent: "#be123c" },
              { value: "PDF", label: "Ready to export", desc: "Download a clean document without a subscription requirement.", icon: Download, accent: "#b45309" }
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="relative flex flex-col justify-between p-6 rounded-[20px] border border-line bg-surface cursor-default min-h-[170px] hover:border-brand-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="text-3xl font-extrabold tracking-tight text-ink font-display">
                        {card.value}
                      </span>
                      <span className="text-xs font-bold text-ink mt-1.5">{card.label}</span>
                    </div>
                    <div
                      className="p-2.5 rounded-xl border border-line bg-surface"
                      style={{ color: card.accent }}
                    >
                      <Icon className="size-4.5" />
                    </div>
                  </div>
                  <p className="text-[10.5px] text-muted leading-relaxed font-semibold mt-4">{card.desc}</p>
                </div>
              );
            })}
          </div>

        </div>

        {/* Scroll Indicator */}
        <div 
          className="flex flex-col items-center justify-center pt-8 cursor-pointer group select-none" 
          onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
        >
          <span className="text-[11px] font-bold text-muted group-hover:text-brand-600 transition-colors">See how it works</span>
          <div
            className="text-muted group-hover:text-brand-600 transition-colors mt-1 font-bold"
          >
            ↓
          </div>
        </div>

      </div>
      {/* Gentle Section Divider Line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-line/30" />
    </section>
  );
};

export default Hero;

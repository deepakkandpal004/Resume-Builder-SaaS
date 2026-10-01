"use client";
import React from "react";
import {
  Lightbulb,
  BarChart3,
  LayoutTemplate,
  Eye,
  ScanLine,
  Link as LinkIcon,
  FileText,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import Title from "./Title";
import Link from "next/link";
const RouterLink = Link;

const features = [
  {
    icon: Lightbulb,
    title: "Smart bullet rewriting",
    desc: "Rewrite bullet points with stronger action verbs, tailored to the job.",
    featured: true,
  },
  {
    icon: BarChart3,
    title: "ATS score checker",
    desc: "Check keyword gaps and compatibility against a job post.",
  },
  {
    icon: LayoutTemplate,
    title: "Professional templates",
    desc: "Clean layout templates built for fast reading.",
  },
  {
    icon: Eye,
    title: "Live resume preview",
    desc: "See layout changes update in real time before exporting to PDF.",
  },
  {
    icon: MessageSquare,
    title: "Cover letter generator",
    desc: "Draft a cover letter matched to the role in one click.",
  },
  {
    icon: ScanLine,
    title: "Background removal",
    desc: "Remove the background from your profile photo.",
  },
  {
    icon: LinkIcon,
    title: "Shareable resume links",
    desc: "Host your resume and share a public link with hiring teams.",
  },
  {
    icon: FileText,
    title: "PDF import and export",
    desc: "Import an existing resume or export a print-ready PDF.",
  },
];

const Features = () => {
  return (
    <section id="features" className="relative overflow-hidden px-6 py-28 md:px-10">
      <div className="section-line absolute top-0 inset-x-0" />

      <div className="mx-auto max-w-7xl">
        
        {/* Header Badge & Title */}
        <div className="flex flex-col items-center text-center">
          <Title
            title="Tools for the parts of a job application that take the most care"
            description="Bring your resume, target role, writing, and final export into one focused workspace."
          />
        </div>

        {/* Features Card Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full">
          {features.map((f) => {
            const Icon = f.icon;
            const isFeatured = f.featured;
            
            return (
              <div
                key={f.title}
                className={`relative rounded-[14px] border bg-surface p-7 min-h-[200px] flex flex-col transition-colors ${
                  isFeatured 
                    ? "border-emerald-500/35" 
                    : "border-line/70 hover:border-emerald-500/40"
                }`}
              >
                <div>
                  
                  {/* Top Header Row with Icon and Badge */}
                  <div className="flex items-start justify-between mb-6">
                    
                    {/* Icon container */}
                    <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Icon className="size-5.5" />
                    </div>

                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-ink">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-body line-clamp-2">
                    {f.desc}
                  </p>
                </div>

              </div>
            );
          })}
        </div>

        {/* Bottom CTA Block */}
        <div className="mt-14 flex flex-col items-center justify-center text-center space-y-3.5">
          <RouterLink
            href="/app"
            className="btn-primary px-8 py-3.5 flex items-center gap-2 font-bold cursor-pointer"
            style={{ minHeight: "2.75rem" }}
          >
            <Lightbulb className="size-4" />
            <span>See it in action</span>
            <ArrowRight className="size-4" />
          </RouterLink>
        </div>
      </div>

      <div className="section-line absolute bottom-0 inset-x-0" />
    </section>
  );
};

export default Features;

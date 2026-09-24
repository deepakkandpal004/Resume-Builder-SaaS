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
import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import Title from "./Title";
import Link from "next/link";
const RouterLink = Link;

const features = [
  {
    icon: Lightbulb,
    title: "Smart Bullet Rewriting",
    desc: "Rewrite bullet points, improve active verbs, and tailor your resume dynamically.",
    color: "bg-emerald-600",
    featured: true,
  },
  {
    icon: BarChart3,
    title: "ATS Score Checker",
    desc: "Instantly analyze keyword gaps and screen compatibility against any job post.",
    color: "bg-indigo-600",
  },
  {
    icon: LayoutTemplate,
    title: "Professional Templates",
    desc: "Access clean, recruiter-approved layout templates optimized for fast reading.",
    color: "bg-slate-700",
  },
  {
    icon: Eye,
    title: "Live Resume Preview",
    desc: "Visualize layout and section adjustments in real time before exporting to PDF.",
    color: "bg-teal-600",
  },
  {
    icon: MessageSquare,
    title: "Cover Letter Generator",
    desc: "Draft tailored cover letters matching the role's tone in a single click.",
    color: "bg-blue-600",
  },
  {
    icon: ScanLine,
    title: "Background Removal",
    desc: "Clean up profile headshots instantly with smart portrait background extraction.",
    color: "bg-rose-600",
  },
  {
    icon: LinkIcon,
    title: "Shareable Resume Links",
    desc: "Host your resume securely and send public access links to hiring teams.",
    color: "bg-amber-600",
  },
  {
    icon: FileText,
    title: "PDF Import & Export",
    desc: "Import files directly to convert details or export to print-ready PDF.",
    color: "bg-slate-600",
  },
];

const Features = () => {
  const ref = useScrollReveal();

  return (
    <section id="features" className="relative overflow-hidden px-6 py-28 md:px-10">
      <div className="section-line absolute top-0 inset-x-0" />

      <div ref={ref} className="mx-auto max-w-7xl reveal">
        
        {/* Header Badge & Title */}
        <div className="flex flex-col items-center text-center">
          <Title
            title="Tools for the parts of an application that take the most care"
            description="Bring your resume, target role, writing, and final export into one focused workspace."
          />
        </div>

        {/* Features Card Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full">
          {features.map((f, i) => {
            const Icon = f.icon;
            const isFeatured = f.featured;
            
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className={`premium-card group relative overflow-hidden rounded-[14px] p-7 cursor-default min-h-[200px] flex flex-col transition-all duration-250 ease-out border bg-surface/50 hover:border-emerald-500/35 ${
                  isFeatured 
                    ? "border-emerald-500/35 bg-surface shadow-xs" 
                    : "border-line/70 hover:border-emerald-500/35"
                }`}
              >
                <div>
                  
                  {/* Top Header Row with Icon and Badge */}
                  <div className="flex items-start justify-between mb-6">
                    
                    {/* Icon container */}
                    <div
                      className={`flex items-center justify-center rounded-xl text-white shadow-xs transition-transform duration-250 ${f.color} ${
                        isFeatured ? "size-13" : "size-12"
                      }`}
                    >
                      <Icon className={`group-hover:scale-108 transition-transform duration-250 ${
                        isFeatured ? "size-6.5" : "size-5.5"
                      }`} />
                    </div>

                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-ink transition-colors group-hover:text-brand-700">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-body line-clamp-2">
                    {f.desc}
                  </p>
                </div>

              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA Block */}
        <div className="mt-14 flex flex-col items-center justify-center text-center space-y-3.5">
          <RouterLink
            href="/app"
            className="btn-primary px-8 py-3.5 shadow-lg shadow-emerald-500/10 hover:shadow-xl hover:shadow-emerald-500/20 active:scale-95 transition-all duration-250 flex items-center gap-2 font-bold cursor-pointer hover:bg-brand-600/90"
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

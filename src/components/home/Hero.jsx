"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal";
const lineA = ["Find", "which", "resume", "fits", "the", "job,"];
const lineB = ["then", "make", "it", "fit", "better"];
/* Each word rises into place with a stagger — kinetic type entrance. */
function AnimatedWords({ words, baseDelay = 0 }) {
    return (<>
      {words.map((w, i) => (<span key={`${w}-${i}`} className={`-mb-1 inline-block overflow-hidden pb-1 align-bottom ${i < words.length - 1 ? "mr-[0.3em]" : ""}`}>
          <span className="word-rise inline-block will-change-transform" style={{ animationDelay: `${baseDelay + i * 70}ms` }}>
            {w}
          </span>
        </span>))}
    </>);
}
export default function Hero() {
    return (<section className="relative overflow-hidden px-6 pt-32 pb-20 md:px-10 md:pt-40 md:pb-24">
      <style>{`
        @keyframes word-rise {
          from { transform: translateY(110%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .word-rise { animation: word-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes float-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-26px); }
        }
        .animate-float-slow { animation: float-y 9s ease-in-out infinite; }
        .animate-float-slower { animation: float-y 12s ease-in-out infinite reverse; }
        @keyframes shine-sweep {
          0% { transform: translateX(-160%) skewX(-20deg); }
          55%, 100% { transform: translateX(320%) skewX(-20deg); }
        }
        .shine-sweep { animation: shine-sweep 3.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .word-rise, .animate-float-slow,
          .animate-float-slower, .shine-sweep { animation: none !important; }
        }
      `}</style>

      {/* Soft emerald wash + drifting orbs, masked to the top */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(16,185,129,0.09),transparent_70%)]"/>
        <div className="animate-float-slow absolute -left-32 top-24 size-96 rounded-full bg-emerald-400/10 blur-3xl"/>
        <div className="animate-float-slower absolute -right-32 top-56 size-80 rounded-full bg-teal-300/10 blur-3xl"/>
      </div>

      <div className="relative mx-auto max-w-7xl text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-brand-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            <span className="size-1.5 rounded-full bg-brand-500" />
            AI resume workspace
          </span>
        </Reveal>
        <h1 className="mx-auto mt-5 max-w-6xl text-5xl font-bold leading-[1.08] tracking-tight text-ink md:text-7xl">
          <AnimatedWords words={lineA} baseDelay={150}/>
          <br />
          <span className="text-brand-600">
            <AnimatedWords words={lineB} baseDelay={150 + lineA.length * 70}/>
          </span>
        </h1>
        <Reveal delay={900}>
          <p className="mx-auto mt-6 max-w-5xl text-base leading-relaxed text-ink/75 md:text-[17px]">
            ResumeAI is an AI resume workspace for the full job hunt: a
            guided 14-step builder with live preview and PDF import, a JD
            matcher that ranks your resumes by fit, tailoring you approve
            line by line, ATS scoring with keyword gaps, six one-click
            templates, cover letters, interview prep and an application
            tracker, all ending in a print-ready one-page PDF.
          </p>
        </Reveal>
        <Reveal delay={1050}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/app/matcher" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-[0_12px_30px_-12px_rgba(5,150,105,0.5)] transition hover:bg-brand-700 active:scale-[0.98]">
              <span aria-hidden className="shine-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"/>
              <span className="relative">Try the matcher</span>
              <ArrowRight className="relative size-5 transition group-hover:translate-x-0.5"/>
            </Link>
            <Link href="/app" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-8 py-4 text-base font-semibold text-ink transition hover:border-ink/30 active:scale-[0.98]">
              Build my resume
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted">
            No credit card · Free to start · PDF export included
          </p>
        </Reveal>
      </div>
    </section>);
}

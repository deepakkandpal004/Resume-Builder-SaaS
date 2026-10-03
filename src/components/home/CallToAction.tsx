"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal";

const CallToAction = () => {
  return (
    <section id="cta" className="relative overflow-hidden px-6 py-24 md:px-10">
      <div className="section-line absolute top-0 inset-x-0" />

      <div className="mx-auto max-w-6xl">
        <Reveal>
        <div className="fx-cta-bg rounded-3xl border border-line bg-surface px-8 py-20 text-center sm:px-16 shadow-[0_32px_80px_-40px_rgba(6,78,59,0.2)]">
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
              Free to start · No credit card
            </p>

            <h2
              className="mx-auto mt-4 max-w-3xl text-4xl font-black text-ink sm:text-5xl leading-[1.1]"
              style={{ letterSpacing: "-0.03em" }}
            >
              Paste a job description. Send the resume that fits.
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-body">
              Rank your resumes against any role, tailor the best one, and
              track the application, all in one workspace.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row w-full sm:w-auto">
              <Link
                href="/app/matcher"
                aria-label="Try the resume matcher"
                className="fx-shine flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 text-base font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 outline-none active:scale-[0.98]"
              >
                <span>Try the matcher</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/app"
                aria-label="Build my resume"
                className="flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-body px-10 py-4 text-base font-bold transition-colors hover:border-emerald-600/40 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-500 outline-none"
              >
                <span>Build my resume</span>
              </Link>
            </div>
          </div>
        </div>
        </Reveal>
      </div>

      <div className="section-line absolute bottom-0 inset-x-0" />
    </section>
  );
};

export default CallToAction;

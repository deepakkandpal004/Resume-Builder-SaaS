"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CallToAction = () => {
  return (
    <section id="cta" className="relative overflow-hidden px-6 py-28 md:px-10">
      <div className="section-line absolute top-0 inset-x-0" />

      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-line bg-surface px-8 py-24 text-center sm:px-16">
          <div className="relative">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-600 dark:text-emerald-300 dark:border-white/20 dark:bg-white/10">
                <span>Start with the document you already have</span>
            </div>

            <h2
              className="mx-auto max-w-3xl text-4xl font-black text-ink sm:text-5xl lg:text-6xl leading-[1.1] dark:text-white"
              style={{ letterSpacing: "-0.03em" }}
            >
              Make your next application easier to review
            </h2>

            <p className="mx-auto mt-5 max-w-md text-base sm:text-lg leading-relaxed text-body dark:text-white/60 font-semibold">
              Import an existing resume or begin from a clean template, then make the changes that fit the role.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row w-full sm:w-auto">
              <Link
                href="/app"
                aria-label="Build my resume"
                className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 text-base transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 outline-none"
              >
                <span>Build my resume</span>
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#templates"
                aria-label="View templates"
                className="flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-body px-10 py-4 text-base transition-colors hover:border-emerald-600/40 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-500 outline-none"
              >
                <span>View templates</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="section-line absolute bottom-0 inset-x-0" />
    </section>
  );
};

export default CallToAction;

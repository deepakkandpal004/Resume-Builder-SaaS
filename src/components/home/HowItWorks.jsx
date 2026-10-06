"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal";
const steps = [
    {
        n: "01",
        title: "Build or import",
        desc: "Start from an ATS-friendly template, or import your existing PDF and keep editing from there.",
    },
    {
        n: "02",
        title: "Match it against the job",
        desc: "Paste the job description or a job link. Your resumes get ranked by fit, with matched and missing skills.",
    },
    {
        n: "03",
        title: "Tailor and check ATS",
        desc: "Rewrite the summary, bullets and skills for the role. You review every change, then check the ATS score.",
    },
    {
        n: "04",
        title: "Track and share",
        desc: "Save the application, follow it from applied to offer, and share a public link with recruiters.",
    },
];
export default function HowItWorks() {
    return (<section id="how-it-works" className="px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
            How it works
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-ink md:text-4xl">
            From job description to offer
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-body">
            Four steps in one workspace. No spreadsheets, no guesswork.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (<Reveal key={s.n} delay={i * 90}>
              <p className="fx-shimmer-text text-6xl font-bold tracking-tight">
                {s.n}
              </p>
              <h3 className="mt-4 text-base font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">
                {s.desc}
              </p>
            </Reveal>))}
        </div>

        <Reveal delay={120}>
        <div className="mt-14">
          <Link href="/app" className="group inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-4 text-base font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]">
            Build my resume
            <ArrowRight className="size-5 transition group-hover:translate-x-0.5"/>
          </Link>
        </div>
        </Reveal>
      </div>
    </section>);
}

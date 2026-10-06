"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Reveal from "./Reveal";
const faqs = [
    { q: "How does the resume matcher work?", a: "Paste a job description or a job link. The matcher scores each of your resumes for fit and shows matched and missing skills, so you know which resume to send — then tailor it in the builder with one click." },
    { q: "Is the resume builder free?", a: "Yes. The free tier includes all templates, customization, PDF export, and limited rewriting features. No credit card required." },
    { q: "What features are included?", a: "You can rewrite bullets, improve summaries, suggest skills, score your resume, tailor it to roles, and generate cover letters or interview questions." },
    { q: "Can I import my existing resume?", a: "Yes. Upload a PDF and the app turns it into editable content so you can keep building from there." },
    { q: "Are the templates ATS-friendly?", a: "Yes. The layouts are built with clean structure so ATS systems can parse them easily." },
    { q: "How does the Pro upgrade work?", a: "It is a one-time ₹299 payment for lifetime access to unlimited rewriting and priority processing." },
    { q: "Can I share my resume with a public link?", a: "Yes. Turn on public sharing and send a view-only link to recruiters." },
];
const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(null);
    return (<section id="faq" className="relative overflow-hidden px-6 py-28 md:px-10">
      <div className="section-line absolute top-0 inset-x-0"/>

      <div className="mx-auto max-w-3xl">
        <Reveal>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
            FAQ
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Common questions, answered quickly
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-body">
            How the product works, what is included, and what Pro adds.
          </p>
        </div>
        </Reveal>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, i) => (<Reveal key={i} delay={Math.min(i, 4) * 50}>
            <div key={i} className={`overflow-hidden rounded-2xl border transition-colors ${openIndex === i
                ? "border-brand-500/35 bg-surface/40"
                : "border-line/65 bg-surface/20 hover:border-brand-500/20"}`}>
              <h3>
                <button onClick={() => setOpenIndex(openIndex === i ? null : i)} aria-expanded={openIndex === i} className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-line/10 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none">
                  <span className="font-bold text-ink pr-4 text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown className={`size-5 shrink-0 text-muted transition-transform duration-300 ${openIndex === i ? "rotate-180 text-brand-500" : ""}`}/>
                </button>
              </h3>
              <div className={`grid transition-all duration-300 ease-in-out ${openIndex === i
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <p className="border-t border-line/45 px-6 py-5 text-xs sm:text-sm leading-relaxed text-body font-medium">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
            </Reveal>))}
        </div>
      </div>

      <div className="section-line absolute bottom-0 inset-x-0"/>
    </section>);
};
export default FAQ;

"use client";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import Reveal from "./Reveal";
const plans = [
    {
        name: "Free",
        price: "0",
        currency: "₹",
        period: "forever",
        desc: "Build a complete resume without paying upfront.",
        categories: [
            {
                title: "Rewriting features",
                features: [
                    "Bullet rewriter (10/day)",
                    "Resume tailor (3/day)",
                    "ATS score check (1/day)",
                ],
            },
            {
                title: "Resume features",
                features: [
                    "All 6 templates",
                    "Full customization",
                    "Public share link",
                ],
            },
            {
                title: "Export & sharing",
                features: [
                    "PDF export",
                ],
            },
        ],
        cta: "Get started free",
        href: "/app",
        highlighted: false,
    },
    {
        name: "Pro",
        price: "299",
        currency: "₹",
        period: "lifetime",
        desc: "Unlimited rewriting for a single payment.",
        categories: [
            {
                title: "Rewriting features",
                features: [
                    "Unlimited bullet rewrites",
                    "Unlimited resume tailor",
                    "Unlimited ATS score check",
                    "Priority processing",
                ],
            },
            {
                title: "Resume features",
                features: [
                    "Everything in Free",
                    "Unlimited cover letters",
                    "Unlimited interview prep",
                ],
            },
        ],
        cta: "Get Pro",
        href: "/app/upgrade",
        highlighted: true,
    },
];
const Pricing = () => {
    return (<section id="pricing" className="relative overflow-hidden px-6 py-24 md:px-10">
      <div className="section-line absolute top-0 inset-x-0"/>

      <div className="mx-auto max-w-5xl">
        {/* Header Block */}
        <Reveal>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Start free. Upgrade once if you need more.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-body">
            Use the core resume workflow for free. Pay once only when you need higher limits.
          </p>
        </div>
        </Reveal>

        {/* Pricing Cards Grid */}
        <div className="mt-14 grid gap-8 md:grid-cols-2 items-stretch max-w-4xl mx-auto">
          {plans.map((plan, i) => {
            const isPro = plan.highlighted;
            return (<Reveal key={plan.name} delay={i * 100} className={isPro ? "fx-glow-wrap h-full" : "h-full"}>
              <div className={`relative flex flex-col h-full rounded-3xl border bg-surface transition-all duration-300 hover:-translate-y-1 select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${isPro
                    ? "border-brand-500/40 shadow-[0_24px_70px_-24px_rgba(16,185,129,0.35)]"
                    : "border-line hover:border-ink/25 hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.15)]"}`}>
                {isPro && (<span className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-600 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-lg shadow-brand-600/30">
                    Most popular
                  </span>)}
                {isPro && (<div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-44 rounded-t-3xl bg-gradient-to-b from-brand-500/10 to-transparent"/>)}
                {/* Card Header */}
                <div className="relative p-8 pb-0">
                  <h3 className="text-xl font-bold text-ink">{plan.name}</h3>
                  <p className="mt-2 text-xs font-bold text-muted min-h-[32px]">{plan.desc}</p>

                  {/* Visual Pricing Anchor */}
                  <div className="mt-5 flex flex-col items-center text-center pb-6 border-b border-line/45">
                    <span className={`text-[10px] uppercase font-extrabold tracking-wider ${isPro ? "text-brand-600 dark:text-emerald-400" : "text-muted"}`}>
                      {isPro ? "Lifetime access" : "No credit card required"}
                    </span>
                    <span className="mt-1 text-6xl font-extrabold text-ink tracking-tight font-display">
                      {plan.currency}{plan.price}
                    </span>
                    <span className="mt-1 text-[11px] text-muted font-bold">
                      {isPro ? "One-time payment" : "Free forever"}
                    </span>
                  </div>
                </div>

                {/* Feature List */}
                <div className="flex-1 px-8 py-6 space-y-6">
                  {plan.categories.map((category) => (<div key={category.title} className="space-y-2.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted select-none">
                        {category.title}
                      </span>
                      <ul className="space-y-3">
                        {category.features.map((f) => (<li key={f} className="flex items-start gap-2.5 text-xs sm:text-sm">
                            <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${isPro ? "bg-brand-500/15" : "bg-ink/5"}`}>
                              <Check className={`size-3 ${isPro ? "text-brand-700" : "text-ink/60"}`}/>
                            </span>
                            <span className="text-body font-semibold">{f}</span>
                          </li>))}
                      </ul>
                    </div>))}
                </div>

                {/* CTA Action Button */}
                <div className="p-8 pt-0">
                  <Link href={plan.href} aria-label={`Get started with ${plan.name} plan`} className={`flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-center text-sm font-semibold transition active:scale-[0.98] ${isPro
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25"
                    : "border border-line bg-surface text-body hover:text-ink hover:border-ink/25"}`}>
                    <span>{plan.cta}</span>
                    <ArrowRight className="size-4"/>
                  </Link>
                </div>

              </div>
              </Reveal>);
        })}
        </div>

      </div>

      <div className="section-line absolute bottom-0 inset-x-0"/>
    </section>);
};
export default Pricing;

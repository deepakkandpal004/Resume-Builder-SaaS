"use client";
import React from "react";
import Link from "next/link";
import { CheckCircle2, Zap } from "lucide-react";

const BENEFITS = [
  "Unlimited ATS scans (free plan: 1/day)",
  "Unlimited cover letters (free plan: 3/day)",
  "Unlimited interview prep sets (free plan: 3/day)",
  "Priority AI processing",
];

const Upgrade_Prompt = ({ reason }) => (
  <div className="overflow-hidden rounded-xl border border-brand-300 bg-surface p-6 shadow-sm dark:border-brand-700">
    <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-700 dark:bg-brand-950/30 dark:text-brand-300">
      <Zap className="size-3" /> Higher limits
    </div>

    <h3 className="relative text-xl font-bold text-brand-700 dark:text-brand-300">
      Upgrade to Premium
    </h3>
    <p className="relative mt-1 text-sm text-gray-600 dark:text-gray-400">
      {reason || "You've reached your daily limit."} Increase your limits with the lifetime plan.
    </p>

    <ul className="relative mt-4 space-y-2">
      {BENEFITS.map((benefit) => (
        <li key={benefit} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
          <CheckCircle2 className="size-4 shrink-0 text-brand-500 mt-0.5" />
          {benefit}
        </li>
      ))}
    </ul>

    <Link
      href="/app/upgrade"
      className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-500 active:scale-95"
    >
      <Zap className="size-4" />
      See Premium plans
    </Link>
  </div>
);

export default Upgrade_Prompt;

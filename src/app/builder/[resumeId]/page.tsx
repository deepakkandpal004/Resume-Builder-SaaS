"use client";

import dynamic from "next/dynamic";

const ResumeBuilder = dynamic(() => import("@/old-pages/ResumeBuilder"), { ssr: false });

export default function BuilderPage() {
  return <ResumeBuilder />;
}

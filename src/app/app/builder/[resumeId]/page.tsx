"use client";

import dynamic from "next/dynamic";

const Layout = dynamic(() => import("@/old-pages/Layout"), { ssr: false });
const ResumeBuilder = dynamic(() => import("@/old-pages/ResumeBuilder"), { ssr: false });

export default function AppBuilderPage() {
  return <Layout><ResumeBuilder /></Layout>;
}

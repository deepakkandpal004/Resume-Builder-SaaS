"use client";

import dynamic from "next/dynamic";

const Layout = dynamic(() => import("@/views/Layout"), { ssr: false });
const ResumeBuilder = dynamic(() => import("@/views/ResumeBuilder"), { ssr: false });

export default function AppBuilderPage() {
  return <Layout><ResumeBuilder /></Layout>;
}
"use client";
import dynamic from "next/dynamic";
const ResumeBuilder = dynamic(() => import("@/views/ResumeBuilder"), { ssr: false });
export default function BuilderPage() {
    return <ResumeBuilder />;
}

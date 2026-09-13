"use client";

import dynamic from "next/dynamic";

const Preview = dynamic(() => import("@/old-pages/Preview"), { ssr: false });

export default function ViewPage() {
  return <Preview />;
}

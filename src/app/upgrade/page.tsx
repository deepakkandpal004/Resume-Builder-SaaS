"use client";

import dynamic from "next/dynamic";

const Upgrade = dynamic(() => import("@/old-pages/Upgrade"), { ssr: false });

export default function UpgradePage() {
  return <Upgrade />;
}

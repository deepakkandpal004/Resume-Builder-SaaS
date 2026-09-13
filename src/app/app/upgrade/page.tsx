"use client";

import dynamic from "next/dynamic";

const Layout = dynamic(() => import("@/old-pages/Layout"), { ssr: false });
const Upgrade = dynamic(() => import("@/old-pages/Upgrade"), { ssr: false });

export default function AppUpgradePage() {
  return <Layout><Upgrade /></Layout>;
}

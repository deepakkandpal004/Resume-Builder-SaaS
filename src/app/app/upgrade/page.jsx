"use client";
import dynamic from "next/dynamic";
const Layout = dynamic(() => import("@/views/Layout"), { ssr: false });
const Upgrade = dynamic(() => import("@/views/Upgrade"), { ssr: false });
export default function AppUpgradePage() {
    return <Layout><Upgrade /></Layout>;
}

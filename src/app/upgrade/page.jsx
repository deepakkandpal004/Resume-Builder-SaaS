"use client";
import dynamic from "next/dynamic";
const Upgrade = dynamic(() => import("@/views/Upgrade"), { ssr: false });
export default function UpgradePage() {
    return <Upgrade />;
}

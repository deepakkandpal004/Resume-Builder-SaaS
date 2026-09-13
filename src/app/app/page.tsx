"use client";

import dynamic from "next/dynamic";

const Layout = dynamic(() => import("@/old-pages/Layout"), { ssr: false });
const Dashboard = dynamic(() => import("@/old-pages/Dashboard"), { ssr: false });

export default function AppPage() {
  return <Layout><Dashboard /></Layout>;
}

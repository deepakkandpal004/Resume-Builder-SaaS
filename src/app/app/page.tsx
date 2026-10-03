"use client";

import dynamic from "next/dynamic";

const Layout = dynamic(() => import("@/views/Layout"), { ssr: false });
const Dashboard = dynamic(() => import("@/views/Dashboard"), { ssr: false });

export default function AppPage() {
  return <Layout><Dashboard /></Layout>;
}
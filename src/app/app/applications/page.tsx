"use client";

import dynamic from "next/dynamic";

const Layout = dynamic(() => import("@/views/Layout"), { ssr: false });
const Applications = dynamic(() => import("@/views/Applications"), {
  ssr: false,
});

export default function ApplicationsPage() {
  return (
    <Layout>
      <Applications />
    </Layout>
  );
}
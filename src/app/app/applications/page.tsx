"use client";

import dynamic from "next/dynamic";

const Layout = dynamic(() => import("@/old-pages/Layout"), { ssr: false });
const Applications = dynamic(() => import("@/old-pages/Applications"), {
  ssr: false,
});

export default function ApplicationsPage() {
  return (
    <Layout>
      <Applications />
    </Layout>
  );
}

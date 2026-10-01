"use client";

import dynamic from "next/dynamic";

const Layout = dynamic(() => import("@/old-pages/Layout"), { ssr: false });
const Matcher = dynamic(() => import("@/old-pages/Matcher"), {
  ssr: false,
});

export default function MatcherPage() {
  return (
    <Layout>
      <Matcher />
    </Layout>
  );
}

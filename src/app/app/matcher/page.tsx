"use client";

import dynamic from "next/dynamic";

const Layout = dynamic(() => import("@/views/Layout"), { ssr: false });
const Matcher = dynamic(() => import("@/views/Matcher"), {
  ssr: false,
});

export default function MatcherPage() {
  return (
    <Layout>
      <Matcher />
    </Layout>
  );
}
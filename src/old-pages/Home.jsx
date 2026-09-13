"use client";
import { lazy, Suspense } from "react";
import HomeNavbar from "@/components/home/HomeNavbar";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import { useGlobalScrollReveal } from "@/hooks/useScrollReveal";

// Lazy load below-the-fold components
const Features = lazy(() => import("../components/home/Features"));
const ProductShowcase = lazy(() => import("../components/home/ProductShowcase"));
const TemplateShowcase = lazy(() => import("../components/home/TemplateShowcase"));
const Pricing = lazy(() => import("../components/home/Pricing"));
const FAQ = lazy(() => import("../components/home/FAQ"));
const CallToAction = lazy(() => import("../components/home/CallToAction"));
const Footer = lazy(() => import("../components/home/Footer"));

const Home = () => {
  useGlobalScrollReveal(0.1);

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas text-body">
      <HomeNavbar />

      <main className="relative">
        <Hero />
        <HowItWorks />
        
        <Suspense fallback={<div className="h-[500px]" />}>
          <Features />
        </Suspense>
        
        <Suspense fallback={<div className="h-[600px]" />}>
          <ProductShowcase />
        </Suspense>
        
        <Suspense fallback={<div className="h-[600px]" />}>
          <TemplateShowcase />
        </Suspense>
        
        <Suspense fallback={<div className="h-[550px]" />}>
          <Pricing />
        </Suspense>
        
        <Suspense fallback={<div className="h-[500px]" />}>
          <FAQ />
        </Suspense>
        
        <Suspense fallback={<div className="h-[450px]" />}>
          <CallToAction />
        </Suspense>
      </main>
      
      <Suspense fallback={<div className="h-[300px]" />}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Home;

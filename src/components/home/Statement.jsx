"use client";
import { useEffect, useState } from "react";
import Reveal from "./Reveal";

/*
  Statement with a rotating verb: the line stays, the action flips
  every few seconds with a smooth vertical roll.
*/

const PHRASES = ["Match it.", "Tailor it.", "Track it."];

function Rotator() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setI((v) => (v + 1) % PHRASES.length),
      2400
    );
    return () => clearInterval(id);
  }, []);

  return (
    <span className="inline-block h-[1.25em] overflow-hidden align-bottom">
      <span
        className="flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateY(-${i * 1.25}em)` }}
      >
        {PHRASES.map((p) => (
          <span
            key={p}
            className="block h-[1.25em] whitespace-nowrap leading-[1.25] text-brand-600"
          >
            {p}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function Statement() {
  return (
    <section className="px-6 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-5xl text-center">
        <Reveal>
          <p className="text-3xl font-bold leading-snug tracking-tight text-ink md:text-5xl md:leading-tight">
            Your resume should work as hard as you do. <Rotator />
          </p>
        </Reveal>
      </div>
    </section>
  );
}

"use client";
import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";
import Logo from "../ui/Logo";
const columns = [
    {
        title: "Product",
        links: [
            { label: "Resume builder", href: "/app" },
            { label: "Resume matcher", href: "/app/matcher" },
            { label: "Templates", href: "#templates" },
            { label: "Features", href: "#features" },
            { label: "Pricing", href: "#pricing" },
        ],
    },
    {
        title: "Company",
        links: [
            { label: "How it works", href: "#how-it-works" },
            { label: "FAQ", href: "#faq" },
            { label: "Contact", href: "#cta" },
        ],
    },
];
const socialLinks = [
    { icon: Github, href: "https://github.com/deepakkandpal004", label: "GitHub" },
    { icon: Twitter, href: "https://x.com/deepakkandpal", label: "Twitter/X" },
    { icon: Linkedin, href: "https://linkedin.com/in/deepakkandpal", label: "LinkedIn" },
];
const Footer = () => {
    return (<footer className="border-t border-line px-6 pt-10 pb-6 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-8 pb-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 flex flex-col items-start gap-3">
            <Link href="/" aria-label="ResumeAI home">
              <Logo size="sm"/>
            </Link>
            <p className="max-w-xs text-xs leading-relaxed text-body">
              Match your resume to the job, tailor it to the role, and track
              every application in one workspace.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (<div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-wider text-ink/70">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2 text-xs sm:text-sm">
                {col.links.map((link) => (<li key={link.label}>
                    {link.href.startsWith("#") ? (<a href={link.href} className="font-semibold text-muted transition hover:text-brand-600">
                        {link.label}
                      </a>) : (<Link href={link.href} className="font-semibold text-muted transition hover:text-brand-600">
                        {link.label}
                      </Link>)}
                  </li>))}
              </ul>
            </div>))}

          {/* Social */}
          <div className="col-span-2 md:col-span-1">
            <p className="text-xs font-bold uppercase tracking-wider text-ink/70">
              Connect
            </p>
            <ul className="mt-3 space-y-2.5 text-xs sm:text-sm">
              {socialLinks.map((s) => {
            const Icon = s.icon;
            return (<li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 text-muted transition-colors hover:text-brand-600">
                      <span className="flex size-6 items-center justify-center rounded-md border border-line bg-surface transition-colors group-hover:border-brand-500/30 group-hover:bg-brand-500/10">
                        <Icon className="size-3"/>
                      </span>
                      <span className="font-semibold">{s.label}</span>
                    </a>
                  </li>);
        })}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-line/50 pt-5 text-xs font-semibold text-muted sm:flex-row">
          <p>&copy; {new Date().getFullYear()} ResumeAI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#faq" className="transition-colors hover:text-brand-600">
              FAQ
            </a>
            <span className="text-line">|</span>
            <a href="#cta" className="transition-colors hover:text-brand-600">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>);
};
export default Footer;

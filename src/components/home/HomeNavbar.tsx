"use client";
import { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, ArrowRight, BadgeCheck } from "lucide-react";
import Logo from "../ui/Logo";
import { logout } from "@/lib/store/features/authSlice";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/config/firebaseClient";

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features",     href: "#features"     },
  { label: "Templates",    href: "#templates"     },
  { label: "Pricing",      href: "#pricing"       },
];

const HomeNavbar = () => {
  const { user } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && event.target instanceof Node && !profileMenuRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleLogout = () => {
    setProfileDropdownOpen(false);
    dispatch(logout());
    signOut(auth);
    router.push("/");
  };

  /* ── Scroll effect tracker ── */
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ── IntersectionObserver for active section tracking ─────────── */
  useEffect(() => {
    const sections = NAV_LINKS.map(link => document.querySelector(link.href)).filter(Boolean);

    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: "-25% 0px -55% 0px", // Trigger when section occupies the primary viewport space
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((section) => observer.observe(section as Element));

    return () => {
      sections.forEach((section) => observer.unobserve(section as Element));
    };
  }, []);

  /* ── Escape key ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ── Body scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors flex items-center ${
        scrolled
          ? "h-16 bg-surface/75 backdrop-blur-[18px] border-b border-line/45 shadow-sm"
          : "h-20 bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="relative z-10 shrink-0 hover:opacity-90 transition-opacity" aria-label="ResumeAI home">
          <Logo size="md" />
        </Link>

        {/* Desktop nav links with active-section indicator */}
        <div className="hidden items-center gap-1 md:flex relative">
          {NAV_LINKS.map((l) => {
            const isActive = l.href === `#${activeSection}`;
            return (
              <a
                key={l.label}
                href={l.href}
                className={`relative px-4 py-2 text-sm font-semibold tracking-tight transition-colors cursor-pointer ${
                  isActive
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-body hover:text-brand-600 dark:hover:text-brand-400"
                }`}
              >
                <span>{l.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 inset-x-4 h-0.5 bg-brand-500 dark:bg-brand-400 rounded-full" />
                )}
              </a>
            );
          })}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3.5 md:flex">
          {user ? (
            <div className="flex items-center gap-3.5">
              <Link
                href="/app"
                className="flex items-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4.5 py-1.5 text-xs font-bold transition-colors cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight className="size-3.5" />
              </Link>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex size-8 items-center justify-center rounded-full border border-line bg-surface/80 hover:bg-canvas transition-colors cursor-pointer"
                >
                  <div className="flex size-7 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20 text-xs font-bold text-brand-700 dark:text-brand-300">
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2.5 w-48 overflow-hidden rounded-xl border border-line bg-surface shadow-xl z-50">
                    <div className="px-3.5 py-2.5 border-b border-line/40">
                      <p className="text-xs font-semibold text-ink truncate flex items-center gap-1">
                        {user?.name || "User"}
                        {user?.emailVerified && (
                          <BadgeCheck className="size-3.5 text-emerald-500 shrink-0" />
                        )}
                      </p>
                      <p className="text-[10px] text-muted truncate">
                        {user?.email || ""}
                      </p>
                    </div>

                    <Link
                      href="/app"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs text-muted hover:bg-line/10 transition-colors"
                    >
                      <span>Go to dashboard</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-xs text-muted hover:bg-line/10 hover:text-red-500 transition-colors cursor-pointer border-t border-line/45"
                    >
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/app?state=login"
                className="px-4 py-1.5 text-xs font-bold text-body hover:text-ink transition-colors cursor-pointer"
              >
                Login
              </Link>
              <Link
                href="/app?state=register"
                className="flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4.5 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <span>Build resume</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="relative z-10 flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-body transition-colors hover:text-ink"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className={`absolute transition-opacity ${menuOpen ? "opacity-100" : "opacity-0"}`}>
              <X size={19} />
            </span>
            <span className={`absolute transition-opacity ${menuOpen ? "opacity-0" : "opacity-100"}`}>
              <Menu size={19} />
            </span>
          </button>
        </div>
      </div>

      {/* ── Mobile backdrop ───────────────────────────────────────── */}
      {menuOpen && (
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm md:hidden"
          aria-label="Close menu overlay"
        />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────────── */}
      {menuOpen && (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-canvas border-l border-line md:hidden"
      >
        <button
          onClick={() => setMenuOpen(false)}
          className="absolute right-5 top-5 flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-body transition-colors hover:text-ink"
          aria-label="Close menu"
        >
          <X size={19} />
        </button>

        <Link href="/" onClick={() => setMenuOpen(false)} className="mb-2">
          <Logo size="md" />
        </Link>

        <div className="flex w-full flex-col items-center gap-1 px-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="w-full rounded-xl px-6 py-3.5 text-center font-medium text-body transition-colors hover:bg-ink/5 hover:text-ink"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", letterSpacing: "-0.01em" }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex w-full flex-col items-center gap-3 px-8 pt-2">
          {user ? (
            <>
              <Link
                href="/app"
                onClick={() => setMenuOpen(false)}
                className="flex w-full max-w-xs items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 text-sm font-bold transition-colors"
              >
                Dashboard <ArrowRight className="size-4" />
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="w-full max-w-xs rounded-xl border border-line bg-surface py-3.5 text-center font-medium text-body transition-colors hover:text-ink cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/app?state=register"
                onClick={() => setMenuOpen(false)}
                className="flex w-full max-w-xs items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 text-sm font-bold transition-colors"
              >
                Start free <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/app?state=login"
                onClick={() => setMenuOpen(false)}
                className="w-full max-w-xs rounded-xl border border-line bg-surface py-3.5 text-center font-medium text-body transition-colors hover:text-ink"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Login
              </Link>
            </>
          )}
        </div>
      </div>
      )}
    </nav>
  );
};

export default HomeNavbar;

"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/layout/logo";

const footerColumns = [
  {
    title: "Platform",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/lawyers", label: "Find a lawyer" },
      { href: "/ai-assistant", label: "AI assistant" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Knowledge",
    links: [
      { href: "/faq", label: "FAQ & Help" },
      { href: "/about", label: "About us" },
    ],
  },
  {
    title: "Legal & Trust",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Sign up" },
      { href: "/forgot-password", label: "Forgot password" },
    ],
  },
];

const contactDetails = [
  { icon: MapPin, label: "Karachi, Sindh, Pakistan" },
  { icon: Phone, label: "+92 343 3142350" },
  { icon: Mail, label: "contact@legalease.pk" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/10 bg-navy text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div className="max-w-sm space-y-5">
            <Logo variant="light" />
            <p className="text-sm font-medium text-white/90">
              Understand the law. Find the right lawyer.
            </p>
            <p className="text-xs leading-relaxed text-white/65">
              LegalEase connects citizens with verified advocates, statutory Pakistan Code & Sindh Code retrieval, and verified legal tools.
            </p>
            <div className="flex flex-col gap-2 text-xs text-white/65">
              {contactDetails.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-2.5">
                  <Icon className="size-3.5 shrink-0 text-teal" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-teal">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-white/70 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row">
          <p>
            © {new Date().getFullYear()} LegalEase Pakistan. Final Year Project — KIET BSCS. All rights reserved.
          </p>
          <p className="inline-flex items-center gap-1.5">
            Built with Next.js & Supabase · Powered by Google Gemini
          </p>
        </div>
      </div>
    </footer>
  );
}
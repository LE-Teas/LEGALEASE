"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/logo";
import { HeaderAuth } from "@/components/auth/header-auth";

const navLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/lawyers", label: "Find a lawyer" },
  { href: "/ai-assistant", label: "AI assistant" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-mint text-teal font-semibold"
                      : "text-slate hover:bg-mint/60 hover:text-navy"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <HeaderAuth layout="desktop" />
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <MobileNav pathname={pathname} />
        </div>
      </div>
    </header>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu className="text-navy" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 gap-0 p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="flex h-16 items-center border-b border-border/70 px-4">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1 p-3" aria-label="Mobile">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-mint text-teal font-semibold"
                    : "text-slate hover:bg-mint/50 hover:text-navy"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-border/70 bg-white p-4">
          <HeaderAuth layout="mobile" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
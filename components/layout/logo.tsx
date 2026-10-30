import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "dark" | "light";
  className?: string;
  href?: string | null;
  showTagline?: boolean;
  /** "full" = full SVG wordmark (default), "icon" = square icon only (collapsed sidebar) */
  mode?: "full" | "icon";
}

export function Logo({
  variant = "dark",
  className,
  href = "/",
  showTagline = false,
  mode = "full",
}: LogoProps) {
  const content =
    mode === "icon" ? (
      /* Icon-only — used when sidebar is collapsed */
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-slate-200">
        <Image
          src="/favicon.png"
          alt="LegalEase"
          width={36}
          height={36}
          className="size-8 object-contain"
          priority
        />
      </span>
    ) : (
      /* Full SVG wordmark — already contains "LegalEase / Legal Help. Made Easier." */
      <Image
        src="/logo-brand.svg"
        alt="LegalEase — Legal Help. Made Easier."
        width={variant === "light" ? 160 : 160}
        height={40}
        className={cn(
          "h-9 w-auto object-contain",
          variant === "light" && "brightness-0 invert"
        )}
        priority
      />
    );

  if (href === null) {
    return (
      <div className={cn("inline-flex items-center", className)}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-label="LegalEase — Legal Help. Made Easier."
      className={cn("inline-flex items-center", className)}
    >
      {content}
    </Link>
  );
}
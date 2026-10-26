"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PopLink } from "@/components/ui/kit";

const LINKS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/analyze", label: "Resume score" },
  { href: "/match", label: "Job match" },
  { href: "/tracker", label: "Tracker" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-ink/85 backdrop-blur-md no-print">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 md:px-8">
        <Link href="/" className="font-serif text-[26px] leading-none tracking-tight">
          CareerCopilot
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname.startsWith(l.href) ? "page" : undefined}
              className={cn(
                "px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-text",
                pathname.startsWith(l.href) && "text-text",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <PopLink href="/analyze" size="sm">
          Score my resume
        </PopLink>
      </div>
      {/* Mobile: links in a scrollable row under the logo. */}
      <div className="flex gap-1 overflow-x-auto border-t border-line px-3 md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "whitespace-nowrap px-3 py-2.5 text-sm text-muted",
              pathname.startsWith(l.href) && "text-text border-b border-gold",
            )}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { scoreTone } from "@/lib/format";

/*
 * The design system's building blocks. Every page composes these instead of
 * repeating long class strings, so the look stays consistent and a design
 * change happens in one place.
 */

type PopVariant = "light" | "dark";
const popStyles: Record<PopVariant, string> = {
  light: "bg-text text-ink",
  dark: "bg-surface-2 text-text border border-line-strong [--edge:var(--color-line-strong)]",
};
const popSizes = { md: "px-6 py-3.5 text-[15px]", sm: "px-4 py-2 text-sm" };

export function PopButton({
  variant = "light",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: PopVariant; size?: keyof typeof popSizes }) {
  return <button className={cn("pop", popStyles[variant], popSizes[size], className)} {...props} />;
}

export function PopLink({
  variant = "light",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: PopVariant; size?: keyof typeof popSizes }) {
  return <Link className={cn("pop", popStyles[variant], popSizes[size], className)} {...props} />;
}

/** Quiet secondary action: text with an underline that appears on hover. */
export function TextButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 text-sm font-semibold text-text underline-offset-4 hover:underline disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Panel({
  title,
  aside,
  children,
  className,
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[4px] border border-line bg-surface p-6 md:p-8 break-inside-avoid", className)}>
      {(title || aside) && (
        <div className="mb-6 flex items-baseline justify-between gap-4">
          {title && <h3 className="font-serif text-[28px] leading-tight">{title}</h3>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

const chipTones = {
  good: "border-mint/40 text-mint",
  bad: "border-rose/40 text-rose",
  gold: "border-gold/50 text-gold",
  neutral: "border-line-strong text-text/80",
};

export function Chip({ tone = "neutral", children, className }: { tone?: keyof typeof chipTones; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium", chipTones[tone], className)}>
      {children}
    </span>
  );
}

const toneBg = { good: "bg-mint", mid: "bg-amber", bad: "bg-rose" };
const toneText = { good: "text-mint", mid: "text-amber", bad: "text-rose" };

export const scoreText = (n: number) => toneText[scoreTone(n)];

export function Bar({ percent, tone, label }: { percent: number; tone?: "good" | "mid" | "bad" | "gold"; label: string }) {
  const color = tone === "gold" ? "bg-gold" : toneBg[tone ?? scoreTone(percent)];
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className="h-[6px] w-full bg-surface-2"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cn("h-full transition-[width] duration-700 ease-out", color)} style={{ width: `${value}%` }} />
    </div>
  );
}

/** A big serif number with a small label: the report's headline figures. */
export function Stat({ label, value, suffix, tone }: { label: string; value: string | number; suffix?: string; tone?: string }) {
  return (
    <div className="border border-line bg-surface p-5 md:p-6 rounded-[4px]">
      <p className="text-[13px] text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 font-serif leading-none tabular-nums",
          String(value).length > 6 ? "text-4xl md:text-[44px]" : "text-5xl md:text-6xl",
          tone,
        )}
      >
        {value}
        {suffix && <span className="ml-1 font-sans text-base text-muted">{suffix}</span>}
      </p>
    </div>
  );
}

export function PageHeader({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return (
    <header className="mb-12 md:mb-16 no-print">
      <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] tracking-tight max-w-3xl">{title}</h1>
      <p className="mt-5 max-w-xl text-lg text-muted leading-relaxed">{intro}</p>
      {children}
    </header>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="border-l-2 border-rose bg-rose/10 px-4 py-3 text-sm text-rose">
      {children}
    </p>
  );
}

export function FieldLabel({ htmlFor, children, hint }: { htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-baseline justify-between text-[13px] font-semibold text-text/90">
      {children}
      {hint && <span className="font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 md:px-8", className)}>{children}</div>;
}

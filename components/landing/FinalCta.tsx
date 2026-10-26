import { PopLink } from "@/components/ui/kit";

export default function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 md:px-8">
      <div className="flex flex-col items-start justify-between gap-8 border border-line bg-surface p-8 md:flex-row md:items-center md:p-14 rounded-[4px]">
        <h2 className="max-w-xl font-serif text-4xl leading-tight md:text-5xl">It takes about thirty seconds. Bring a PDF.</h2>
        <PopLink href="/analyze">Score my resume</PopLink>
      </div>
    </section>
  );
}

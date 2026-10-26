const STEPS = [
  {
    title: "Upload your resume",
    body: "A PDF or pasted text. It is read in memory and never saved on our servers.",
  },
  {
    title: "Rules do the maths",
    body: "Skills, experience, the score and role fit come from transparent rules, so the same resume always gets the same numbers.",
  },
  {
    title: "AI writes the advice",
    body: "A language model turns those facts into feedback, bullet rewrites and cover letters. Its answer is checked before you see it.",
  },
];

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
      <h2 className="max-w-2xl font-serif text-4xl leading-tight md:text-6xl">Numbers you can check. Advice that reads like a mentor.</h2>
      <ol className="mt-14 grid gap-10 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="border-t border-gold/60 pt-6">
            <span className="font-serif text-5xl text-gold">{i + 1}</span>
            <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

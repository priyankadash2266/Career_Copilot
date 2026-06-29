import { Upload, Brain, TrendingUp } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: "Upload Resume",
      description:
        "Upload your resume in PDF format and let AI understand your profile.",
    },
    {
      icon: Brain,
      title: "AI Analysis",
      description:
        "We analyze skills, experience, projects, achievements and strengths.",
    },
    {
      icon: TrendingUp,
      title: "Career Roadmap",
      description:
        "Get job matches, salary forecasts and personalized growth plans.",
    },
  ];

  return (
    <section className="py-32 px-8 bg-black">
      <div className="max-w-6xl mx-auto">

        <h2 className="text-5xl font-bold text-center mb-20">
          How It Works
        </h2>

        <div className="grid md:grid-cols-3 gap-8">

          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-8"
              >
                <Icon size={42} className="text-purple-400 mb-6" />

                <h3 className="text-2xl font-semibold mb-4">
                  {step.title}
                </h3>

                <p className="text-zinc-400">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
import { Brain, TrendingUp, Target, Briefcase } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Resume Analysis",
    description:
      "Understand your strengths, weaknesses and hiring potential instantly.",
  },
  {
    icon: Target,
    title: "Skill Gap Detection",
    description:
      "Discover exactly what skills you need to land your dream role.",
  },
  {
    icon: TrendingUp,
    title: "Salary Growth Predictor",
    description:
      "See how your salary can grow over the next 12 months.",
  },
  {
    icon: Briefcase,
    title: "Future You™",
    description:
      "Visualize your career roadmap and next best opportunities.",
  },
];

export default function Features() {
  return (
    <section className="py-32 px-8 bg-black">
      <div className="max-w-7xl mx-auto">

        <h2 className="text-5xl font-bold text-center mb-16">
          More Than Job Matching
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-purple-500 transition"
              >
                <Icon size={40} className="mb-6 text-purple-400" />

                <h3 className="text-2xl font-semibold mb-4">
                  {feature.title}
                </h3>

                <p className="text-zinc-400">
                  {feature.description}
                </p>
              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
}
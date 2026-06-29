export default function CareerGPS() {
  return (
    <section className="py-32 px-8 bg-black">

      <div className="max-w-5xl mx-auto">

        <h2 className="text-5xl font-bold text-center mb-8">
          Career GPS™
        </h2>

        <p className="text-center text-zinc-400 mb-20">
          The shortest path to your dream role.
        </p>

        <div className="rounded-3xl bg-white/5 border border-white/10 p-10">

          <div className="flex justify-between mb-8">
            <span>Technology Analyst</span>
            <span>Backend Engineer</span>
          </div>

          <div className="w-full h-5 bg-white/10 rounded-full overflow-hidden">
            <div className="w-[62%] h-full bg-purple-500" />
          </div>

          <div className="mt-10">

            <h3 className="text-2xl font-semibold mb-4">
              Missing Skills
            </h3>

            <div className="flex flex-wrap gap-3">

              <span className="px-4 py-2 rounded-xl bg-red-500/20">
                Docker
              </span>

              <span className="px-4 py-2 rounded-xl bg-red-500/20">
                System Design
              </span>

              <span className="px-4 py-2 rounded-xl bg-red-500/20">
                Kubernetes
              </span>

            </div>

            <div className="mt-8">
              <p className="text-zinc-400">
                Estimated Time:
              </p>

              <p className="text-3xl font-bold">
                5 Months
              </p>
            </div>

            <div className="mt-6">
              <p className="text-zinc-400">
                Success Probability
              </p>

              <p className="text-3xl font-bold text-green-400">
                83%
              </p>
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}
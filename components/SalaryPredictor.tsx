export default function SalaryPredictor() {
  return (
    <section className="py-32 px-8 bg-black">

      <div className="max-w-5xl mx-auto text-center">

        <h2 className="text-5xl font-bold mb-8">
          Salary Growth Predictor
        </h2>

        <p className="text-zinc-400 mb-16">
          See how your career decisions impact your future earnings.
        </p>

        <div className="grid md:grid-cols-4 gap-6">

          <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
            <h3 className="text-zinc-400">Today</h3>
            <p className="text-3xl font-bold mt-4">₹7L</p>
          </div>

          <div className="p-8 rounded-3xl bg-purple-500/10 border border-purple-500/30">
            <h3 className="text-purple-300">6 Months</h3>
            <p className="text-3xl font-bold mt-4">₹10L</p>
          </div>

          <div className="p-8 rounded-3xl bg-green-500/10 border border-green-500/30">
            <h3 className="text-green-300">12 Months</h3>
            <p className="text-3xl font-bold mt-4">₹14L</p>
          </div>

          <div className="p-8 rounded-3xl bg-yellow-500/10 border border-yellow-500/30">
            <h3 className="text-yellow-300">24 Months</h3>
            <p className="text-3xl font-bold mt-4">₹20L</p>
          </div>

        </div>

      </div>

    </section>
  );
}
export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-8 py-5 flex justify-between items-center">

        <h1 className="text-2xl font-bold">
          CareerCopilot
        </h1>

        <div className="flex gap-4">

          <button className="px-4 py-2 rounded-xl hover:bg-white/5">
            Login
          </button>

          <button className="px-5 py-2 rounded-xl bg-white text-black font-semibold">
            Get Started
          </button>

        </div>

      </div>
    </nav>
  );
}
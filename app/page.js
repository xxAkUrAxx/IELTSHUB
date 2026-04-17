export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200 p-6">
      <section className="card w-full max-w-2xl bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-base-content/60">
            App Router Ready
          </p>
          <h1 className="text-4xl font-bold text-base-content">IELTSHUB</h1>
          <p className="text-base text-base-content/80">
            Next.js, Tailwind, DaisyUI, Firebase, and your role-based folders are
            set up and ready for the next step.
          </p>
        </div>
      </section>
    </main>
  );
}

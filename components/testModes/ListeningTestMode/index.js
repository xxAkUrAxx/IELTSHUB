export default function ListeningTestMode({ testData }) {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-base-200 text-base-content">
      <div className="h-full w-3/5 overflow-y-auto border-r border-base-300 bg-base-100 p-6">
        <div className="space-y-6">
          <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Listening Test
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {testData?.name || "Listening Test"}
            </h1>
          </section>

          <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Audio Section
            </p>
            <div className="mt-4 text-base leading-8 text-base-content/70">
              {testData?.audioUrl || "Audio player placeholder"}
            </div>
          </section>
        </div>
      </div>

      <div className="h-full w-2/5 overflow-y-auto bg-base-200 p-6">
        <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
            Questions
          </p>
          <div className="mt-4 text-base leading-8 text-base-content/70">
            Listening questions will appear here.
          </div>
        </section>
      </div>
    </main>
  );
}

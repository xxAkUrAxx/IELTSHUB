export default function WritingTestMode({ testData }) {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-base-200 text-base-content">
      <div className="h-full w-1/2 overflow-y-auto border-r border-base-300 bg-base-100 p-6">
        <div className="space-y-6">
          <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Writing Test
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {testData?.name || "Writing Test"}
            </h1>
          </section>

          <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Task 1
            </p>
            <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-base-content">
              {testData?.task1 || "Task 1 content will appear here."}
            </div>
          </section>
        </div>
      </div>

      <div className="h-full w-1/2 overflow-y-auto bg-base-200 p-6">
        <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
            Task 2
          </p>
          <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-base-content">
            {testData?.task2 || "Task 2 content will appear here."}
          </div>
        </section>
      </div>
    </main>
  );
}

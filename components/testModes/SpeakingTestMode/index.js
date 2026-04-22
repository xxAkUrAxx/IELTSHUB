export default function SpeakingTestMode({ testData }) {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-base-200 text-base-content">
      <div className="h-full w-1/2 overflow-y-auto border-r border-base-300 bg-base-100 p-6">
        <div className="space-y-6">
          <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Speaking Test
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {testData?.name || "Speaking Test"}
            </h1>
          </section>

          <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Part 1
            </p>
            <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-base-content">
              {Array.isArray(testData?.part1Questions) && testData.part1Questions.length > 0
                ? testData.part1Questions.join("\n")
                : "Part 1 questions will appear here."}
            </div>
          </section>
        </div>
      </div>

      <div className="h-full w-1/2 overflow-y-auto bg-base-200 p-6">
        <div className="space-y-6">
          <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Part 2
            </p>
            <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-base-content">
              {testData?.part2CueCard || "Part 2 cue card will appear here."}
            </div>
          </section>

          <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Part 3
            </p>
            <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-base-content">
              {Array.isArray(testData?.part3Questions) && testData.part3Questions.length > 0
                ? testData.part3Questions.join("\n")
                : "Part 3 questions will appear here."}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

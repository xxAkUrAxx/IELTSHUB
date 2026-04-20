export default function TestMode({ testTitle = "Reading Test", onStartTest }) {
  const instructions = [
    {
      label: "Test Duration",
      value: "60 minutes",
    },
    {
      label: "Sections",
      value: "3",
    },
    {
      label: "Number of Questions",
      value: "40",
    },
    {
      label: "Split-Screen View",
      value:
        "The reading passage appears on the left side of the screen, and the questions are on the right.",
    },
    {
      label: "Navigation",
      value:
        "You can move between questions and sections using the navigation bar at the bottom of the screen.",
    },
    {
      label: "Highlighting Text",
      value: "Right-click to highlight text in the passage.",
    },
    {
      label: "Making Notes",
      value: "Right-click to add notes to specific parts of the text.",
    },
    {
      label: "Reviewing Answers",
      value:
        "Flag questions for review by clicking the checkbox next to the question number.",
    },
    {
      label: "Timer",
      value:
        "A countdown timer is visible on the screen, showing the remaining time.",
    },
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200 px-6 py-10">
      <div className="card w-full max-w-4xl border border-base-300 bg-base-100 shadow-lg">
        <div className="card-body gap-8 p-8 md:p-10">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {testTitle} Instructions
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-base-content/70">
              Review the test format and tools below before beginning your reading
              test.
            </p>
          </div>

          <div className="space-y-4">
            {instructions.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-base-300 bg-base-50 px-5 py-4"
              >
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-base-content/55">
                  {item.label}
                </p>
                <p className="text-base leading-7 text-base-content">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              className="btn btn-primary btn-lg min-w-56"
              onClick={onStartTest}
            >
              Start Test
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

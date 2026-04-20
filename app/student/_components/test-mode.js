const instructionSets = {
  reading: {
    title: "Reading Test Instructions",
    description:
      "Review the test format and tools below before beginning your reading test.",
    instructions: [
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
    ],
  },
  writing: {
    title: "Writing Test Instructions",
    description:
      "Review the test format and tools below before beginning your writing test.",
    instructions: [
      {
        label: "Total Time",
        value: "60 minutes",
      },
      {
        label: "Tasks",
        value: "2 (Task 1 and Task 2)",
      },
      {
        label: "Time Management",
        value:
          "You are responsible for managing your own time. It is recommended to spend approximately 20 minutes on Task 1 and 40 minutes on Task 2.",
      },
      {
        label: "Typing Responses",
        value:
          "You will type your answers directly into the provided text fields to the right of the screen.",
      },
      {
        label: "Word Count",
        value:
          "A word count is displayed on the bottom right of the screen to help you monitor the length of your responses.",
      },
      {
        label: "Navigation",
        value:
          "You can navigate between tasks using the on-screen interface.",
      },
      {
        label: "Highlighting and Notes",
        value:
          "You have the ability to highlight text and make notes during the test.",
      },
      {
        label: "Timer",
        value:
          "A timer is visible on the screen, counting down the remaining time.",
      },
    ],
  },
  listening: {
    title: "Listening Test Instructions",
    description:
      "Review the test format and tools below before beginning your listening test.",
    instructions: [
      {
        label: "Test Duration",
        value: "Approximately 30 minutes",
      },
      {
        label: "Review Time",
        value: "2 minutes at the end to check your answers",
      },
      {
        label: "Audio Playback",
        value:
          "Each recording is played once only and starts when you start the section",
      },
      {
        label: "Question Navigation",
        value:
          "Use the navigation bar at the bottom to move between sections of the test",
      },
      {
        label: "No Extra Transfer Time",
        value:
          "Unlike the paper-based test, there is no additional time to transfer answers. Enter your answers directly as you listen.",
      },
      {
        label: "Spelling & Grammar",
        value:
          "Pay attention to spelling and grammar; incorrect spelling may be penalized.",
      },
      {
        label: "Word Limit",
        value:
          "Adhere to the word limit specified in the instructions for each question.",
      },
    ],
  },
  speaking: {
    title: "Speaking Test Instructions",
    description: "Instructions coming soon.",
    instructions: [
      {
        label: "Instructions",
        value: "Instructions coming soon.",
      },
    ],
  },
};

export default function TestMode({ testTitle = "Reading Test", testType = "reading", onStartTest }) {
  const content = instructionSets[testType] ?? instructionSets.reading;
  const { title, description, instructions } = content;

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200 px-6 py-10">
      <div className="card w-full max-w-4xl border border-base-300 bg-base-100 shadow-lg">
        <div className="card-body gap-8 p-8 md:p-10">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {title}
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-base-content/70">
              {description}
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

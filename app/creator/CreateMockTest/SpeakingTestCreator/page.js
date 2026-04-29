"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  InformationCircleIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  deleteSpeakingTest,
  listSpeakingTests,
  saveSpeakingTest,
} from "../../../../lib/tests/speaking-tests";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

async function withTimeout(promise, timeoutMs, message) {
  let timerId;

  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timerId);
  }
}

function formatCreatedAt(createdAt) {
  if (!createdAt) {
    return "Unknown date";
  }

  if (typeof createdAt.toDate === "function") {
    return createdAt.toDate().toLocaleDateString();
  }

  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date";
  }

  return parsedDate.toLocaleDateString();
}

function getDifficultyTextColor(difficulty) {
  const normalizedDifficulty = String(difficulty).toLowerCase();

  if (normalizedDifficulty === "easy") {
    return "#4CCD99";
  }

  if (normalizedDifficulty === "hard") {
    return "#AE2448";
  }

  return "#FFC700";
}

const difficultyOptions = [
  { value: "easy", label: "Easy", color: "#4CCD99" },
  { value: "medium", label: "Medium", color: "#FFC700" },
  { value: "hard", label: "Hard", color: "#AE2448" },
];

function getSpeakingTheme(themeMode = "dark") {
  const isLightMode = themeMode === "light";

  return {
    inputClass: isLightMode
      ? "input w-full border-[#bfd0ea] bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#7aa2d6] focus:outline-none"
      : "input w-full border-[#233447] bg-[#1b2a3a] px-4 text-white placeholder:text-white/45 focus:border-[#3b5168] focus:outline-none",
    selectClass: isLightMode
      ? "select w-full border-[#bfd0ea] bg-white px-4 text-slate-900 focus:border-[#7aa2d6] focus:outline-none"
      : "select w-full border-[#233447] bg-[#1b2a3a] px-4 text-white focus:border-[#3b5168] focus:outline-none",
    textareaClass: isLightMode
      ? "textarea w-full border-[#bfd0ea] bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[#7aa2d6] focus:outline-none"
      : "textarea w-full border-[#233447] bg-[#1b2a3a] px-4 py-3 text-white placeholder:text-white/45 focus:border-[#3b5168] focus:outline-none",
    closeButtonClass: isLightMode
      ? "btn rounded-xl border-[#94a3b8] bg-transparent px-5 text-slate-700 hover:border-[#64748b] hover:bg-slate-200/60"
      : "btn rounded-xl border-[#3b5168] bg-transparent px-5 text-white hover:border-[#4a647f] hover:bg-white/5",
    selectStyle: isLightMode
      ? { backgroundColor: "#ffffff", color: "#0f172a" }
      : { backgroundColor: "#1b2a3a", color: "#ffffff" },
    accentPanelClass: isLightMode
      ? "rounded-2xl border border-[#bfd0ea] bg-[#f8fbff] p-4"
      : "rounded-2xl border border-[#233447] bg-[#162231] p-4",
  };
}

function CreatorActionButton({ onClick, children }) {
  return (
    <button
      type="button"
      className="btn gap-2 border-0 font-bold text-white"
      style={{ backgroundColor: "#007F73", color: "#ffffff" }}
      onClick={onClick}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor = "#00695f";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = "#007F73";
      }}
    >
      {children}
    </button>
  );
}

function createSpeakingTopic(index) {
  return {
    id: `topic-${index + 1}`,
    title: "",
    questions: ["", "", "", ""],
  };
}

function createSpeakingPart2Topic(index) {
  return {
    id: `part2-topic-${index + 1}`,
    topicTitle: "",
    cueCard: "",
    followUpQuestions: ["", "", "", ""],
  };
}

function normalizeQuestionSlots(questions = [], minimumLength = 4) {
  const normalizedQuestions = Array.isArray(questions)
    ? questions.map((question) => String(question || ""))
    : [];

  while (normalizedQuestions.length < minimumLength) {
    normalizedQuestions.push("");
  }

  return normalizedQuestions.slice(0, minimumLength);
}

function normalizeTopics(topics = []) {
  const normalizedTopics = Array.isArray(topics)
    ? topics.map((topic, index) => ({
        id: topic?.id || `topic-${index + 1}`,
        title: String(topic?.title || ""),
        questions: normalizeQuestionSlots(topic?.questions, 4),
      }))
    : [];

  while (normalizedTopics.length < 12) {
    normalizedTopics.push(createSpeakingTopic(normalizedTopics.length));
  }

  return normalizedTopics.slice(0, 12);
}

function normalizePart2Topics(topics = []) {
  const normalizedTopics = Array.isArray(topics)
    ? topics.map((topic, index) => ({
        id: topic?.id || `part2-topic-${index + 1}`,
        topicTitle: String(topic?.topicTitle || topic?.title || ""),
        cueCard: String(topic?.cueCard || ""),
        followUpQuestions: normalizeQuestionSlots(topic?.followUpQuestions, 4),
      }))
    : [];

  if (normalizedTopics.length === 0) {
    normalizedTopics.push(createSpeakingPart2Topic(0));
  }

  return normalizedTopics;
}

const initialSpeakingTestForm = () => ({
  testName: "",
  testDifficulty: "medium",
  date: getTodayDate(),
  part1Set1Title: "Let's talk about where you live.",
  part1Set1Questions: ["", "", "", ""],
  part1Set2aTitle: "What kind of work do you do?",
  part1Set2aQuestions: ["", "", "", ""],
  part1Set2bTitle: "What subject(s) are you studying?",
  part1Set2bQuestions: ["", "", "", ""],
  part1Topics: Array.from({ length: 12 }, (_, index) => createSpeakingTopic(index)),
  part2Topics: [createSpeakingPart2Topic(0)],
});

function SpeakingTestCard({ test, onDelete, onEdit }) {
  return (
    <article className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              {test.name}
            </h2>
            <div
              className="badge badge-outline"
              style={{ color: getDifficultyTextColor(test.difficulty) }}
            >
              {test.difficulty}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square text-error hover:bg-error/10 hover:text-error"
            aria-label={`Delete ${test.name}`}
            onClick={() => onDelete(test)}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-base-content/65">
          Created: {formatCreatedAt(test.createdAt)}
        </p>

        <div className="card-actions justify-end">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onEdit(test)}
          >
            Edit Test
          </button>
        </div>
      </div>
    </article>
  );
}

function SpeakingQuestionGroup({
  heading,
  titleField,
  questionsField,
  formValues,
  theme,
  onChange,
  titlePlaceholder,
}) {
  return (
    <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
          Part 1 Set
        </p>
        <h3 className="text-xl font-semibold">{heading}</h3>
      </div>

      <div className="space-y-4">
        <label className="form-control">
          <span className="label-text mb-2 font-medium">Set Prompt / Topic</span>
          <input
            type="text"
            className={theme.inputClass}
            placeholder={titlePlaceholder}
            value={formValues[titleField]}
            onChange={(event) => onChange(titleField, event.target.value)}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          {formValues[questionsField].map((question, index) => (
            <label key={`${heading}-question-${index + 1}`} className="form-control">
              <span className="label-text mb-2 font-medium">
                Question {index + 1}
              </span>
              <textarea
                className={`${theme.textareaClass} min-h-28 leading-7`}
                placeholder={`Enter ${heading} question ${index + 1}`}
                value={question}
                onChange={(event) =>
                  onChange(questionsField, event.target.value, index)
                }
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpeakingTestPanel({
  formValues,
  isSaving,
  errorMessage,
  themeMode,
  onAddPart2Topic,
  onClose,
  onChange,
  onRemovePart2Topic,
  onSave,
}) {
  const theme = getSpeakingTheme(themeMode);

  return (
    <section className="w-full max-w-6xl rounded-3xl border border-base-300 bg-base-100 shadow-xl">
      <div className="flex items-center justify-between border-b border-base-300 px-6 py-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
            IELTS Speaking
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Create Speaking Test
          </h2>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-square rounded-xl"
          aria-label="Close speaking test creator"
          onClick={onClose}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-6 px-6 py-6">
        {isSaving ? (
          <div className="rounded-2xl border border-info/30 bg-info/10 px-5 py-4 text-sm font-medium text-info-content">
            Saving speaking test...
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="form-control md:col-span-1">
            <span className="label-text mb-2 font-medium">Test Name</span>
            <input
              type="text"
              className={theme.inputClass}
              placeholder="Enter test name"
              value={formValues.testName}
              onChange={(event) => onChange("testName", event.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-2 font-medium">Test Difficulty</span>
            <select
              className={theme.selectClass}
              style={{
                ...theme.selectStyle,
                color: getDifficultyTextColor(formValues.testDifficulty),
              }}
              value={formValues.testDifficulty}
              onChange={(event) =>
                onChange("testDifficulty", event.target.value)
              }
            >
              {difficultyOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  style={{ color: option.color }}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control">
            <span className="label-text mb-2 font-medium">Date</span>
            <input
              type="text"
              className={theme.inputClass}
              value={formValues.date}
              readOnly
            />
          </label>
        </div>

        <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
                Section 1
              </p>
              <h3 className="text-xl font-semibold">Part 1</h3>
            </div>

            <div
              className="tooltip tooltip-left"
              data-tip="Students will always see Set 1. The system will then randomly choose either Set 2A or Set 2B, and later pick 2 topics out of the 12 topic cards below."
            >
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="How random speaking sets work"
              >
                <InformationCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className={`${theme.accentPanelClass} mb-5 text-sm leading-7 text-base-content/75`}>
            The student mode will use a 2-minute timer for Set 1, a 2-minute timer
            for the randomly chosen Set 2A or Set 2B, and a 5-minute timer for 2
            randomly selected follow-up topics.
          </div>

          <div className="space-y-5">
            <SpeakingQuestionGroup
              heading="Set 1"
              titleField="part1Set1Title"
              questionsField="part1Set1Questions"
              formValues={formValues}
              theme={theme}
              onChange={onChange}
              titlePlaceholder="Let's talk about where you live."
            />

            <div className="grid gap-5 xl:grid-cols-2">
              <SpeakingQuestionGroup
                heading="Set 2A"
                titleField="part1Set2aTitle"
                questionsField="part1Set2aQuestions"
                formValues={formValues}
                theme={theme}
                onChange={onChange}
                titlePlaceholder="What kind of work do you do?"
              />

              <SpeakingQuestionGroup
                heading="Set 2B"
                titleField="part1Set2bTitle"
                questionsField="part1Set2bQuestions"
                formValues={formValues}
                theme={theme}
                onChange={onChange}
                titlePlaceholder="What subject(s) are you studying?"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Section 2
            </p>
            <h3 className="text-xl font-semibold">Part 1 Topic Pool</h3>
          </div>

          <div className="mb-5 text-sm leading-7 text-base-content/70">
            Add 12 topics here. The student mode will randomly choose 2 of them,
            and each topic should include 4 follow-up questions.
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {formValues.part1Topics.map((topic, topicIndex) => (
              <section
                key={topic.id}
                className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm"
              >
                <div className="mb-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
                    Topic {topicIndex + 1}
                  </p>
                  <h4 className="text-lg font-semibold">Follow-up Topic</h4>
                </div>

                <div className="space-y-4">
                  <label className="form-control">
                    <span className="label-text mb-2 font-medium">Topic Title</span>
                    <input
                      type="text"
                      className={theme.inputClass}
                      placeholder={`Enter topic ${topicIndex + 1} title`}
                      value={topic.title}
                      onChange={(event) =>
                        onChange("part1Topics", event.target.value, topicIndex, "title")
                      }
                    />
                  </label>

                  <div className="grid gap-4">
                    {topic.questions.map((question, questionIndex) => (
                      <label
                        key={`${topic.id}-question-${questionIndex + 1}`}
                        className="form-control"
                      >
                        <span className="label-text mb-2 font-medium">
                          Question {questionIndex + 1}
                        </span>
                        <textarea
                          className={`${theme.textareaClass} min-h-24 leading-7`}
                          placeholder={`Enter topic ${topicIndex + 1} question ${
                            questionIndex + 1
                          }`}
                          value={question}
                          onChange={(event) =>
                            onChange(
                              "part1Topics",
                              event.target.value,
                              topicIndex,
                              questionIndex
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
                Section 3
              </p>
              <h3 className="text-xl font-semibold">Part 2 And Part 3 Topic Cards</h3>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={onAddPart2Topic}
            >
              <PlusIcon className="h-5 w-5" />
              Add Topic
            </button>
          </div>

          <div className="mb-5 text-sm leading-7 text-base-content/70">
            Add one or more Part 2 cue cards here. Each cue card also includes its
            own Part 3 follow-up questions.
          </div>

          <div className="space-y-5">
            {formValues.part2Topics.map((topic, topicIndex) => (
              <section
                key={topic.id}
                className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
                      Cue Card {topicIndex + 1}
                    </p>
                    <h4 className="text-lg font-semibold">Part 2 Topic</h4>
                  </div>

                  {formValues.part2Topics.length > 1 ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-square text-error hover:bg-error/10 hover:text-error"
                      aria-label={`Remove Part 2 topic ${topicIndex + 1}`}
                      onClick={() => onRemovePart2Topic(topicIndex)}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>

                <div className="space-y-5">
                  <label className="form-control">
                    <span className="label-text mb-2 font-medium">Topic</span>
                    <input
                      type="text"
                      className={theme.inputClass}
                      placeholder="Describe a band or singer who you like."
                      value={topic.topicTitle}
                      onChange={(event) =>
                        onChange(
                          "part2Topics",
                          event.target.value,
                          topicIndex,
                          "topicTitle"
                        )
                      }
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-2 font-medium">
                      Cue Card / On-screen Instructions
                    </span>
                    <textarea
                      className={`${theme.textareaClass} min-h-56 leading-7`}
                      placeholder={
                        "Describe a band or singer who you like.\n\nYou should say:\nwhat style of songs they sing / music they play\nwhen you listen to them\nwhere you listen to them\nand explain why you like this band or singer."
                      }
                      value={topic.cueCard}
                      onChange={(event) =>
                        onChange(
                          "part2Topics",
                          event.target.value,
                          topicIndex,
                          "cueCard"
                        )
                      }
                    />
                    <span className="label-text-alt mt-2 text-base-content/60">
                      Line breaks are preserved on the student screen.
                    </span>
                  </label>

                  <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
                    <div className="mb-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
                        Part 3
                      </p>
                      <h5 className="text-lg font-semibold">Follow-up Questions</h5>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {topic.followUpQuestions.map((question, questionIndex) => (
                        <label
                          key={`${topic.id}-follow-up-${questionIndex + 1}`}
                          className="form-control"
                        >
                          <span className="label-text mb-2 font-medium">
                            Follow-up Question {questionIndex + 1}
                          </span>
                          <textarea
                            className={`${theme.textareaClass} min-h-24 leading-7`}
                            placeholder={`Enter follow-up question ${
                              questionIndex + 1
                            }`}
                            value={question}
                            onChange={(event) =>
                              onChange(
                                "part2Topics",
                                event.target.value,
                                topicIndex,
                                questionIndex
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-3 border-t border-base-300 px-6 py-5">
        {errorMessage ? (
          <p className="mr-auto self-center text-sm font-medium text-error">
            {errorMessage}
          </p>
        ) : null}
        <button
          type="button"
          className={theme.closeButtonClass}
          onClick={onClose}
        >
          Close
        </button>
        <CreatorActionButton onClick={onSave}>
          {isSaving ? "Saving..." : "Save Test"}
        </CreatorActionButton>
      </div>
    </section>
  );
}

const SpeakingTestCreator = forwardRef(function SpeakingTestCreator(
  { themeMode = "dark" },
  ref
) {
  const [isSpeakingTestComposerOpen, setIsSpeakingTestComposerOpen] = useState(false);
  const [speakingTests, setSpeakingTests] = useState([]);
  const [isSpeakingTestsLoading, setIsSpeakingTestsLoading] = useState(true);
  const [isSavingSpeakingTest, setIsSavingSpeakingTest] = useState(false);
  const [isDeletingSpeakingTest, setIsDeletingSpeakingTest] = useState(false);
  const [speakingTestError, setSpeakingTestError] = useState("");
  const [speakingTestNotice, setSpeakingTestNotice] = useState("");
  const [editingSpeakingTestId, setEditingSpeakingTestId] = useState("");
  const [speakingTestForm, setSpeakingTestForm] = useState(initialSpeakingTestForm);

  useImperativeHandle(ref, () => ({
    openCreateNew() {
      setSpeakingTestError("");
      setSpeakingTestNotice("");
      setEditingSpeakingTestId("");
      setSpeakingTestForm(initialSpeakingTestForm());
      setIsSpeakingTestComposerOpen(true);
    },
  }), []);

  useEffect(() => {
    if (!speakingTestNotice) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setSpeakingTestNotice("");
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [speakingTestNotice]);

  useEffect(() => {
    async function loadSpeakingTests() {
      try {
        setIsSpeakingTestsLoading(true);
        setSpeakingTests(await listSpeakingTests());
      } catch (error) {
        console.error("[Creator] Failed to load speaking tests:", error);
      } finally {
        setIsSpeakingTestsLoading(false);
      }
    }

    loadSpeakingTests();
  }, []);

  function handleSpeakingTestChange(field, value, index = -1, nestedKey = "") {
    setSpeakingTestForm((currentForm) => {
      if (field === "part1Set1Questions" || field === "part1Set2aQuestions" || field === "part1Set2bQuestions") {
        const nextQuestions = [...currentForm[field]];
        nextQuestions[index] = value;

        return {
          ...currentForm,
          [field]: nextQuestions,
        };
      }

      if (field === "part1Topics") {
        const nextTopics = currentForm.part1Topics.map((topic) => ({
          ...topic,
          questions: [...topic.questions],
        }));

        if (nestedKey === "title") {
          nextTopics[index].title = value;
        } else if (typeof nestedKey === "number") {
          nextTopics[index].questions[nestedKey] = value;
        }

        return {
          ...currentForm,
          part1Topics: nextTopics,
        };
      }

      if (field === "part2Topics") {
        const nextTopics = currentForm.part2Topics.map((topic) => ({
          ...topic,
          followUpQuestions: [...topic.followUpQuestions],
        }));

        if (nestedKey === "topicTitle" || nestedKey === "cueCard") {
          nextTopics[index][nestedKey] = value;
        } else if (typeof nestedKey === "number") {
          nextTopics[index].followUpQuestions[nestedKey] = value;
        }

        return {
          ...currentForm,
          part2Topics: nextTopics,
        };
      }

      return {
        ...currentForm,
        [field]: value,
      };
    });
  }

  function handleAddPart2Topic() {
    setSpeakingTestForm((currentForm) => ({
      ...currentForm,
      part2Topics: [
        ...currentForm.part2Topics,
        createSpeakingPart2Topic(currentForm.part2Topics.length),
      ],
    }));
  }

  function handleRemovePart2Topic(topicIndex) {
    setSpeakingTestForm((currentForm) => {
      if (currentForm.part2Topics.length <= 1) {
        return currentForm;
      }

      return {
        ...currentForm,
        part2Topics: currentForm.part2Topics.filter((_, index) => index !== topicIndex),
      };
    });
  }

  function handleCloseSpeakingTestComposer() {
    if (isSavingSpeakingTest) {
      return;
    }

    setIsSpeakingTestComposerOpen(false);
    setSpeakingTestError("");
    setSpeakingTestNotice("");
    setEditingSpeakingTestId("");
  }

  function handleEditSpeakingTest(test) {
    const matchingDifficulty =
      difficultyOptions.find(
        (option) => option.label.toLowerCase() === String(test.difficulty).toLowerCase()
      )?.value || "medium";

    setSpeakingTestError("");
    setSpeakingTestNotice("");
    setEditingSpeakingTestId(test.id);
    setSpeakingTestForm({
      testName: test.name || "",
      testDifficulty: matchingDifficulty,
      date: test.date || getTodayDate(),
      part1Set1Title: test.part1Set1Title || "",
      part1Set1Questions: normalizeQuestionSlots(test.part1Set1Questions, 4),
      part1Set2aTitle: test.part1Set2aTitle || "",
      part1Set2aQuestions: normalizeQuestionSlots(test.part1Set2aQuestions, 4),
      part1Set2bTitle: test.part1Set2bTitle || "",
      part1Set2bQuestions: normalizeQuestionSlots(test.part1Set2bQuestions, 4),
      part1Topics: normalizeTopics(test.part1Topics),
      part2Topics: normalizePart2Topics(test.part2Topics),
    });
    setIsSpeakingTestComposerOpen(true);
  }

  function getFirstIncompleteTopic(topics) {
    return topics.findIndex(
      (topic) =>
        !topic.title.trim() || topic.questions.some((question) => !question.trim())
    );
  }

  function getFirstIncompletePart2Topic(topics) {
    return topics.findIndex(
      (topic) =>
        !topic.topicTitle.trim() ||
        !topic.cueCard.trim() ||
        topic.followUpQuestions.some((question) => !question.trim())
    );
  }

  async function handleSaveSpeakingTest() {
    if (isSavingSpeakingTest) {
      return;
    }

    if (!speakingTestForm.testName.trim()) {
      setSpeakingTestError("Test name is required.");
      return;
    }

    if (!speakingTestForm.part1Set1Title.trim()) {
      setSpeakingTestError("Set 1 prompt is required.");
      return;
    }

    if (speakingTestForm.part1Set1Questions.some((question) => !question.trim())) {
      setSpeakingTestError("All 4 Set 1 questions are required.");
      return;
    }

    if (!speakingTestForm.part1Set2aTitle.trim()) {
      setSpeakingTestError("Set 2A prompt is required.");
      return;
    }

    if (speakingTestForm.part1Set2aQuestions.some((question) => !question.trim())) {
      setSpeakingTestError("All 4 Set 2A questions are required.");
      return;
    }

    if (!speakingTestForm.part1Set2bTitle.trim()) {
      setSpeakingTestError("Set 2B prompt is required.");
      return;
    }

    if (speakingTestForm.part1Set2bQuestions.some((question) => !question.trim())) {
      setSpeakingTestError("All 4 Set 2B questions are required.");
      return;
    }

    const incompleteTopicIndex = getFirstIncompleteTopic(speakingTestForm.part1Topics);
    if (incompleteTopicIndex !== -1) {
      setSpeakingTestError(
        `Topic ${incompleteTopicIndex + 1} needs a title and all 4 questions.`
      );
      return;
    }

    const incompletePart2TopicIndex = getFirstIncompletePart2Topic(
      speakingTestForm.part2Topics
    );
    if (incompletePart2TopicIndex !== -1) {
      setSpeakingTestError(
        `Part 2 topic ${incompletePart2TopicIndex + 1} needs a title, cue card, and all 4 Part 3 follow-up questions.`
      );
      return;
    }

    try {
      setIsSavingSpeakingTest(true);
      setSpeakingTestError("");
      setSpeakingTestNotice("");

      const difficultyLabel =
        difficultyOptions.find(
          (option) => option.value === speakingTestForm.testDifficulty
        )?.label || "Medium";

      const { notice, savedTest } = await withTimeout(
        saveSpeakingTest({
          editingTestId: editingSpeakingTestId,
          formValues: speakingTestForm,
          difficultyLabel,
        }),
        45000,
        "Saving the speaking test took too long. Please try again."
      );

      setSpeakingTests((currentTests) => [
        savedTest,
        ...currentTests.filter((test) => test.id !== savedTest.id),
      ]);
      setSpeakingTestNotice(notice === "Test saved." ? "" : notice);
      setIsSpeakingTestComposerOpen(false);
      setEditingSpeakingTestId("");
    } catch (error) {
      console.error("[Creator] Failed to save speaking test:", error);
      setSpeakingTestError(error?.message || "Failed to save speaking test.");
    } finally {
      setIsSavingSpeakingTest(false);
    }
  }

  async function handleDeleteSpeakingTest(test) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this test?"
    );

    if (!shouldDelete || isDeletingSpeakingTest) {
      return;
    }

    try {
      setIsDeletingSpeakingTest(true);
      setSpeakingTestError("");
      setSpeakingTestNotice("");
      setSpeakingTests((currentTests) =>
        currentTests.filter((currentTest) => currentTest.id !== test.id)
      );

      if (editingSpeakingTestId === test.id) {
        handleCloseSpeakingTestComposer();
      }

      await withTimeout(
        deleteSpeakingTest(test),
        30000,
        "Deleting the speaking test took too long. Please try again."
      );

      setSpeakingTestNotice("Test deleted.");
    } catch (error) {
      console.error("[Creator] Failed to delete speaking test:", error);
      setSpeakingTests((currentTests) => {
        const testStillMissing = !currentTests.some(
          (currentTest) => currentTest.id === test.id
        );

        if (!testStillMissing) {
          return currentTests;
        }

        const restoredTests = [...currentTests, test];
        return restoredTests.sort((left, right) => {
          const leftTime = new Date(left.createdAt).getTime();
          const rightTime = new Date(right.createdAt).getTime();

          return (Number.isNaN(rightTime) ? 0 : rightTime) -
            (Number.isNaN(leftTime) ? 0 : leftTime);
        });
      });
      setSpeakingTestError(error?.message || "Failed to delete speaking test.");
    } finally {
      setIsDeletingSpeakingTest(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-start gap-6">
      {isSpeakingTestComposerOpen ? (
        <SpeakingTestPanel
          formValues={speakingTestForm}
          isSaving={isSavingSpeakingTest}
          errorMessage={speakingTestError}
          themeMode={themeMode}
          onAddPart2Topic={handleAddPart2Topic}
          onClose={handleCloseSpeakingTestComposer}
          onChange={handleSpeakingTestChange}
          onRemovePart2Topic={handleRemovePart2Topic}
          onSave={handleSaveSpeakingTest}
        />
      ) : (
        <>
          {speakingTestNotice ? (
            <div className="w-full max-w-6xl rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm font-medium text-warning-content">
              {speakingTestNotice}
            </div>
          ) : null}

          {speakingTests.length > 0 ? (
            <div className="grid w-full max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-3">
              {speakingTests.map((test) => (
                <SpeakingTestCard
                  key={test.id}
                  test={test}
                  onDelete={handleDeleteSpeakingTest}
                  onEdit={handleEditSpeakingTest}
                />
              ))}
            </div>
          ) : isSpeakingTestsLoading ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
              <p className="text-lg font-medium text-base-content/65">
                Loading speaking tests...
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
              <p className="text-lg font-medium text-base-content/65">
                No speaking tests yet.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default SpeakingTestCreator;

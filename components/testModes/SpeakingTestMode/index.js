"use client";

import { useEffect, useState } from "react";
import {
  ArrowPathIcon,
  ClockIcon,
  InformationCircleIcon,
  PlayIcon,
  StopIcon,
} from "@heroicons/react/24/outline";

function formatTimer(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const seconds = String(safeSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function normalizeQuestionList(questions = []) {
  return (Array.isArray(questions) ? questions : [])
    .map((question) => String(question || "").trim())
    .filter(Boolean);
}

function shuffleList(items = []) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ];
  }

  return nextItems;
}

function getSpeakingData(testData) {
  const part1 = testData?.part1 || {};
  const part2 = testData?.part2 || {};
  const set1 = part1.set1 || {};
  const set2a = part1.set2a || {};
  const set2b = part1.set2b || {};
  const part2Topics = Array.isArray(part2.topics)
    ? part2.topics
    : Array.isArray(testData?.part2Topics)
      ? testData.part2Topics
      : [];
  const normalizedPart2Topics = part2Topics
    .map((topic, index) => ({
      id: topic?.id || `part2-topic-${index + 1}`,
      topicTitle: String(topic?.topicTitle || topic?.title || "").trim(),
      cueCard: String(topic?.cueCard || "").trim(),
      followUpQuestions: normalizeQuestionList(topic?.followUpQuestions),
    }))
    .filter(
      (topic) =>
        topic.topicTitle || topic.cueCard || topic.followUpQuestions.length > 0
    );
  const fallbackPart2Topic = {
    id: "part2-topic-1",
    topicTitle: String(part2.topicTitle || testData?.part2TopicTitle || "").trim(),
    cueCard: String(part2.cueCard || testData?.part2CueCard || "").trim(),
    followUpQuestions: normalizeQuestionList(
      part2.followUpQuestions || testData?.part3Questions
    ),
  };
  const resolvedPart2Topics =
    normalizedPart2Topics.length > 0 ? normalizedPart2Topics : [fallbackPart2Topic];

  return {
    name: testData?.name || "Speaking Test",
    part1: {
      setDurationSeconds:
        Number(part1.setDurationSeconds) > 0
          ? Number(part1.setDurationSeconds)
          : 120,
      followUpDurationSeconds:
        Number(part1.followUpDurationSeconds) > 0
          ? Number(part1.followUpDurationSeconds)
          : 300,
      randomTopicCount:
        Number(part1.randomTopicCount) > 0
          ? Number(part1.randomTopicCount)
          : 2,
      set1: {
        label: "Set 1",
        title: String(set1.title || testData?.part1Set1Title || "").trim(),
        questions: normalizeQuestionList(
          set1.questions || testData?.part1Set1Questions
        ),
      },
      set2a: {
        key: "set2a",
        label: "Set 2A",
        title: String(set2a.title || testData?.part1Set2aTitle || "").trim(),
        questions: normalizeQuestionList(
          set2a.questions || testData?.part1Set2aQuestions
        ),
      },
      set2b: {
        key: "set2b",
        label: "Set 2B",
        title: String(set2b.title || testData?.part1Set2bTitle || "").trim(),
        questions: normalizeQuestionList(
          set2b.questions || testData?.part1Set2bQuestions
        ),
      },
      topics: (Array.isArray(part1.topics) ? part1.topics : testData?.part1Topics || [])
        .map((topic, index) => ({
          id: topic?.id || `topic-${index + 1}`,
          title: String(topic?.title || "").trim(),
          questions: normalizeQuestionList(topic?.questions),
        }))
        .filter((topic) => topic.title || topic.questions.length > 0),
    },
    part2: {
      topicTitle: resolvedPart2Topics[0]?.topicTitle || "",
      cueCard: resolvedPart2Topics[0]?.cueCard || "",
      followUpQuestions: resolvedPart2Topics[0]?.followUpQuestions || [],
      topics: resolvedPart2Topics,
      preparationSeconds:
        Number(part2.preparationSeconds) > 0
          ? Number(part2.preparationSeconds)
          : 60,
      speakingSeconds:
        Number(part2.speakingSeconds) > 0
          ? Number(part2.speakingSeconds)
          : 120,
    },
  };
}

function useCountdown(initialSeconds, onComplete) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    setIsRunning(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    if (secondsLeft <= 0) {
      setIsRunning(false);

      if (typeof onComplete === "function") {
        onComplete();
      }

      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setSecondsLeft((currentSeconds) => Math.max(0, currentSeconds - 1));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [isRunning, onComplete, secondsLeft]);

  return {
    secondsLeft,
    isRunning,
    start() {
      setIsRunning(true);
    },
    stop() {
      setIsRunning(false);
    },
    reset(nextSeconds = initialSeconds) {
      setIsRunning(false);
      setSecondsLeft(nextSeconds);
    },
  };
}

function SectionTimer({
  label,
  secondsLeft,
  isRunning,
  onStart,
  onStop,
  onReset,
  helperText,
}) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
            {label}
          </p>
          <div className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ClockIcon className="h-6 w-6 text-primary" />
            <span>{formatTimer(secondsLeft)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={onStart}>
            <PlayIcon className="h-4 w-4" />
            {isRunning ? "Running" : "Start"}
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={onStop}>
            <StopIcon className="h-4 w-4" />
            Stop
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
            <ArrowPathIcon className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      {helperText ? (
        <p className="mt-3 text-sm leading-6 text-base-content/70">{helperText}</p>
      ) : null}
    </div>
  );
}

function FlashQuestion({
  sectionLabel,
  promptTitle,
  question,
  footerText = "",
}) {
  return (
    <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-base-100 to-base-100 p-6 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
        {sectionLabel}
      </p>
      {promptTitle ? (
        <h3 className="mt-3 text-lg font-semibold tracking-tight">{promptTitle}</h3>
      ) : null}
      <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <p className="animate-pulse text-3xl font-semibold leading-relaxed tracking-tight text-base-content">
          {question || "Choose a question to display here."}
        </p>
      </div>
      {footerText ? (
        <p className="mt-4 text-sm leading-6 text-base-content/65">{footerText}</p>
      ) : null}
    </div>
  );
}

function QuestionSelector({
  questions,
  activeIndex,
  onSelect,
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {questions.map((question, index) => (
        <button
          key={`question-${index + 1}`}
          type="button"
          className={`rounded-2xl border px-4 py-3 text-left transition ${
            activeIndex === index
              ? "border-primary bg-primary/10 text-base-content shadow-sm"
              : "border-base-300 bg-base-100 text-base-content/75 hover:border-primary/40 hover:bg-base-200"
          }`}
          onClick={() => onSelect(index)}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/45">
            Question {index + 1}
          </p>
          <p className="mt-2 text-sm leading-6">{question}</p>
        </button>
      ))}
    </div>
  );
}

export default function SpeakingTestMode({ testData }) {
  const speakingData = getSpeakingData(testData);
  const { part1, part2 } = speakingData;
  const [selectedSetKey, setSelectedSetKey] = useState("set2a");
  const [selectedSetNote, setSelectedSetNote] = useState("Set 2A");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [activeSet1QuestionIndex, setActiveSet1QuestionIndex] = useState(0);
  const [activeSet2QuestionIndex, setActiveSet2QuestionIndex] = useState(0);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [activeTopicQuestionIndex, setActiveTopicQuestionIndex] = useState(0);
  const [selectedPart2TopicIndex, setSelectedPart2TopicIndex] = useState(0);
  const [activePart3QuestionIndex, setActivePart3QuestionIndex] = useState(0);
  const [part2Phase, setPart2Phase] = useState("idle");

  const set1Timer = useCountdown(part1.setDurationSeconds);
  const set2Timer = useCountdown(part1.setDurationSeconds);
  const topicsTimer = useCountdown(part1.followUpDurationSeconds);
  const part2PrepTimer = useCountdown(part2.preparationSeconds, () => {
    setPart2Phase("speaking");
  });
  const part2SpeakingTimer = useCountdown(part2.speakingSeconds, () => {
    setPart2Phase("done");
  });

  useEffect(() => {
    const randomSet = Math.random() < 0.5 ? "set2a" : "set2b";
    const randomTopics = shuffleList(part1.topics).slice(
      0,
      Math.min(part1.randomTopicCount, part1.topics.length)
    );

    setSelectedSetKey(randomSet);
    setSelectedSetNote(randomSet === "set2a" ? "Set 2A" : "Set 2B");
    setSelectedTopics(randomTopics);
    setActiveSet1QuestionIndex(0);
    setActiveSet2QuestionIndex(0);
    setActiveTopicIndex(0);
    setActiveTopicQuestionIndex(0);
    setSelectedPart2TopicIndex(
      part2.topics.length > 1 ? Math.floor(Math.random() * part2.topics.length) : 0
    );
    setActivePart3QuestionIndex(0);
    setPart2Phase("idle");
  }, [testData]);

  useEffect(() => {
    if (part2Phase === "speaking" && !part2SpeakingTimer.isRunning) {
      part2PrepTimer.stop();
      part2SpeakingTimer.start();
      return;
    }

    if (part2Phase === "done") {
      part2SpeakingTimer.stop();
    }
  }, [part2Phase, part2SpeakingTimer.isRunning]);

  const selectedSet = selectedSetKey === "set2b" ? part1.set2b : part1.set2a;
  const activeTopic = selectedTopics[activeTopicIndex] || null;
  const activeTopicQuestions = activeTopic?.questions || [];
  const activeTopicQuestion =
    activeTopicQuestions[activeTopicQuestionIndex] || activeTopicQuestions[0] || "";
  const selectedPart2Topic =
    part2.topics[selectedPart2TopicIndex] || part2.topics[0] || null;
  const activePart3Questions = selectedPart2Topic?.followUpQuestions || [];
  const activePart3Question =
    activePart3Questions[activePart3QuestionIndex] ||
    activePart3Questions[0] ||
    "";

  function rerollPart1Selection() {
    const randomSet = Math.random() < 0.5 ? "set2a" : "set2b";
    const randomTopics = shuffleList(part1.topics).slice(
      0,
      Math.min(part1.randomTopicCount, part1.topics.length)
    );

    setSelectedSetKey(randomSet);
    setSelectedSetNote(randomSet === "set2a" ? "Set 2A" : "Set 2B");
    setSelectedTopics(randomTopics);
    setActiveSet2QuestionIndex(0);
    setActiveTopicIndex(0);
    setActiveTopicQuestionIndex(0);
    set1Timer.reset(part1.setDurationSeconds);
    set2Timer.reset(part1.setDurationSeconds);
    topicsTimer.reset(part1.followUpDurationSeconds);
  }

  function resetPart2Flow() {
    setPart2Phase("idle");
    part2PrepTimer.reset(part2.preparationSeconds);
    part2SpeakingTimer.reset(part2.speakingSeconds);
  }

  function startPart2Preparation() {
    setPart2Phase("prep");
    part2SpeakingTimer.reset(part2.speakingSeconds);
    part2PrepTimer.reset(part2.preparationSeconds);
    part2PrepTimer.start();
  }

  function rerollPart2Topic() {
    if (part2.topics.length === 0) {
      return;
    }

    const randomTopicIndex = Math.floor(Math.random() * part2.topics.length);
    setSelectedPart2TopicIndex(randomTopicIndex);
    setActivePart3QuestionIndex(0);
    resetPart2Flow();
  }

  return (
    <main className="min-h-screen bg-base-200 px-4 py-6 text-base-content md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
                Speaking Test
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {speakingData.name}
              </h1>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={rerollPart1Selection}
            >
              <ArrowPathIcon className="h-5 w-5" />
              Reroll Random Part 1
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
                Part 1
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Personal Questions
              </h2>
            </div>

            <div className="flex max-w-md items-start gap-3 rounded-2xl border border-base-300 bg-base-200/70 px-4 py-3">
              <InformationCircleIcon
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                title="The system randomly chooses Set 2A or Set 2B for this student. You can edit the field if you want to record or override the examiner's chosen set label."
              />
              <div className="w-full">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/45">
                  Selected Set Note
                </label>
                <input
                  type="text"
                  className="input input-bordered mt-2 w-full"
                  value={selectedSetNote}
                  onChange={(event) => setSelectedSetNote(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <SectionTimer
                label="Set 1 Timer"
                secondsLeft={set1Timer.secondsLeft}
                isRunning={set1Timer.isRunning}
                onStart={set1Timer.start}
                onStop={set1Timer.stop}
                onReset={() => set1Timer.reset(part1.setDurationSeconds)}
                helperText="The student has 2 minutes for Set 1. Pick any of the 4 questions below to flash on screen."
              />

              <FlashQuestion
                sectionLabel="Set 1"
                promptTitle={part1.set1.title}
                question={
                  part1.set1.questions[activeSet1QuestionIndex] ||
                  part1.set1.questions[0] ||
                  ""
                }
              />

              <QuestionSelector
                questions={part1.set1.questions}
                activeIndex={activeSet1QuestionIndex}
                onSelect={setActiveSet1QuestionIndex}
              />
            </div>

            <div className="space-y-4">
              <SectionTimer
                label={`${selectedSet.label} Timer`}
                secondsLeft={set2Timer.secondsLeft}
                isRunning={set2Timer.isRunning}
                onStart={set2Timer.start}
                onStop={set2Timer.stop}
                onReset={() => set2Timer.reset(part1.setDurationSeconds)}
                helperText="This set is randomly chosen. The 2-minute timer matches the real speaking warm-up flow."
              />

              <FlashQuestion
                sectionLabel={selectedSet.label}
                promptTitle={selectedSet.title}
                question={
                  selectedSet.questions[activeSet2QuestionIndex] ||
                  selectedSet.questions[0] ||
                  ""
                }
              />

              <QuestionSelector
                questions={selectedSet.questions}
                activeIndex={activeSet2QuestionIndex}
                onSelect={setActiveSet2QuestionIndex}
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <SectionTimer
              label="Random Topic Round Timer"
              secondsLeft={topicsTimer.secondsLeft}
              isRunning={topicsTimer.isRunning}
              onStart={topicsTimer.start}
              onStop={topicsTimer.stop}
              onReset={() => topicsTimer.reset(part1.followUpDurationSeconds)}
              helperText={
                topicsTimer.secondsLeft === 0
                  ? "Time is up. Say 'thank you' and move on to Part 2."
                  : "The system randomly picked 2 topics from the 12-topic pool. Keep this round within 5 minutes total."
              }
            />

            <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
              <div className="space-y-3 rounded-3xl border border-base-300 bg-base-100 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
                  Selected Topics
                </p>
                {selectedTopics.map((topic, index) => (
                  <button
                    key={topic.id}
                    type="button"
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      activeTopicIndex === index
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-base-300 bg-base-100 hover:border-primary/40 hover:bg-base-200"
                    }`}
                    onClick={() => {
                      setActiveTopicIndex(index);
                      setActiveTopicQuestionIndex(0);
                    }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/45">
                      Topic {index + 1}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6">
                      {topic.title || `Topic ${index + 1}`}
                    </p>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <FlashQuestion
                  sectionLabel="Part 1 Topic Round"
                  promptTitle={activeTopic?.title || "Random topic"}
                  question={activeTopicQuestion}
                  footerText="If the 5-minute timer ends before every question is asked, stop the candidate and continue to Part 2."
                />

                <QuestionSelector
                  questions={activeTopicQuestions}
                  activeIndex={activeTopicQuestionIndex}
                  onSelect={setActiveTopicQuestionIndex}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
                Part 2
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Long Turn Cue Card
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={startPart2Preparation}
              >
                <PlayIcon className="h-5 w-5" />
                Start Preparation
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={resetPart2Flow}
              >
                <ArrowPathIcon className="h-5 w-5" />
                Reset Part 2
              </button>
              {part2.topics.length > 1 ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={rerollPart2Topic}
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Reroll Topic
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-4">
              {part2.topics.length > 1 ? (
                <div className="rounded-3xl border border-base-300 bg-base-100 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
                    Available Part 2 Topics
                  </p>
                  <div className="mt-3 grid gap-2">
                    {part2.topics.map((topic, index) => (
                      <button
                        key={topic.id}
                        type="button"
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          selectedPart2TopicIndex === index
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-base-300 bg-base-100 hover:border-primary/40 hover:bg-base-200"
                        }`}
                        onClick={() => {
                          setSelectedPart2TopicIndex(index);
                          setActivePart3QuestionIndex(0);
                          resetPart2Flow();
                        }}
                      >
                        <p className="text-sm font-medium leading-6">
                          {topic.topicTitle || `Topic ${index + 1}`}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
                  Examiner Script
                </p>
                <div className="mt-4 space-y-4 text-base leading-8 text-base-content/75">
                  <p>
                    Now I’m going to give you a topic and I’d like you to talk about it
                    for one to two minutes. Before you talk, you will have one minute to
                    think about what you are going to say. You can make some notes if you
                    wish. Do you understand?
                  </p>
                  <p>
                    Here is paper and a pencil for making some notes, and here is your
                    topic.
                  </p>
                  <p>
                    Alright? Remember, you have one to two minutes for this, so please
                    don’t worry if I stop you. I’ll tell you when the time is up. Can you
                    start speaking now, please?
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-base-100 to-base-100 p-6 shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                  Cue Card
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                  {selectedPart2Topic?.topicTitle || part2.topicTitle || "Part 2 topic"}
                </h3>
                <div className="mt-5 whitespace-pre-wrap rounded-2xl border border-primary/20 bg-primary/5 p-6 text-lg leading-8 text-base-content">
                  {selectedPart2Topic?.cueCard ||
                    part2.cueCard ||
                    "The Part 2 cue card will appear here."}
                </div>
              </div>

              <div className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
                  Part 3
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                  Follow-up Questions
                </h3>
                <p className="mt-3 text-sm leading-6 text-base-content/70">
                  These follow-up questions belong to the currently selected Part 2 topic.
                </p>

                <div className="mt-5 space-y-4">
                  <FlashQuestion
                    sectionLabel="Part 3"
                    promptTitle={selectedPart2Topic?.topicTitle || "Follow-up topic"}
                    question={activePart3Question}
                  />

                  <QuestionSelector
                    questions={activePart3Questions}
                    activeIndex={activePart3QuestionIndex}
                    onSelect={setActivePart3QuestionIndex}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
                  Current Phase
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                  {part2Phase === "idle"
                    ? "Ready"
                    : part2Phase === "prep"
                      ? "Preparation"
                      : part2Phase === "speaking"
                        ? "Speaking"
                        : "Finished"}
                </h3>
                <p className="mt-3 text-sm leading-6 text-base-content/70">
                  {part2Phase === "prep"
                    ? "The 60-second planning time is running."
                    : part2Phase === "speaking"
                      ? "The 1 to 2 minute speaking timer is running."
                      : part2Phase === "done"
                        ? "Time is up. You can stop the candidate now."
                        : "Start Part 2 when you are ready to hand over the cue card."}
                </p>
              </div>

              <SectionTimer
                label="Preparation Timer"
                secondsLeft={part2PrepTimer.secondsLeft}
                isRunning={part2PrepTimer.isRunning}
                onStart={startPart2Preparation}
                onStop={part2PrepTimer.stop}
                onReset={() => {
                  setPart2Phase("idle");
                  part2PrepTimer.reset(part2.preparationSeconds);
                }}
                helperText="This is the 60-second note-making period before the candidate starts speaking."
              />

              <SectionTimer
                label="Speaking Timer"
                secondsLeft={part2SpeakingTimer.secondsLeft}
                isRunning={part2SpeakingTimer.isRunning}
                onStart={() => {
                  setPart2Phase("speaking");
                  part2PrepTimer.stop();
                  part2SpeakingTimer.start();
                }}
                onStop={part2SpeakingTimer.stop}
                onReset={() => {
                  setPart2Phase("idle");
                  part2SpeakingTimer.reset(part2.speakingSeconds);
                }}
                helperText="Use this once the preparation minute ends and the candidate begins the long turn."
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

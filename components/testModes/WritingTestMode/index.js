"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../lib/firebase/auth-context";
import { recordStudentResult } from "../../../lib/tests/student-tests";

function countWords(text = "") {
  const trimmed = String(text).trim();

  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function normalizeWritingSections(testData) {
  if (Array.isArray(testData?.sections) && testData.sections.length > 0) {
    return testData.sections.map((section, index) => ({
      id: section.id || `task-${index + 1}`,
      label: section.label || `Writing Task ${index + 1}`,
      prompt: section.prompt || "",
      imageUrl: section.imageUrl || "",
      minimumWords: Number(section.minimumWords) || 0,
      recommendedMinutes: Number(section.recommendedMinutes) || 0,
    }));
  }

  return [
    {
      id: "task-1",
      label: "Writing Task 1",
      prompt: testData?.task1 || "",
      imageUrl: testData?.task1ImageUrl || "",
      minimumWords: 150,
      recommendedMinutes: 20,
    },
    {
      id: "task-2",
      label: "Writing Task 2",
      prompt: testData?.task2 || "",
      imageUrl: "",
      minimumWords: 250,
      recommendedMinutes: 40,
    },
  ];
}

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function WritingTaskButton({ isActive, label, meta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        isActive
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-base-300 bg-base-100 text-base-content hover:border-base-content/20 hover:bg-base-100"
      }`}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-65">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 opacity-75">{meta}</p>
    </button>
  );
}

function WritingSectionSwitcher({ sections, activeSectionId, onSelectSection }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sections.map((section, index) => (
        <WritingTaskButton
          key={section.id}
          isActive={section.id === activeSectionId}
          label={`Section ${index + 1}`}
          meta={`${section.label} - At least ${section.minimumWords || 0} words${
            section.recommendedMinutes
              ? ` - About ${section.recommendedMinutes} minutes`
              : ""
          }`}
          onClick={() => onSelectSection(section.id)}
        />
      ))}
    </div>
  );
}

export default function WritingTestMode({ testData }) {
  const router = useRouter();
  const { user } = useAuth();
  const sections = useMemo(() => normalizeWritingSections(testData), [testData]);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || "task-1");
  const [responses, setResponses] = useState(() =>
    sections.reduce((nextResponses, section) => {
      nextResponses[section.id] = "";
      return nextResponses;
    }, {})
  );
  const [timeRemaining, setTimeRemaining] = useState(60 * 60);
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const [isFlaggedForCheating, setIsFlaggedForCheating] = useState(false);
  const [isSavingFlag, setIsSavingFlag] = useState(false);
  const hasRecordedFlagRef = useRef(false);
  const pendingAlertMessageRef = useRef("");

  const activeSection =
    sections.find((section) => section.id === activeSectionId) || sections[0] || null;

  useEffect(() => {
    setResponses((currentResponses) =>
      sections.reduce((nextResponses, section) => {
        nextResponses[section.id] = currentResponses[section.id] || "";
        return nextResponses;
      }, {})
    );

    if (!sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0]?.id || "task-1");
    }
  }, [activeSectionId, sections]);

  useEffect(() => {
    if (!hasStarted || hasShownWarning || typeof window === "undefined") {
      return;
    }

    window.alert(
      "Warning: if you leave this writing test screen, switch tabs, or move to another app, your attempt will be flagged as cheating and counted as a non-complete attempt with a band score of 0."
    );
    setHasShownWarning(true);
  }, [hasShownWarning, hasStarted]);

  useEffect(() => {
    if (!hasStarted || isFlaggedForCheating) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setTimeRemaining((currentTime) => (currentTime > 0 ? currentTime - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [hasStarted, isFlaggedForCheating]);

  useEffect(() => {
    if (!hasStarted || typeof window === "undefined") {
      return undefined;
    }

    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
      return "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted || typeof document === "undefined" || typeof window === "undefined") {
      return undefined;
    }

    async function flagAttempt(reason) {
      if (hasRecordedFlagRef.current) {
        return;
      }

      hasRecordedFlagRef.current = true;
      setIsFlaggedForCheating(true);
      setIsSavingFlag(true);

      try {
        if (user?.uid && testData?.id) {
          await recordStudentResult({
            userId: user.uid,
            testId: testData.id,
            testType: "writing",
            testName: testData.name || "Writing Test",
            bandScore: 0,
            status: "flagged_cheating",
            metadata: {
              outcome: "non_complete",
              flagReason: reason,
            },
          });
        }
      } catch (error) {
        console.error("[Writing Test] Failed to record cheating flag:", error);
      } finally {
        pendingAlertMessageRef.current =
          "You have been flagged as cheating. This writing test has been counted as a non-complete attempt with a band score of 0.";
        setIsSavingFlag(false);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        void flagAttempt("visibility_hidden");
      }
    }

    function handleWindowBlur() {
      void flagAttempt("window_blur");
    }

    function handleWindowFocus() {
      if (!pendingAlertMessageRef.current) {
        return;
      }

      window.alert(pendingAlertMessageRef.current);
      pendingAlertMessageRef.current = "";
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [hasStarted, testData?.id, testData?.name, user?.uid]);

  if (!activeSection) {
    return null;
  }

  if (!hasStarted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200 px-6 py-10 text-base-content">
        <section className="w-full max-w-4xl rounded-3xl border border-base-300 bg-base-100 p-8 shadow-sm md:p-10">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
              IELTS Writing Test
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {testData?.name || "Writing Test"} Instructions
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-base-content/70">
              Review the test format and rules below before starting your writing
              test.
            </p>
          </div>

          <div className="mt-8 grid gap-4">
            <div className="rounded-2xl border border-base-300 bg-base-50 px-5 py-4">
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-base-content/55">
                Total Time
              </p>
              <p className="text-base leading-7 text-base-content">60 minutes</p>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-50 px-5 py-4">
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-base-content/55">
                Tasks
              </p>
              <p className="text-base leading-7 text-base-content">
                2 sections: Writing Task 1 and Writing Task 2
              </p>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-50 px-5 py-4">
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-base-content/55">
                Screen Layout
              </p>
              <p className="text-base leading-7 text-base-content">
                The task prompt and visual appear on the left side. Your response
                area appears on the right side.
              </p>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-50 px-5 py-4">
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-base-content/55">
                Navigation
              </p>
              <p className="text-base leading-7 text-base-content">
                Use the section buttons above and below the containers to move
                between Section 1 and Section 2.
              </p>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-50 px-5 py-4">
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-base-content/55">
                Word Count
              </p>
              <p className="text-base leading-7 text-base-content">
                A live word counter is shown in the bottom-right of the writing
                area.
              </p>
            </div>

            <div className="rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4">
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-base-content/55">
                Test Security
              </p>
              <p className="text-base leading-7 text-base-content">
                Leaving the test screen, switching tabs, or opening another app
                will flag the attempt as cheating and count it as a non-complete
                attempt with a band score of 0.
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              className="btn btn-primary btn-lg min-w-56"
              onClick={() => setHasStarted(true)}
            >
              Start Test
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (isFlaggedForCheating) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200 px-6 py-10 text-base-content">
        <section className="w-full max-w-2xl rounded-3xl border border-error/20 bg-base-100 p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-error/10 p-3 text-error">
              <ExclamationTriangleIcon className="h-7 w-7" />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-error">
                Attempt Invalidated
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                You have been flagged as cheating
              </h1>
              <p className="text-base leading-7 text-base-content/75">
                This writing test has been counted as a non-complete attempt with
                a band score of 0.
              </p>
              <p className="text-sm leading-6 text-base-content/60">
                {isSavingFlag
                  ? "Saving the flagged result..."
                  : "You can return to your mock exams now."}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => router.push("/student/mock-exams/writing")}
                >
                  Back to Writing Tests
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-base-200 text-base-content">
      <section className="flex h-full w-1/2 flex-col border-r border-base-300 bg-base-100">
        <div className="border-b border-base-300 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
                IELTS Writing Test
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {testData?.name || "Writing Test"}
              </h1>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-200 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/45">
                Time Remaining
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {formatCountdown(timeRemaining)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-6 text-base-content">
            Leaving this test screen, switching tabs, or opening another app will
            flag this attempt as cheating and score it 0.
          </div>

          <div className="mt-5">
            <WritingSectionSwitcher
              sections={sections}
              activeSectionId={activeSection.id}
              onSelectSection={setActiveSectionId}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <article className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
              {activeSection.label}
            </p>
            <p className="mt-3 text-lg font-medium text-base-content/80">
              {activeSection.id === "task-1"
                ? "You should spend about 20 minutes on this task."
                : "You should spend about 40 minutes on this task."}
            </p>
            <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-base-content">
              {activeSection.prompt || "This writing prompt has not been added yet."}
            </div>

            {activeSection.imageUrl ? (
              <div className="mt-6 rounded-3xl border border-base-300 bg-base-200/50 p-4">
                <img
                  src={activeSection.imageUrl}
                  alt={`${activeSection.label} reference visual`}
                  className="max-h-[34rem] w-full rounded-2xl object-contain"
                />
              </div>
            ) : null}

            <div className="mt-6 border-t border-base-300 pt-6">
              <WritingSectionSwitcher
                sections={sections}
                activeSectionId={activeSection.id}
                onSelectSection={setActiveSectionId}
              />
            </div>
          </article>
        </div>
      </section>

      <section className="flex h-full w-1/2 flex-col bg-base-200">
        <div className="border-b border-base-300 bg-base-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Response Area
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {activeSection.label} Response
            </h2>
          </div>

          <div className="mt-5">
            <WritingSectionSwitcher
              sections={sections}
              activeSectionId={activeSection.id}
              onSelectSection={setActiveSectionId}
            />
          </div>
        </div>

        <div className="flex-1 px-6 py-6">
          <div className="flex h-full flex-col rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm leading-6 text-base-content/65">
                Write at least {activeSection.minimumWords || 0} words for this
                task.
              </p>
              <p className="text-sm leading-6 text-base-content/55">
                Your text stays separate for each writing task.
              </p>
            </div>

            <textarea
              className="textarea h-full min-h-[28rem] w-full flex-1 resize-none border-0 bg-transparent p-0 text-base leading-8 text-base-content outline-none focus:outline-none"
              placeholder={`Type your ${activeSection.label.toLowerCase()} answer here...`}
              value={responses[activeSection.id] || ""}
              onChange={(event) =>
                setResponses((currentResponses) => ({
                  ...currentResponses,
                  [activeSection.id]: event.target.value,
                }))
              }
            />

            <div className="mt-4 flex justify-end">
              <div className="rounded-2xl border border-base-300 bg-base-200 px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/45">
                  Word Count
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">
                  {countWords(responses[activeSection.id] || "")}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-base-300 pt-6">
              <WritingSectionSwitcher
                sections={sections}
                activeSectionId={activeSection.id}
                onSelectSection={setActiveSectionId}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

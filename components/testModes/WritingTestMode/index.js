"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../lib/firebase/auth-context";
import { recordStudentResult } from "../../../lib/tests/student-tests";

const DEFAULT_LEFT_WIDTH = 50;
const MIN_LEFT_WIDTH = 35;
const MAX_LEFT_WIDTH = 65;
const DIVIDER_WIDTH = 6;
const WRITING_DURATION_SECONDS = 60 * 60;
const CHEATING_GRACE_PERIOD_MS = 60 * 1000;
const SUSPICIOUS_RESUME_THRESHOLD = 3;

const WRITING_INSTRUCTION_ITEMS = [
  {
    label: "Total Time",
    value: "60 minutes",
  },
  {
    label: "Tasks",
    value: "2 sections: Writing Task 1 and Writing Task 2",
  },
  {
    label: "Screen Layout",
    value:
      "The task prompt and visual appear on the left side. Your response area appears on the right side.",
  },
  {
    label: "Navigation",
    value:
      "Use the section buttons above and below the containers to move between Section 1 and Section 2.",
  },
  {
    label: "Word Count",
    value: "A live word counter is shown in the bottom-right of the writing area.",
  },
  {
    label: "Test Security",
    value:
      "Leaving the test screen, switching tabs, or opening another app will flag the attempt as cheating and count it as a non-complete attempt with a band score of 0.",
    tone: "warning",
  },
];

function countWords(text = "") {
  const trimmed = String(text).trim();

  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function mergeHighlightRanges(ranges = []) {
  const normalizedRanges = ranges
    .filter(
      (range) =>
        Number.isFinite(range?.start) &&
        Number.isFinite(range?.end) &&
        range.end > range.start
    )
    .map((range) => ({
      start: Math.max(0, Number(range.start)),
      end: Math.max(0, Number(range.end)),
    }))
    .sort((left, right) => left.start - right.start);

  return normalizedRanges.reduce((mergedRanges, range) => {
    const previousRange = mergedRanges[mergedRanges.length - 1];

    if (!previousRange || range.start > previousRange.end) {
      return [...mergedRanges, range];
    }

    previousRange.end = Math.max(previousRange.end, range.end);
    return mergedRanges;
  }, []);
}

function buildPromptSegments(promptText = "", highlightRanges = []) {
  const mergedRanges = mergeHighlightRanges(highlightRanges);

  if (mergedRanges.length === 0) {
    return [{ text: promptText, highlighted: false }];
  }

  const segments = [];
  let currentIndex = 0;

  mergedRanges.forEach((range) => {
    if (range.start > currentIndex) {
      segments.push({
        text: promptText.slice(currentIndex, range.start),
        highlighted: false,
      });
    }

    segments.push({
      text: promptText.slice(range.start, range.end),
      highlighted: true,
    });

    currentIndex = range.end;
  });

  if (currentIndex < promptText.length) {
    segments.push({
      text: promptText.slice(currentIndex),
      highlighted: false,
    });
  }

  return segments;
}

async function copyTextToClipboard(text) {
  if (!text) {
    return;
  }

  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const helperTextarea = document.createElement("textarea");
  helperTextarea.value = text;
  helperTextarea.setAttribute("readonly", "true");
  helperTextarea.style.position = "fixed";
  helperTextarea.style.opacity = "0";
  document.body.appendChild(helperTextarea);
  helperTextarea.select();
  document.execCommand("copy");
  document.body.removeChild(helperTextarea);
}

async function readClipboardText() {
  if (navigator?.clipboard?.readText) {
    return navigator.clipboard.readText();
  }

  throw new Error("Clipboard paste is not available in this browser.");
}

function getPromptSelection(container) {
  if (!container || typeof window === "undefined") {
    return null;
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!container.contains(range.commonAncestorContainer)) {
    return null;
  }

  const prefixRange = range.cloneRange();
  prefixRange.selectNodeContents(container);
  prefixRange.setEnd(range.startContainer, range.startOffset);

  const selectedText = selection.toString();

  if (!selectedText.trim()) {
    return null;
  }

  const start = prefixRange.toString().length;
  const end = start + selectedText.length;

  return {
    start,
    end,
    text: selectedText,
  };
}

function closeSelection() {
  if (typeof window === "undefined") {
    return;
  }

  window.getSelection()?.removeAllRanges();
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

function WritingInstructionsScreen({ testName, onStart }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200 px-6 py-10 text-base-content">
      <section className="w-full max-w-4xl rounded-3xl border border-base-300 bg-base-100 p-8 shadow-sm md:p-10">
        <div className="space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
            IELTS Writing Test
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {testName || "Writing Test"} Instructions
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-base-content/70">
            Review the test format and rules below before starting your writing
            test.
          </p>
        </div>

        <div className="mt-8 grid gap-4">
          {WRITING_INSTRUCTION_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl px-5 py-4 ${
                item.tone === "warning"
                  ? "border border-warning/30 bg-warning/10"
                  : "border border-base-300 bg-base-50"
              }`}
            >
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-base-content/55">
                {item.label}
              </p>
              <p className="text-base leading-7 text-base-content">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            className="btn btn-primary btn-lg min-w-56"
            onClick={onStart}
          >
            Start Test
          </button>
        </div>
      </section>
    </main>
  );
}

function WritingCheatingNotice({ isSavingFlag, onBack }) {
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
              <button type="button" className="btn btn-primary" onClick={onBack}>
                Back to Writing Tests
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function WritingSubmissionNotice({
  isSubmitting,
  submissionError,
  onRetry,
  onBack,
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200 px-6 py-10 text-base-content">
      <section className="w-full max-w-2xl rounded-3xl border border-base-300 bg-base-100 p-8 shadow-sm">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
            Writing Submission
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isSubmitting
              ? "Submitting your writing test..."
              : submissionError
                ? "Submission needs attention"
                : "Writing test submitted"}
          </h1>
          <p className="text-base leading-7 text-base-content/75">
            {isSubmitting
              ? "The timer has ended and your writing responses are being saved to your results."
              : submissionError
                ? submissionError
                : "Your writing responses have been saved to your results."}
          </p>
          <div className="flex gap-3 pt-2">
            {submissionError ? (
              <button type="button" className="btn btn-primary" onClick={onRetry}>
                Retry Submission
              </button>
            ) : null}
            {!isSubmitting ? (
              <button type="button" className="btn btn-outline" onClick={onBack}>
                Back to Writing Tests
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function WritingContextMenu({ menu, onAction, onClose }) {
  if (!menu) {
    return null;
  }

  const actions = [
    { id: "highlight", label: "Highlight" },
    { id: "copy", label: "Copy" },
    { id: "paste", label: "Paste" },
    { id: "cut", label: "Cut" },
  ];

  return (
    <>
      <button
        type="button"
        aria-label="Close writing context menu"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        className="fixed z-50 min-w-40 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-xl"
        style={{
          left: menu.x,
          top: menu.y,
        }}
      >
        <div className="flex flex-col gap-1">
          {actions.map((action) => {
            const disabled = !menu.allowedActions.includes(action.id);

            return (
              <button
                key={action.id}
                type="button"
                className={`rounded-xl px-4 py-2 text-left text-sm transition ${
                  disabled
                    ? "cursor-not-allowed text-base-content/35"
                    : "text-base-content hover:bg-base-200"
                }`}
                onClick={() => {
                  if (!disabled) {
                    onAction(action.id);
                  }
                }}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function WritingTestMode({ testData }) {
  const router = useRouter();
  const { user } = useAuth();
  const sections = useMemo(
    () =>
      (Array.isArray(testData?.sections) ? testData.sections : []).map(
        (section, index) => ({
          id: section.id || `task-${index + 1}`,
          label: section.label || `Writing Task ${index + 1}`,
          prompt: section.prompt || "",
          imageUrl: section.imageUrl || "",
          minimumWords: Number(section.minimumWords) || 0,
          recommendedMinutes: Number(section.recommendedMinutes) || 0,
        })
      ),
    [testData]
  );

  const [hasStarted, setHasStarted] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || "task-1");
  const [responses, setResponses] = useState(() =>
    sections.reduce((nextResponses, section) => {
      nextResponses[section.id] = "";
      return nextResponses;
    }, {})
  );
  const [highlightedRangesBySection, setHighlightedRangesBySection] = useState({});
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const [isFlaggedForCheating, setIsFlaggedForCheating] = useState(false);
  const [isSavingFlag, setIsSavingFlag] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [contextMenu, setContextMenu] = useState(null);
  const [resumeCount, setResumeCount] = useState(0);
  const [wasRestoredFromDraft, setWasRestoredFromDraft] = useState(false);

  const hasRecordedFlagRef = useRef(false);
  const pendingAlertMessageRef = useRef("");
  const previousUserSelectRef = useRef("");
  const promptContentRef = useRef(null);
  const textareaRef = useRef(null);
  const hasHydratedDraftRef = useRef(false);
  const submissionInFlightRef = useRef(false);
  const latestDraftRef = useRef(null);

  const activeSection =
    sections.find((section) => section.id === activeSectionId) || sections[0] || null;
  const draftStorageKey = useMemo(
    () =>
      testData?.id
        ? `writing-draft:${user?.uid || "anonymous"}:${testData.id}`
        : "",
    [testData?.id, user?.uid]
  );
  const activePromptSegments = useMemo(
    () =>
      buildPromptSegments(
        activeSection?.prompt || "",
        highlightedRangesBySection[activeSection?.id] || []
      ),
    [activeSection?.id, activeSection?.prompt, highlightedRangesBySection]
  );
  const elapsedSeconds = startedAtMs
    ? Math.max(0, Math.floor((currentTimeMs - startedAtMs) / 1000))
    : 0;
  const timeRemaining = hasStarted
    ? Math.max(0, WRITING_DURATION_SECONDS - elapsedSeconds)
    : WRITING_DURATION_SECONDS;
  const isCheatingCheckArmed =
    hasStarted &&
    startedAtMs > 0 &&
    currentTimeMs - startedAtMs >= CHEATING_GRACE_PERIOD_MS;
  const isTestInteractive =
    hasStarted && !hasSubmitted && !isFlaggedForCheating && timeRemaining > 0;

  function buildDraftPayload(overrides = {}) {
    return {
      hasStarted,
      startedAtMs,
      activeSectionId,
      leftWidth,
      responses,
      highlights: highlightedRangesBySection,
      resumeCount,
      updatedAt: Date.now(),
      ...overrides,
    };
  }

  function persistDraft(overrides = {}) {
    if (!draftStorageKey) {
      return;
    }

    const nextDraft = buildDraftPayload(overrides);
    latestDraftRef.current = nextDraft;

    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(nextDraft));
    } catch (error) {
      console.error("[Writing Test] Failed to save local draft:", error);
    }
  }

  function clearDraft() {
    latestDraftRef.current = null;

    if (!draftStorageKey) {
      return;
    }

    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch (error) {
      console.error("[Writing Test] Failed to clear local draft:", error);
    }
  }

  useEffect(() => {
    hasHydratedDraftRef.current = false;
    setWasRestoredFromDraft(false);
    setResumeCount(0);
  }, [draftStorageKey]);

  useEffect(() => {
    setResponses((currentResponses) =>
      sections.reduce((nextResponses, section) => {
        nextResponses[section.id] = currentResponses[section.id] || "";
        return nextResponses;
      }, {})
    );

    setHighlightedRangesBySection((currentHighlights) =>
      sections.reduce((nextHighlights, section) => {
        nextHighlights[section.id] = Array.isArray(currentHighlights[section.id])
          ? currentHighlights[section.id]
          : [];
        return nextHighlights;
      }, {})
    );

    if (!sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0]?.id || "task-1");
    }
  }, [activeSectionId, sections]);

  useEffect(() => {
    if (!draftStorageKey || hasHydratedDraftRef.current) {
      return;
    }

    try {
      const serializedDraft = window.localStorage.getItem(draftStorageKey);

      if (!serializedDraft) {
        hasHydratedDraftRef.current = true;
        return;
      }

      const draft = JSON.parse(serializedDraft);

      if (draft?.responses && typeof draft.responses === "object") {
        setResponses((currentResponses) => ({
          ...currentResponses,
          ...draft.responses,
        }));
      }

      if (draft?.highlights && typeof draft.highlights === "object") {
        setHighlightedRangesBySection((currentHighlights) => ({
          ...currentHighlights,
          ...draft.highlights,
        }));
      }

      if (
        Number.isFinite(draft?.leftWidth) &&
        draft.leftWidth >= MIN_LEFT_WIDTH &&
        draft.leftWidth <= MAX_LEFT_WIDTH
      ) {
        setLeftWidth(draft.leftWidth);
      }

      if (
        typeof draft?.activeSectionId === "string" &&
        sections.some((section) => section.id === draft.activeSectionId)
      ) {
        setActiveSectionId(draft.activeSectionId);
      }

      if (draft?.hasStarted && Number.isFinite(draft?.startedAtMs) && draft.startedAtMs > 0) {
        setHasStarted(true);
        setStartedAtMs(draft.startedAtMs);
        setCurrentTimeMs(Date.now());
        setResumeCount(Number(draft.resumeCount) >= 0 ? Number(draft.resumeCount) + 1 : 1);
        setWasRestoredFromDraft(true);
      } else {
        setResumeCount(Number(draft?.resumeCount) >= 0 ? Number(draft.resumeCount) : 0);
      }
    } catch (error) {
      console.error("[Writing Test] Failed to restore local draft:", error);
    } finally {
      hasHydratedDraftRef.current = true;
    }
  }, [draftStorageKey, sections]);

  useEffect(() => {
    latestDraftRef.current = buildDraftPayload();
  }, [
    activeSectionId,
    draftStorageKey,
    hasStarted,
    highlightedRangesBySection,
    leftWidth,
    responses,
    resumeCount,
    startedAtMs,
  ]);

  useEffect(() => {
    if (!hasStarted || !draftStorageKey || hasSubmitted || isFlaggedForCheating) {
      return;
    }

    persistDraft();
  }, [
    activeSectionId,
    draftStorageKey,
    hasStarted,
    hasSubmitted,
    highlightedRangesBySection,
    isFlaggedForCheating,
    leftWidth,
    responses,
    resumeCount,
    startedAtMs,
  ]);

  useEffect(() => {
    const body = document.body;
    previousUserSelectRef.current = body.style.userSelect;

    return () => {
      body.style.userSelect = previousUserSelectRef.current;
    };
  }, []);

  useEffect(() => {
    function stopDragging() {
      setIsDragging(false);
      document.body.style.userSelect = previousUserSelectRef.current;
    }

    function handleMouseMove(event) {
      if (!isDragging) {
        return;
      }

      const viewportWidth = window.innerWidth;

      if (!viewportWidth) {
        return;
      }

      const nextLeftWidth = (event.clientX / viewportWidth) * 100;
      const clampedLeftWidth = Math.min(
        MAX_LEFT_WIDTH,
        Math.max(MIN_LEFT_WIDTH, nextLeftWidth)
      );

      setLeftWidth(clampedLeftWidth);
    }

    function handleMouseUp() {
      if (!isDragging) {
        return;
      }

      stopDragging();
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (isDragging) {
        document.body.style.userSelect = previousUserSelectRef.current;
      }
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isTestInteractive) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      const nextCurrentTime = Date.now();

      setCurrentTimeMs(nextCurrentTime);

      if (
        startedAtMs &&
        nextCurrentTime - startedAtMs >= WRITING_DURATION_SECONDS * 1000
      ) {
        window.clearInterval(timerId);
      }
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isTestInteractive, startedAtMs]);

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
    if (!isTestInteractive || typeof window === "undefined") {
      return undefined;
    }

    function handleBeforeUnload(event) {
      if (latestDraftRef.current) {
        try {
          window.localStorage.setItem(
            draftStorageKey,
            JSON.stringify({
              ...latestDraftRef.current,
              updatedAt: Date.now(),
            })
          );
        } catch (error) {
          console.error("[Writing Test] Failed to persist draft before unload:", error);
        }
      }

      event.preventDefault();
      event.returnValue = "";
      return "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [draftStorageKey, isTestInteractive]);

  useEffect(() => {
    if (
      !hasStarted ||
      !isCheatingCheckArmed ||
      hasSubmitted ||
      timeRemaining <= 0 ||
      typeof document === "undefined" ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    async function flagAttempt(reason) {
      if (hasRecordedFlagRef.current || submissionInFlightRef.current) {
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
              startedAt: new Date(startedAtMs).toISOString(),
              elapsedSeconds,
              responses,
              resumeCount,
              suspiciousResumeActivity: resumeCount >= SUSPICIOUS_RESUME_THRESHOLD,
            },
          });
        }

        clearDraft();
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
  }, [
    elapsedSeconds,
    hasStarted,
    hasSubmitted,
    isCheatingCheckArmed,
    responses,
    resumeCount,
    startedAtMs,
    testData?.id,
    testData?.name,
    timeRemaining,
    user?.uid,
  ]);

  useEffect(() => {
    if (!contextMenu) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }

    function handleScroll() {
      setContextMenu(null);
    }

    window.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [contextMenu]);

  async function submitWritingAttempt(submissionReason = "timer_expired") {
    if (
      submissionInFlightRef.current ||
      hasSubmitted ||
      isFlaggedForCheating ||
      !user?.uid ||
      !testData?.id
    ) {
      return;
    }

    submissionInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmissionError("");

    try {
      await recordStudentResult({
        userId: user.uid,
        testId: testData.id,
        testType: "writing",
        testName: testData.name || "Writing Test",
        bandScore: null,
        status: "submitted",
        metadata: {
          outcome: "submitted",
          submissionReason,
          startedAt: startedAtMs ? new Date(startedAtMs).toISOString() : "",
          elapsedSeconds,
          submittedAt: new Date().toISOString(),
          responses,
          sections: sections.map((section) => ({
            id: section.id,
            label: section.label,
            minimumWords: section.minimumWords,
            recommendedMinutes: section.recommendedMinutes,
          })),
          resumeCount,
          suspiciousResumeActivity: resumeCount >= SUSPICIOUS_RESUME_THRESHOLD,
          restoredAfterReload: wasRestoredFromDraft,
        },
      });

      clearDraft();
      setHasSubmitted(true);
    } catch (error) {
      console.error("[Writing Test] Failed to submit writing responses:", error);
      setSubmissionError(
        error?.message ||
          "We could not submit your writing yet. Your responses are still saved locally, so please retry."
      );
    } finally {
      setIsSubmitting(false);
      submissionInFlightRef.current = false;
    }
  }

  useEffect(() => {
    if (
      !hasStarted ||
      timeRemaining > 0 ||
      hasSubmitted ||
      isFlaggedForCheating ||
      submissionInFlightRef.current
    ) {
      return;
    }

    void submitWritingAttempt("timer_expired");
  }, [hasStarted, hasSubmitted, isFlaggedForCheating, timeRemaining]);

  useEffect(() => {
    if (!isTestInteractive || typeof window === "undefined") {
      return undefined;
    }

    const historyState = {
      ...(window.history.state || {}),
      writingTestGuard: true,
      writingTestId: testData?.id || "",
    };

    window.history.pushState(historyState, "", window.location.href);

    function handlePopState() {
      window.history.pushState(historyState, "", window.location.href);
      window.alert(
        "Back navigation is disabled during this writing test. Leaving the test screen may invalidate your attempt."
      );
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isTestInteractive, testData?.id]);

  if (!activeSection) {
    return null;
  }

  if (!hasStarted) {
    return (
      <WritingInstructionsScreen
        testName={testData?.name}
        onStart={() => {
          const nextStartedAtMs = Date.now();

          setHasStarted(true);
          setStartedAtMs(nextStartedAtMs);
          setCurrentTimeMs(nextStartedAtMs);
          setResumeCount(0);
          setWasRestoredFromDraft(false);

          requestAnimationFrame(() => {
            persistDraft({
              hasStarted: true,
              startedAtMs: nextStartedAtMs,
              resumeCount: 0,
            });
          });
        }}
      />
    );
  }

  if (isFlaggedForCheating) {
    return (
      <WritingCheatingNotice
        isSavingFlag={isSavingFlag}
        onBack={() => router.push("/student/mock-exams/writing")}
      />
    );
  }

  if (timeRemaining === 0 || hasSubmitted || isSubmitting || submissionError) {
    return (
      <WritingSubmissionNotice
        isSubmitting={isSubmitting}
        submissionError={submissionError}
        onRetry={() => void submitWritingAttempt("retry_after_failure")}
        onBack={() => router.push("/student/mock-exams/writing")}
      />
    );
  }

  function startResizing(event) {
    setIsDragging(true);
    document.body.style.userSelect = "none";
    event.preventDefault();
  }

  function openPromptContextMenu(event) {
    const selection = getPromptSelection(promptContentRef.current);

    if (!selection) {
      return;
    }

    event.preventDefault();

    setContextMenu({
      kind: "prompt",
      x: Math.min(event.clientX, window.innerWidth - 180),
      y: Math.min(event.clientY, window.innerHeight - 220),
      selection,
      sectionId: activeSection.id,
      allowedActions: ["highlight", "copy"],
    });
  }

  function openTextareaContextMenu(event) {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    event.preventDefault();

    const selectionStart = textarea.selectionStart || 0;
    const selectionEnd = textarea.selectionEnd || 0;
    const selectedText = textarea.value.slice(selectionStart, selectionEnd);

    setContextMenu({
      kind: "textarea",
      x: Math.min(event.clientX, window.innerWidth - 180),
      y: Math.min(event.clientY, window.innerHeight - 220),
      sectionId: activeSection.id,
      selectionStart,
      selectionEnd,
      selectedText,
      allowedActions: selectedText ? ["copy", "paste", "cut"] : ["paste"],
    });
  }

  async function handleContextMenuAction(actionId) {
    if (!contextMenu) {
      return;
    }

    try {
      if (actionId === "highlight" && contextMenu.kind === "prompt") {
        setHighlightedRangesBySection((currentHighlights) => ({
          ...currentHighlights,
          [contextMenu.sectionId]: mergeHighlightRanges([
            ...(currentHighlights[contextMenu.sectionId] || []),
            {
              start: contextMenu.selection.start,
              end: contextMenu.selection.end,
            },
          ]),
        }));
        closeSelection();
      }

      if (actionId === "copy") {
        const textToCopy =
          contextMenu.kind === "prompt"
            ? contextMenu.selection.text
            : contextMenu.selectedText;

        await copyTextToClipboard(textToCopy || "");
      }

      if (actionId === "cut" && contextMenu.kind === "textarea") {
        const currentValue = responses[contextMenu.sectionId] || "";

        await copyTextToClipboard(contextMenu.selectedText || "");

        setResponses((currentResponses) => ({
          ...currentResponses,
          [contextMenu.sectionId]:
            currentValue.slice(0, contextMenu.selectionStart) +
            currentValue.slice(contextMenu.selectionEnd),
        }));

        requestAnimationFrame(() => {
          textareaRef.current?.focus();
          textareaRef.current?.setSelectionRange(
            contextMenu.selectionStart,
            contextMenu.selectionStart
          );
        });
      }

      if (actionId === "paste" && contextMenu.kind === "textarea") {
        const clipboardText = await readClipboardText();
        const currentValue = responses[contextMenu.sectionId] || "";
        const nextValue =
          currentValue.slice(0, contextMenu.selectionStart) +
          clipboardText +
          currentValue.slice(contextMenu.selectionEnd);
        const nextCursor = contextMenu.selectionStart + clipboardText.length;

        setResponses((currentResponses) => ({
          ...currentResponses,
          [contextMenu.sectionId]: nextValue,
        }));

        requestAnimationFrame(() => {
          textareaRef.current?.focus();
          textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
        });
      }
    } catch (error) {
      console.error("[Writing Test] Context menu action failed:", error);
      window.alert(error?.message || "That action could not be completed.");
    } finally {
      setContextMenu(null);
    }
  }

  const rightWidth = 100 - leftWidth;

  return (
    <>
      <main className="flex h-screen w-screen flex-col overflow-hidden bg-base-200 text-base-content">
        <div className="border-b border-base-300 bg-base-100 px-6 py-5">
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
            flag this attempt as cheating and score it 0 after the 1 minute start
            grace period ends.
          </div>

          {wasRestoredFromDraft ? (
            <div className="mt-4 rounded-2xl border border-info/30 bg-info/10 px-4 py-3 text-sm leading-6 text-base-content">
              Your writing attempt was restored after a refresh or reconnect. The
              timer kept running and your answers were recovered locally.
            </div>
          ) : null}

          {resumeCount >= 1 ? (
            <div className="mt-4 rounded-2xl border border-base-300 bg-base-200/50 px-4 py-3 text-sm leading-6 text-base-content/80">
              Resume count for this attempt: {resumeCount}
            </div>
          ) : null}

          <div className="mt-5">
            <WritingSectionSwitcher
              sections={sections}
              activeSectionId={activeSection.id}
              onSelectSection={setActiveSectionId}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <section
            className="flex h-full flex-col border-r border-base-300 bg-base-100"
            style={{
              width: `calc((100% - ${DIVIDER_WIDTH}px) * ${leftWidth / 100})`,
            }}
          >
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <article className="flex h-full min-h-[28rem] flex-col rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
                  {activeSection.label}
                </p>
                <p className="mt-3 text-lg font-medium text-base-content/80">
                  {activeSection.id === "task-1"
                    ? "You should spend about 20 minutes on this task."
                    : "You should spend about 40 minutes on this task."}
                </p>
                <div
                  ref={promptContentRef}
                  className="mt-6 whitespace-pre-wrap text-base leading-8 text-base-content"
                  onContextMenu={openPromptContextMenu}
                >
                  {activePromptSegments.length > 0 ? (
                    activePromptSegments.map((segment, index) => (
                      <span
                        key={`prompt-segment-${index}`}
                        className={
                          segment.highlighted
                            ? "rounded bg-warning/40 px-1 py-0.5"
                            : ""
                        }
                      >
                        {segment.text}
                      </span>
                    ))
                  ) : (
                    "This writing prompt has not been added yet."
                  )}
                </div>

                {activeSection.imageUrl ? (
                  <div className="mt-6 flex min-h-0 flex-1 items-center justify-center rounded-3xl border border-base-300 bg-base-200/50 p-4">
                    <img
                      src={activeSection.imageUrl}
                      alt={`${activeSection.label} reference visual`}
                      className="h-full max-h-full w-full rounded-2xl object-contain"
                    />
                  </div>
                ) : null}
              </article>
            </div>
          </section>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize writing panels"
            aria-valuemin={MIN_LEFT_WIDTH}
            aria-valuemax={MAX_LEFT_WIDTH}
            aria-valuenow={Math.round(leftWidth)}
            onMouseDown={startResizing}
            style={{
              width: `${DIVIDER_WIDTH}px`,
              flexShrink: 0,
              cursor: "col-resize",
              backgroundColor: "#1d4ed8",
              boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.15)",
              zIndex: 1,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "#3b82f6";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "#1d4ed8";
            }}
          />

          <section
            className="flex h-full flex-col bg-base-200"
            style={{
              width: `calc((100% - ${DIVIDER_WIDTH}px) * ${rightWidth / 100})`,
            }}
          >
            <div className="border-b border-base-300 bg-base-100 px-6 py-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
                Response Area
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {activeSection.label} Response
              </h2>
            </div>

            <div className="flex-1 px-6 py-6">
              <div className="flex h-full min-h-[28rem] flex-col rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
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
                  ref={textareaRef}
                  className="textarea h-full min-h-[28rem] w-full flex-1 resize-none border-0 bg-transparent p-0 text-base leading-8 text-base-content outline-none focus:outline-none"
                  placeholder={`Type your ${activeSection.label.toLowerCase()} answer here...`}
                  value={responses[activeSection.id] || ""}
                  onChange={(event) =>
                    setResponses((currentResponses) => ({
                      ...currentResponses,
                      [activeSection.id]: event.target.value,
                    }))
                  }
                  onContextMenu={openTextareaContextMenu}
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
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-base-300 bg-base-100 px-6 py-5">
          <WritingSectionSwitcher
            sections={sections}
            activeSectionId={activeSection.id}
            onSelectSection={setActiveSectionId}
          />
        </div>
      </main>

      <WritingContextMenu
        menu={contextMenu}
        onAction={(actionId) => void handleContextMenuAction(actionId)}
        onClose={() => setContextMenu(null)}
      />
    </>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../lib/firebase/auth-context";
import { recordStudentResult } from "../../../lib/tests/student-tests";
import {
  buildStudentAttemptStorageKey,
  clearStudentAttemptDraft,
  loadStudentAttemptDraft,
  saveStudentAttemptDraft,
} from "../../../lib/tests/student-attempt-storage";

const DEFAULT_LEFT_WIDTH = 58;
const MIN_LEFT_WIDTH = 38;
const MAX_LEFT_WIDTH = 68;
const DIVIDER_WIDTH = 6;
const LISTENING_DURATION_SECONDS = 32 * 60;
const CHEATING_GRACE_PERIOD_MS = 60 * 1000;
const SUSPICIOUS_RESUME_THRESHOLD = 3;

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ListeningSectionSwitcher({ sections, activeSectionId, onSelectSection }) {
  if (sections.length <= 1) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {sections.map((section, index) => (
        <button
          key={section.id || `section-${index + 1}`}
          type="button"
          className={`rounded-2xl border px-4 py-3 text-left transition ${
            section.id === activeSectionId
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-base-300 bg-base-100 text-base-content hover:border-base-content/20 hover:bg-base-100"
          }`}
          onClick={() => onSelectSection(section.id)}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-65">
            Section {section.sectionNumber || index + 1}
          </p>
          <p className="mt-2 text-sm leading-6 opacity-75">
            {section.title || "Listening Section"}
          </p>
        </button>
      ))}
    </div>
  );
}

function renderListeningQuestionGroup(question, groupIndex) {
  if (question.type === "MATCHING_INFORMATION") {
    return (
      <section
        key={`listening-group-${groupIndex}`}
        className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
          {question.questionRange ? `Questions ${question.questionRange}` : "Matching"}
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">
          {question.title || "Matching Information"}
        </h3>
        {question.instructions ? (
          <p className="mt-3 text-sm leading-6 text-base-content/70">
            {question.instructions}
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          {(Array.isArray(question.questions) ? question.questions : []).map((item, index) => (
            <div
              key={`matching-question-${item.id || item.number || index}`}
              className="rounded-xl border border-base-300 bg-base-200/40 p-4"
            >
              <p className="text-sm font-medium text-base-content/80">
                {item.number ? `${item.number}. ` : ""}
                {item.question}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (question.type === "MULTIPLE_CHOICE") {
    return (
      <section
        key={`listening-group-${groupIndex}`}
        className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
          {question.questionRange ? `Questions ${question.questionRange}` : "Multiple Choice"}
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">
          {question.title || "Multiple Choice"}
        </h3>
        {question.instructions ? (
          <p className="mt-3 text-sm leading-6 text-base-content/70">
            {question.instructions}
          </p>
        ) : null}
        <div className="mt-4 space-y-4">
          {(Array.isArray(question.questions) ? question.questions : []).map((item, index) => (
            <div
              key={`mc-question-${item.id || item.number || index}`}
              className="rounded-xl border border-base-300 bg-base-200/40 p-4"
            >
              <p className="mb-3 text-sm font-medium text-base-content/80">
                {item.number ? `${item.number}. ` : ""}
                {item.question}
              </p>
              <div className="space-y-2">
                {(Array.isArray(item.options) ? item.options : []).map((option) => (
                  <div
                    key={`${item.number}-${option.label}`}
                    className="rounded-lg border border-base-300 bg-base-100 px-3 py-3 text-sm"
                  >
                    <strong className="mr-2">{option.label}</strong>
                    {option.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (question.type === "TABLE") {
    return (
      <section
        key={`listening-group-${groupIndex}`}
        className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
          {question.questionRange ? `Questions ${question.questionRange}` : "Table Completion"}
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">
          {question.title || "Table Completion"}
        </h3>
        {question.instructions ? (
          <p className="mt-3 text-sm leading-6 text-base-content/70">
            {question.instructions}
          </p>
        ) : null}
        <div className="mt-4 overflow-x-auto rounded-xl border border-base-300">
          <table className="table">
            {(Array.isArray(question.table?.headers) ? question.table.headers : []).length > 0 ? (
              <thead>
                <tr>
                  {question.table.headers.map((header, index) => (
                    <th key={`listening-table-header-${index}`}>{header}</th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {(Array.isArray(question.table?.rows) ? question.table.rows : []).map(
                (row, rowIndex) => (
                  <tr key={`listening-table-row-${rowIndex}`}>
                    {(Array.isArray(row.cells) ? row.cells : []).map((cell, cellIndex) => (
                      <td key={`listening-table-cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                    ))}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (question.type === "TFNG") {
    return (
      <section
        key={`listening-group-${groupIndex}`}
        className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
          {question.questionRange ? `Questions ${question.questionRange}` : "True / False"}
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">
          {question.title || "True / False / Not Given"}
        </h3>
        {question.instructions ? (
          <p className="mt-3 text-sm leading-6 text-base-content/70">
            {question.instructions}
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          {(Array.isArray(question.questions) ? question.questions : []).map((item, index) => (
            <div
              key={`tfng-question-${item.id || item.number || index}`}
              className="rounded-xl border border-base-300 bg-base-200/40 p-4"
            >
              <p className="text-sm font-medium text-base-content/80">
                {item.number ? `${item.number}. ` : ""}
                {item.question}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      key={`listening-group-${groupIndex}`}
      className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm"
    >
      <p className="text-sm text-base-content/70">This listening question group is not ready yet.</p>
    </section>
  );
}

export default function ListeningTestMode({ testData }) {
  const router = useRouter();
  const { user } = useAuth();
  const sections = Array.isArray(testData?.sections) ? testData.sections : [];
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const [isFlaggedForCheating, setIsFlaggedForCheating] = useState(false);
  const [isSavingFlag, setIsSavingFlag] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [resumeCount, setResumeCount] = useState(0);
  const [wasRestoredFromDraft, setWasRestoredFromDraft] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || "");

  const previousUserSelectRef = useRef("");
  const hasHydratedDraftRef = useRef(false);
  const latestDraftRef = useRef(null);
  const hasRecordedFlagRef = useRef(false);
  const pendingAlertMessageRef = useRef("");
  const submissionInFlightRef = useRef(false);

  const activeSection =
    sections.find((section) => section.id === activeSectionId) || sections[0] || null;
  const draftStorageKey = useMemo(
    () =>
      buildStudentAttemptStorageKey({
        userId: user?.uid || "",
        testId: testData?.id || "",
        testType: "listening",
      }),
    [testData?.id, user?.uid]
  );
  const elapsedSeconds = startedAtMs
    ? Math.max(0, Math.floor((currentTimeMs - startedAtMs) / 1000))
    : 0;
  const timeRemaining = startedAtMs
    ? Math.max(0, LISTENING_DURATION_SECONDS - elapsedSeconds)
    : LISTENING_DURATION_SECONDS;
  const isCheatingCheckArmed =
    startedAtMs > 0 &&
    currentTimeMs - startedAtMs >= CHEATING_GRACE_PERIOD_MS;
  const isTestInteractive =
    startedAtMs > 0 && !hasSubmitted && !isFlaggedForCheating && timeRemaining > 0;
  const rightWidth = 100 - leftWidth;

  function buildDraftPayload(overrides = {}) {
    return {
      startedAtMs,
      leftWidth,
      activeSectionId,
      resumeCount,
      updatedAt: Date.now(),
      ...overrides,
    };
  }

  function persistDraft(overrides = {}) {
    const nextDraft = buildDraftPayload(overrides);
    latestDraftRef.current = nextDraft;
    saveStudentAttemptDraft(draftStorageKey, nextDraft);
  }

  function clearDraft() {
    latestDraftRef.current = null;
    clearStudentAttemptDraft(draftStorageKey);
  }

  useEffect(() => {
    hasHydratedDraftRef.current = false;
    setWasRestoredFromDraft(false);
    setResumeCount(0);
  }, [draftStorageKey]);

  useEffect(() => {
    const body = document.body;
    const previousBodyOverflow = body.style.overflow;
    previousUserSelectRef.current = body.style.userSelect;

    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.userSelect = previousUserSelectRef.current;
    };
  }, []);

  useEffect(() => {
    if (!draftStorageKey || hasHydratedDraftRef.current) {
      return;
    }

    const draft = loadStudentAttemptDraft(draftStorageKey);

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

    if (Number.isFinite(draft?.startedAtMs) && draft.startedAtMs > 0) {
      setStartedAtMs(draft.startedAtMs);
      setCurrentTimeMs(Date.now());
      setResumeCount(Number(draft.resumeCount) >= 0 ? Number(draft.resumeCount) + 1 : 1);
      setWasRestoredFromDraft(true);
    } else {
      const nextStartedAtMs = Date.now();
      setStartedAtMs(nextStartedAtMs);
      setCurrentTimeMs(nextStartedAtMs);
      setResumeCount(0);
      latestDraftRef.current = {
        startedAtMs: nextStartedAtMs,
        leftWidth: draft?.leftWidth || DEFAULT_LEFT_WIDTH,
        activeSectionId: draft?.activeSectionId || sections[0]?.id || "",
        resumeCount: 0,
        updatedAt: Date.now(),
      };
      saveStudentAttemptDraft(draftStorageKey, latestDraftRef.current);
    }

    hasHydratedDraftRef.current = true;
  }, [draftStorageKey, sections]);

  useEffect(() => {
    latestDraftRef.current = buildDraftPayload();
  }, [activeSectionId, leftWidth, resumeCount, startedAtMs]);

  useEffect(() => {
    if (!isTestInteractive) {
      return;
    }

    persistDraft();
  }, [activeSectionId, isTestInteractive, leftWidth, resumeCount, startedAtMs]);

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
        nextCurrentTime - startedAtMs >= LISTENING_DURATION_SECONDS * 1000
      ) {
        window.clearInterval(timerId);
      }
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isTestInteractive, startedAtMs]);

  useEffect(() => {
    if (!startedAtMs || hasShownWarning || typeof window === "undefined") {
      return;
    }

    window.alert(
      "Warning: if you leave this listening test screen, switch tabs, or move to another app, your attempt will be flagged as cheating and counted as a non-complete attempt with a band score of 0."
    );
    setHasShownWarning(true);
  }, [hasShownWarning, startedAtMs]);

  useEffect(() => {
    if (!isTestInteractive || typeof window === "undefined") {
      return undefined;
    }

    function handleBeforeUnload(event) {
      if (latestDraftRef.current) {
        saveStudentAttemptDraft(draftStorageKey, {
          ...latestDraftRef.current,
          updatedAt: Date.now(),
        });
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
      !isTestInteractive ||
      !isCheatingCheckArmed ||
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
            testType: "listening",
            testName: testData.name || "Listening Test",
            bandScore: 0,
            status: "flagged_cheating",
            metadata: {
              outcome: "non_complete",
              flagReason: reason,
              startedAt: new Date(startedAtMs).toISOString(),
              elapsedSeconds,
              activeSectionId,
              resumeCount,
              suspiciousResumeActivity: resumeCount >= SUSPICIOUS_RESUME_THRESHOLD,
            },
          });
        }

        clearDraft();
      } catch (error) {
        console.error("[Listening Test] Failed to record cheating flag:", error);
      } finally {
        pendingAlertMessageRef.current =
          "You have been flagged as cheating. This listening test has been counted as a non-complete attempt with a band score of 0.";
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
    activeSectionId,
    elapsedSeconds,
    isCheatingCheckArmed,
    isTestInteractive,
    resumeCount,
    startedAtMs,
    testData?.id,
    testData?.name,
    user?.uid,
  ]);

  async function submitListeningAttempt(submissionReason = "timer_expired") {
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
        testType: "listening",
        testName: testData.name || "Listening Test",
        bandScore: null,
        status: "submitted",
        metadata: {
          outcome: "submitted",
          submissionReason,
          startedAt: startedAtMs ? new Date(startedAtMs).toISOString() : "",
          elapsedSeconds,
          submittedAt: new Date().toISOString(),
          activeSectionId,
          resumeCount,
          suspiciousResumeActivity: resumeCount >= SUSPICIOUS_RESUME_THRESHOLD,
          restoredAfterReload: wasRestoredFromDraft,
        },
      });

      clearDraft();
      setHasSubmitted(true);
    } catch (error) {
      console.error("[Listening Test] Failed to submit listening attempt:", error);
      setSubmissionError(
        error?.message ||
          "We could not submit your listening attempt yet. The session is still saved locally, so please retry."
      );
    } finally {
      setIsSubmitting(false);
      submissionInFlightRef.current = false;
    }
  }

  useEffect(() => {
    if (
      !startedAtMs ||
      timeRemaining > 0 ||
      hasSubmitted ||
      isFlaggedForCheating ||
      submissionInFlightRef.current
    ) {
      return;
    }

    void submitListeningAttempt("timer_expired");
  }, [hasSubmitted, isFlaggedForCheating, startedAtMs, timeRemaining]);

  useEffect(() => {
    if (!isTestInteractive || typeof window === "undefined") {
      return undefined;
    }

    const historyState = {
      ...(window.history.state || {}),
      listeningTestGuard: true,
      listeningTestId: testData?.id || "",
    };

    window.history.pushState(historyState, "", window.location.href);

    function handlePopState() {
      window.history.pushState(historyState, "", window.location.href);
      window.alert(
        "Back navigation is disabled during this listening test. Leaving the test screen may invalidate your attempt."
      );
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isTestInteractive, testData?.id]);

  function startResizing(event) {
    setIsDragging(true);
    document.body.style.userSelect = "none";
    event.preventDefault();
  }

  if (!startedAtMs || !activeSection) {
    return null;
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
                This listening test has been counted as a non-complete attempt with
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
                  onClick={() => router.push("/student/mock-exams/listening")}
                >
                  Back to Listening Tests
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (timeRemaining === 0 || hasSubmitted || isSubmitting || submissionError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200 px-6 py-10 text-base-content">
        <section className="w-full max-w-2xl rounded-3xl border border-base-300 bg-base-100 p-8 shadow-sm">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Listening Submission
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {isSubmitting
                ? "Submitting your listening test..."
                : submissionError
                  ? "Submission needs attention"
                  : "Listening test submitted"}
            </h1>
            <p className="text-base leading-7 text-base-content/75">
              {isSubmitting
                ? "The timer has ended and your listening attempt is being saved to your results."
                : submissionError
                  ? submissionError
                  : "Your listening attempt has been saved to your results."}
            </p>
            <div className="flex gap-3 pt-2">
              {submissionError ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void submitListeningAttempt("retry_after_failure")}
                >
                  Retry Submission
                </button>
              ) : null}
              {!isSubmitting ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => router.push("/student/mock-exams/listening")}
                >
                  Back to Listening Tests
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-base-200 text-base-content">
      <div className="border-b border-base-300 bg-base-100 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Listening Test
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {testData?.name || "Listening Test"}
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
          Leaving this listening test screen, switching tabs, or opening another app
          will flag this attempt as cheating and score it 0 after the 1 minute start
          grace period ends.
        </div>

        {wasRestoredFromDraft ? (
          <div className="mt-4 rounded-2xl border border-info/30 bg-info/10 px-4 py-3 text-sm leading-6 text-base-content">
            Your listening attempt was restored after a refresh or reconnect. The
            timer kept running and your session was recovered locally.
          </div>
        ) : null}

        {resumeCount >= 1 ? (
          <div className="mt-4 rounded-2xl border border-base-300 bg-base-200/50 px-4 py-3 text-sm leading-6 text-base-content/80">
            Resume count for this attempt: {resumeCount}
          </div>
        ) : null}

        <div className="mt-5">
          <ListeningSectionSwitcher
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
            <div className="space-y-6">
              <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
                  Audio Section
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {activeSection.title || `Section ${activeSection.sectionNumber || 1}`}
                </h2>
                {activeSection.info ? (
                  <p className="mt-3 text-base leading-7 text-base-content/70">
                    {activeSection.info}
                  </p>
                ) : null}

                <div className="mt-6 rounded-2xl border border-base-300 bg-base-200/50 p-5">
                  {activeSection.audioUrl ? (
                    <audio
                      controls
                      className="w-full"
                      src={activeSection.audioUrl}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  ) : (
                    <p className="text-sm leading-6 text-base-content/65">
                      No audio file has been attached to this listening section yet.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize listening panels"
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
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {(Array.isArray(activeSection.questions) ? activeSection.questions : []).length > 0 ? (
                activeSection.questions.map((question, index) =>
                  renderListeningQuestionGroup(question, index)
                )
              ) : (
                <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
                  <p className="text-base-content/70">
                    Listening questions for this section will appear here.
                  </p>
                </section>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

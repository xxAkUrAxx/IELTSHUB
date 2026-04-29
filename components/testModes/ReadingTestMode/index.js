"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { calculateMultipleChoiceScore } from "../../../lib/tests/answer-utils";
import { useAuth } from "../../../lib/firebase/auth-context";
import { recordStudentResult } from "../../../lib/tests/student-tests";
import {
  buildStudentAttemptStorageKey,
  clearStudentAttemptDraft,
  loadStudentAttemptDraft,
  saveStudentAttemptDraft,
} from "../../../lib/tests/student-attempt-storage";

const tfngOptions = ["TRUE", "FALSE", "NOT GIVEN"];
const paragraphLetterPattern = /^([A-Z])(?:[\.\)]|\s|$)/;
const DEFAULT_LEFT_WIDTH = 60;
const MIN_LEFT_WIDTH = 40;
const MAX_LEFT_WIDTH = 70;
const DIVIDER_WIDTH = 6;
const READING_DURATION_SECONDS = 60 * 60;
const CHEATING_GRACE_PERIOD_MS = 60 * 1000;
const SUSPICIOUS_RESUME_THRESHOLD = 3;

function renderFillBlankQuestion(question, answer, onChange) {
  const promptText = String(question?.question || "");
  const hasBlank = promptText.includes("____");
  const parts = hasBlank ? promptText.split("____") : [promptText, ""];

  return (
    <div className="mb-6 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <p className="mb-3 text-sm font-medium text-base-content/60">
        {question.number ? `Question ${question.number}` : "Question"}
      </p>
      <p className="mb-4 text-base leading-7 text-base-content">
        {parts[0]}
        <input
          type="text"
          value={answer}
          onChange={(event) => onChange(event.target.value)}
          className="mx-2 inline-flex w-40 rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm"
          placeholder="Answer"
        />
        {parts[1]}
      </p>
    </div>
  );
}

function renderSummaryCompletionQuestion(question, answers, onChange) {
  const summaryText = String(question.summaryText || "");
  const summarySegments = summaryText.split(/(\d+\s*\.{5,})/g).filter(Boolean);

  return (
    <div className="mb-6 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <p className="mb-2 text-sm font-medium text-base-content/60">
        {question.questionRange
          ? `Questions ${question.questionRange}`
          : "Summary Completion"}
      </p>
      {question.instructions ? (
        <p className="mb-4 text-base leading-7 text-base-content">
          {question.instructions}
        </p>
      ) : null}

      {summaryText ? (
        <div className="rounded-xl border border-base-300 bg-base-200/40 p-4">
          <p className="whitespace-pre-wrap text-base leading-8 text-base-content">
            {summarySegments.map((segment, index) => {
              const blankMatch = segment.match(/(\d+)\s*\.{5,}/);

              if (!blankMatch) {
                return <span key={`summary-text-${index}`}>{segment}</span>;
              }

              const questionNumber = blankMatch[1];

              return (
                <input
                  key={`summary-input-${questionNumber}-${index}`}
                  type="text"
                  value={answers[questionNumber] || ""}
                  onChange={(event) =>
                    onChange(questionNumber, event.target.value)
                  }
                  className="mx-2 inline-flex w-40 rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm"
                  placeholder={`Q${questionNumber}`}
                />
              );
            })}
          </p>
        </div>
      ) : null}

      {Array.isArray(question.questions) && question.questions.length > 0 ? (
        <div className="mt-4 space-y-3">
          {question.questions.map((item, index) => (
            <div
              key={`summary-question-${item.number || index}`}
              className="rounded-xl border border-base-300 bg-base-200/30 p-4"
            >
              <p className="mb-2 text-sm font-medium text-base-content/70">
                {item.number ? `${item.number}. ` : ""}
                Enter your answer
              </p>
              <input
                type="text"
                value={answers[item.number || index] || ""}
                onChange={(event) =>
                  onChange(item.number || index, event.target.value)
                }
                className="input input-bordered w-full max-w-xs"
                placeholder="Answer"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function renderTfngGroup(question, answers, onChange) {
  return (
    <div className="mb-6 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <p className="mb-2 text-sm font-medium text-base-content/60">
        {question.questionRange ? `Questions ${question.questionRange}` : "TFNG"}
      </p>
      <p className="mb-4 text-base leading-7 text-base-content">
        {question.instructions}
      </p>

      <div className="space-y-4">
        {question.questions.map((item, index) => (
          <div
            key={`tfng-${item.number || index}`}
            className="rounded-xl border border-base-300 bg-base-200/40 p-4"
          >
            <p className="mb-3 text-sm font-medium text-base-content/70">
              {item.number ? `${item.number}. ` : ""}
              {item.question}
            </p>
            <div className="flex flex-wrap gap-2">
              {tfngOptions.map((option) => (
                <label
                  key={`${item.number}-${option}`}
                  className="label cursor-pointer gap-2 rounded-lg border border-base-300 bg-base-100 px-3 py-2"
                >
                  <input
                    type="radio"
                    name={`tfng-${item.number || index}`}
                    className="radio radio-sm"
                    checked={answers[item.number || index] === option}
                    onChange={() => onChange(item.number || index, option)}
                  />
                  <span className="label-text">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTableCellSegments(cellValue) {
  const normalizedValue = String(cellValue || "");
  const matches = [...normalizedValue.matchAll(/(\d+)\s*\.{5,}/g)];

  if (matches.length === 0) {
    return [{ type: "text", value: normalizedValue }];
  }

  const segments = [];
  let lastIndex = 0;

  matches.forEach((match) => {
    const matchIndex = match.index || 0;

    if (matchIndex > lastIndex) {
      segments.push({
        type: "text",
        value: normalizedValue.slice(lastIndex, matchIndex),
      });
    }

    segments.push({
      type: "blank",
      questionNumber: match[1],
    });
    lastIndex = matchIndex + match[0].length;
  });

  if (lastIndex < normalizedValue.length) {
    segments.push({
      type: "text",
      value: normalizedValue.slice(lastIndex),
    });
  }

  return segments;
}

function renderTableQuestion(question, answers, onChange) {
  const headers = question.table?.headers || [];
  const rows = question.table?.rows || [];

  return (
    <div className="mb-6 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <p className="mb-2 text-sm font-medium text-base-content/60">
        {question.questionRange
          ? `Questions ${question.questionRange}`
          : "Table Completion"}
      </p>
      {question.instructions ? (
        <p className="mb-4 text-base leading-7 text-base-content">{question.instructions}</p>
      ) : null}
      {question.question ? (
        <p className="mb-4 text-base leading-7 text-base-content">{question.question}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-base-300">
        <table className="table">
          {headers.length > 0 ? (
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={`header-${index}`}>{header}</th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.cells.map((cell, cellIndex) => (
                  <td key={`cell-${rowIndex}-${cellIndex}`}>
                    <div className="whitespace-pre-wrap leading-7">
                      {getTableCellSegments(cell).map((segment, segmentIndex) =>
                        segment.type === "blank" ? (
                          <input
                            key={`blank-${rowIndex}-${cellIndex}-${segment.questionNumber}-${segmentIndex}`}
                            type="text"
                            value={answers[segment.questionNumber] || ""}
                            onChange={(event) =>
                              onChange(segment.questionNumber, event.target.value)
                            }
                            className="mx-2 inline-flex w-40 rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm"
                            placeholder={`Q${segment.questionNumber}`}
                          />
                        ) : (
                          <span key={`text-${rowIndex}-${cellIndex}-${segmentIndex}`}>
                            {segment.value}
                          </span>
                        )
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderMatchingInformationQuestion(question, answers, onChange) {
  const possibleAnswers = Array.isArray(question.possibleAnswers)
    ? question.possibleAnswers
    : [];

  return (
    <div className="mb-6 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <p className="mb-2 text-sm font-medium text-base-content/60">
        {question.questionRange
          ? `Questions ${question.questionRange}`
          : "Matching Information"}
      </p>
      {question.instructions ? (
        <p className="mb-4 text-base leading-7 text-base-content">
          {question.instructions}
        </p>
      ) : null}

      <div className="space-y-4">
        {question.questions.map((item, index) => (
          <div
            key={`matching-information-${item.number || index}`}
            className="rounded-xl border border-base-300 bg-base-200/40 p-4"
          >
            <p className="mb-3 text-sm font-medium text-base-content/70">
              {item.number ? `${item.number}. ` : ""}
              {item.question}
            </p>
            {possibleAnswers.length > 0 ? (
              <select
                className="select select-bordered w-full max-w-md"
                value={answers[item.number || index] || ""}
                onChange={(event) =>
                  onChange(item.number || index, event.target.value)
                }
              >
                <option value="">Select answer</option>
                {possibleAnswers.map((option) => (
                  <option key={`${item.number}-${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={answers[item.number || index] || ""}
                onChange={(event) =>
                  onChange(item.number || index, event.target.value.toUpperCase())
                }
                className="input input-bordered w-28 uppercase"
                placeholder="A"
                maxLength={2}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getMultipleChoiceSelectionCount(questionItem, instructions) {
  const explicitSelectionCount =
    Number(questionItem?.selectionCount) > 0
      ? Number(questionItem.selectionCount)
      : Array.isArray(questionItem?.correctAnswers) &&
          questionItem.correctAnswers.length > 0
        ? questionItem.correctAnswers.length
        : 1;

  if (explicitSelectionCount > 1) {
    return explicitSelectionCount;
  }

  const helperText = `${questionItem?.question || ""} ${instructions || ""}`.toUpperCase();

  if (/\bCHOOSE\s+TWO\b|\bSELECT\s+TWO\b/.test(helperText)) {
    return 2;
  }

  return 1;
}

function toggleMultipleChoiceAnswer(currentValue, optionLabel, maxSelections) {
  const currentAnswers = Array.isArray(currentValue)
    ? currentValue
    : currentValue
      ? [currentValue]
      : [];

  if (currentAnswers.includes(optionLabel)) {
    return currentAnswers.filter((value) => value !== optionLabel);
  }

  if (maxSelections <= 1) {
    return [optionLabel];
  }

  if (currentAnswers.length >= maxSelections) {
    return currentAnswers;
  }

  return [...currentAnswers, optionLabel];
}

function renderMultipleChoiceQuestion(question, answers, onChange) {
  return (
    <div className="mb-6 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <p className="mb-2 text-sm font-medium text-base-content/60">
        {question.questionRange
          ? `Questions ${question.questionRange}`
          : "Multiple Choice"}
      </p>
      {question.instructions ? (
        <p className="mb-4 text-base leading-7 text-base-content">
          {question.instructions}
        </p>
      ) : null}

      <div className="space-y-4">
        {question.questions.map((item, index) => {
          const answerKey = item.number || index;
          const maxSelections = getMultipleChoiceSelectionCount(
            item,
            question.instructions
          );
          const selectedAnswers = Array.isArray(answers[answerKey])
            ? answers[answerKey]
            : answers[answerKey]
              ? [answers[answerKey]]
              : [];
          const currentScore = calculateMultipleChoiceScore(
            selectedAnswers,
            item.correctAnswers || item.acceptedAnswers || item.correctAnswer
          );

          return (
            <div
              key={`multiple-choice-${answerKey}`}
              className="rounded-xl border border-base-300 bg-base-200/40 p-4"
            >
              <p className="mb-3 text-sm font-medium text-base-content/70">
                {item.number ? `${item.number}. ` : ""}
                {item.question}
              </p>
              <div className="space-y-2">
                {(Array.isArray(item.options) ? item.options : []).map((option) => (
                  <label
                    key={`${answerKey}-${option.label}`}
                    className="label cursor-pointer justify-start gap-3 rounded-lg border border-base-300 bg-base-100 px-3 py-3"
                  >
                    <input
                      type={maxSelections > 1 ? "checkbox" : "radio"}
                      name={`multiple-choice-${answerKey}`}
                      className={maxSelections > 1 ? "checkbox checkbox-sm" : "radio radio-sm"}
                      checked={selectedAnswers.includes(option.label)}
                      onChange={() =>
                        onChange(
                          answerKey,
                          toggleMultipleChoiceAnswer(
                            answers[answerKey],
                            option.label,
                            maxSelections
                          )
                        )
                      }
                    />
                    <span className="label-text">
                      <strong className="mr-2">{option.label}</strong>
                      {option.text}
                    </span>
                  </label>
                ))}
              </div>
              {maxSelections > 1 ? (
                <p className="mt-3 text-xs text-base-content/60">
                  Select up to {maxSelections}. Current score: {currentScore}/{maxSelections}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderPassageParagraphs(passage) {
  return String(passage || "")
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim().length > 0)
    .map((paragraph, index) => {
      const trimmedParagraph = paragraph.trim();
      const lines = trimmedParagraph.split(/\r?\n/);
      const firstLine = lines[0]?.trim() || "";
      const match = firstLine.match(paragraphLetterPattern);

      if (!match) {
        return (
          <p
            key={`passage-paragraph-${index}`}
            className="whitespace-pre-line text-base leading-8 text-base-content"
          >
            {trimmedParagraph}
          </p>
        );
      }

      const letter = match[1];
      const normalizedFirstLine = firstLine.replace(paragraphLetterPattern, "").trim();
      const remainingLines = lines.slice(1).join("\n").trim();
      const paragraphBody = [normalizedFirstLine, remainingLines]
        .filter(Boolean)
        .join("\n");

      return (
        <article
          key={`passage-paragraph-${index}`}
          className="rounded-2xl border border-base-300 bg-base-200/20 p-5"
        >
          <p className="mb-3 text-2xl font-black uppercase tracking-[0.22em] text-[#1b2ea8]">
            {letter}
          </p>
          <p className="whitespace-pre-line text-base leading-8 text-base-content">
            {paragraphBody}
          </p>
        </article>
      );
    });
}

export default function ReadingTestMode({ testData }) {
  const router = useRouter();
  const { user } = useAuth();
  const [answers, setAnswers] = useState({});
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
  const previousUserSelectRef = useRef("");
  const hasHydratedDraftRef = useRef(false);
  const latestDraftRef = useRef(null);
  const hasRecordedFlagRef = useRef(false);
  const pendingAlertMessageRef = useRef("");
  const submissionInFlightRef = useRef(false);

  const sections = Array.isArray(testData?.sections) ? testData.sections : [];
  const questions = Array.isArray(testData?.questions) ? testData.questions : [];
  const hasSections = sections.length > 0;
  const draftStorageKey = useMemo(
    () =>
      buildStudentAttemptStorageKey({
        userId: user?.uid || "",
        testId: testData?.id || "",
        testType: "reading",
      }),
    [testData?.id, user?.uid]
  );
  const elapsedSeconds = startedAtMs
    ? Math.max(0, Math.floor((currentTimeMs - startedAtMs) / 1000))
    : 0;
  const timeRemaining = startedAtMs
    ? Math.max(0, READING_DURATION_SECONDS - elapsedSeconds)
    : READING_DURATION_SECONDS;
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
      answers,
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

    if (draft?.answers && typeof draft.answers === "object") {
      setAnswers(draft.answers);
    }

    if (
      Number.isFinite(draft?.leftWidth) &&
      draft.leftWidth >= MIN_LEFT_WIDTH &&
      draft.leftWidth <= MAX_LEFT_WIDTH
    ) {
      setLeftWidth(draft.leftWidth);
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
        answers: draft?.answers || {},
        resumeCount: 0,
        updatedAt: Date.now(),
      };
      saveStudentAttemptDraft(draftStorageKey, latestDraftRef.current);
    }

    hasHydratedDraftRef.current = true;
  }, [draftStorageKey]);

  useEffect(() => {
    latestDraftRef.current = buildDraftPayload();
  }, [answers, leftWidth, resumeCount, startedAtMs]);

  useEffect(() => {
    if (!isTestInteractive) {
      return;
    }

    persistDraft();
  }, [answers, isTestInteractive, leftWidth, resumeCount, startedAtMs]);

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
        nextCurrentTime - startedAtMs >= READING_DURATION_SECONDS * 1000
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
      "Warning: if you leave this reading test screen, switch tabs, or move to another app, your attempt will be flagged as cheating and counted as a non-complete attempt with a band score of 0."
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
            testType: "reading",
            testName: testData.name || "Reading Test",
            bandScore: 0,
            status: "flagged_cheating",
            metadata: {
              outcome: "non_complete",
              flagReason: reason,
              startedAt: new Date(startedAtMs).toISOString(),
              elapsedSeconds,
              answers,
              resumeCount,
              suspiciousResumeActivity: resumeCount >= SUSPICIOUS_RESUME_THRESHOLD,
            },
          });
        }

        clearDraft();
      } catch (error) {
        console.error("[Reading Test] Failed to record cheating flag:", error);
      } finally {
        pendingAlertMessageRef.current =
          "You have been flagged as cheating. This reading test has been counted as a non-complete attempt with a band score of 0.";
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
    answers,
    elapsedSeconds,
    isCheatingCheckArmed,
    isTestInteractive,
    resumeCount,
    startedAtMs,
    testData?.id,
    testData?.name,
    user?.uid,
  ]);

  async function submitReadingAttempt(submissionReason = "timer_expired") {
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
        testType: "reading",
        testName: testData.name || "Reading Test",
        bandScore: null,
        status: "submitted",
        metadata: {
          outcome: "submitted",
          submissionReason,
          startedAt: startedAtMs ? new Date(startedAtMs).toISOString() : "",
          elapsedSeconds,
          submittedAt: new Date().toISOString(),
          answers,
          resumeCount,
          suspiciousResumeActivity: resumeCount >= SUSPICIOUS_RESUME_THRESHOLD,
          restoredAfterReload: wasRestoredFromDraft,
        },
      });

      clearDraft();
      setHasSubmitted(true);
    } catch (error) {
      console.error("[Reading Test] Failed to submit reading responses:", error);
      setSubmissionError(
        error?.message ||
          "We could not submit your reading answers yet. Your answers are still saved locally, so please retry."
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

    void submitReadingAttempt("timer_expired");
  }, [hasSubmitted, isFlaggedForCheating, startedAtMs, timeRemaining]);

  useEffect(() => {
    if (!isTestInteractive || typeof window === "undefined") {
      return undefined;
    }

    const historyState = {
      ...(window.history.state || {}),
      readingTestGuard: true,
      readingTestId: testData?.id || "",
    };

    window.history.pushState(historyState, "", window.location.href);

    function handlePopState() {
      window.history.pushState(historyState, "", window.location.href);
      window.alert(
        "Back navigation is disabled during this reading test. Leaving the test screen may invalidate your attempt."
      );
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isTestInteractive, testData?.id]);

  function updateAnswer(key, value) {
    setAnswers((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function startResizing(event) {
    setIsDragging(true);
    document.body.style.userSelect = "none";
    event.preventDefault();
  }

  if (!startedAtMs) {
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
                This reading test has been counted as a non-complete attempt with a
                band score of 0.
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
                  onClick={() => router.push("/student/mock-exams/reading")}
                >
                  Back to Reading Tests
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
              Reading Submission
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {isSubmitting
                ? "Submitting your reading test..."
                : submissionError
                  ? "Submission needs attention"
                  : "Reading test submitted"}
            </h1>
            <p className="text-base leading-7 text-base-content/75">
              {isSubmitting
                ? "The timer has ended and your reading answers are being saved to your results."
                : submissionError
                  ? submissionError
                  : "Your reading answers have been saved to your results."}
            </p>
            <div className="flex gap-3 pt-2">
              {submissionError ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void submitReadingAttempt("retry_after_failure")}
                >
                  Retry Submission
                </button>
              ) : null}
              {!isSubmitting ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => router.push("/student/mock-exams/reading")}
                >
                  Back to Reading Tests
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
        backgroundColor: "#111827",
        color: "hsl(var(--bc, 220 13% 91%))",
      }}
    >
      {hasSections ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "row",
          }}
        >
          <div
            style={{
              width: `calc((100% - ${DIVIDER_WIDTH}px) * ${leftWidth / 100})`,
              height: "100%",
              overflowY: "auto",
              overflowX: "hidden",
              backgroundColor: "#1f2937",
              borderRight: "1px solid rgba(255, 255, 255, 0.12)",
              padding: "24px",
              flexShrink: 0,
              cursor: "default",
            }}
          >
            <div className="space-y-8">
              <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
                      Student Preview
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                      {testData?.name || "Reading Test"}
                    </h1>
                  </div>

                  <div className="rounded-2xl border border-base-300 bg-base-200 px-4 py-3 text-right text-base-content">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/45">
                      Time Remaining
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight">
                      {formatCountdown(timeRemaining)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-6 text-base-content">
                  Leaving this reading test screen, switching tabs, or opening another
                  app will flag this attempt as cheating and score it 0 after the 1
                  minute start grace period ends.
                </div>

                {wasRestoredFromDraft ? (
                  <div className="mt-4 rounded-2xl border border-info/30 bg-info/10 px-4 py-3 text-sm leading-6 text-base-content">
                    Your reading attempt was restored after a refresh or reconnect.
                    The timer kept running and your answers were recovered locally.
                  </div>
                ) : null}

                {resumeCount >= 1 ? (
                  <div className="mt-4 rounded-2xl border border-base-300 bg-base-200/50 px-4 py-3 text-sm leading-6 text-base-content">
                    Resume count for this attempt: {resumeCount}
                  </div>
                ) : null}
              </section>

              {sections.map((section, sectionIndex) => (
                <article
                  key={`passage-section-${sectionIndex}`}
                  className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
                    Section {section.sectionNumber || sectionIndex + 1}
                  </p>
                  {section.title ? (
                    <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight text-base-content">
                      {section.title}
                    </h2>
                  ) : null}
                  {section.subtitle ? (
                    <p className="mt-3 text-lg font-medium leading-8 text-base-content/75">
                      {section.subtitle}
                    </p>
                  ) : null}
                  <div className="mt-6 space-y-4">
                    {renderPassageParagraphs(section.passage)}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize reading panels"
            aria-valuemin={MIN_LEFT_WIDTH}
            aria-valuemax={MAX_LEFT_WIDTH}
            aria-valuenow={Math.round(leftWidth)}
            onMouseDown={startResizing}
            style={{
              width: `${DIVIDER_WIDTH}px`,
              height: "100%",
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

          <div
            style={{
              width: `calc((100% - ${DIVIDER_WIDTH}px) * ${rightWidth / 100})`,
              height: "100%",
              overflowY: "auto",
              overflowX: "hidden",
              backgroundColor: "#374151",
              padding: "24px",
              flexShrink: 0,
              cursor: "default",
            }}
          >
            <div className="space-y-8">
              {sections.map((section, sectionIndex) => (
                <section key={`question-section-${sectionIndex}`} className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
                      Section {section.sectionNumber || sectionIndex + 1}
                    </p>
                    {section.title ? (
                      <h2 className="mt-2 text-xl font-semibold tracking-tight">
                        {section.title}
                      </h2>
                    ) : null}
                    {section.subtitle ? (
                      <p className="mt-2 text-sm leading-6 text-base-content/70">
                        {section.subtitle}
                      </p>
                    ) : null}
                  </div>

                  {section.questions.map((question, questionIndex) => {
                    if (question.type === "TABLE") {
                      return (
                        <div key={`question-${sectionIndex}-${questionIndex}`}>
                          {renderTableQuestion(question, answers, updateAnswer)}
                        </div>
                      );
                    }

                    if (question.type === "TFNG" && Array.isArray(question.questions)) {
                      return (
                        <div key={`question-${sectionIndex}-${questionIndex}`}>
                          {renderTfngGroup(question, answers, updateAnswer)}
                        </div>
                      );
                    }

                    if (
                      question.type === "MULTIPLE_CHOICE" &&
                      Array.isArray(question.questions)
                    ) {
                      return (
                        <div key={`question-${sectionIndex}-${questionIndex}`}>
                          {renderMultipleChoiceQuestion(
                            question,
                            answers,
                            updateAnswer
                          )}
                        </div>
                      );
                    }

                    if (
                      question.type === "MATCHING_INFORMATION" &&
                      Array.isArray(question.questions)
                    ) {
                      return (
                        <div key={`question-${sectionIndex}-${questionIndex}`}>
                          {renderMatchingInformationQuestion(
                            question,
                            answers,
                            updateAnswer
                          )}
                        </div>
                      );
                    }

                    if (
                      question.type === "SUMMARY_COMPLETION" &&
                      Array.isArray(question.questions)
                    ) {
                      return (
                        <div key={`question-${sectionIndex}-${questionIndex}`}>
                          {renderSummaryCompletionQuestion(
                            question,
                            answers,
                            updateAnswer
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={`question-${sectionIndex}-${questionIndex}`}>
                        {renderFillBlankQuestion(
                          question,
                          answers[question.number || `${sectionIndex}-${questionIndex}`] || "",
                          (value) =>
                            updateAnswer(
                              question.number || `${sectionIndex}-${questionIndex}`,
                              value
                            )
                        )}
                      </div>
                    );
                  })}
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
            <p className="text-base-content/70">
              {questions.length > 0
                ? "Questions are available, but no reading sections were provided yet."
                : "This test has no sections yet."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

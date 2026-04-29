"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  MusicalNoteIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  deleteListeningTest,
  listListeningTests,
  saveListeningTest,
} from "../../../../lib/tests/listening-tests";

// Get today's date
function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

// Make unique ids
function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Free preview link
function revokePreviewUrl(url) {
  if (typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

// Limit async wait
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

// Show created date
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

// Color difficulty badge
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

// Build page theme
function getListeningTheme(themeMode = "dark") {
  const isLightMode = themeMode === "light";

  return {
    isLightMode,
    actionButton: {
      backgroundColor: "#007F73",
      hoverBackgroundColor: "#00695f",
      color: "#ffffff",
    },
    inputClass: isLightMode
      ? "input border-[#bfd0ea] bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#7aa2d6] focus:outline-none"
      : "input border-[#233447] bg-[#1b2a3a] px-4 text-white placeholder:text-white/45 focus:border-[#3b5168] focus:outline-none",
    selectClass: isLightMode
      ? "select w-full border-[#bfd0ea] bg-white px-4 text-slate-900 focus:border-[#7aa2d6] focus:outline-none"
      : "select w-full border-[#233447] bg-[#1b2a3a] px-4 text-white focus:border-[#3b5168] focus:outline-none",
    textareaClass: isLightMode
      ? "textarea border-[#bfd0ea] bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[#7aa2d6] focus:outline-none"
      : "textarea border-[#233447] bg-[#1b2a3a] px-4 py-3 text-white placeholder:text-white/45 focus:border-[#3b5168] focus:outline-none",
    fileInputClass: isLightMode
      ? "file-input w-full border-[#bfd0ea] bg-white text-slate-900 file:bg-[#edf4ff] file:text-slate-700 focus:border-[#7aa2d6] focus:outline-none"
      : "file-input w-full border-[#233447] bg-[#1b2a3a] text-white file:bg-[#18232f] file:text-white focus:border-[#3b5168] focus:outline-none",
    selectStyle: isLightMode
      ? { backgroundColor: "#ffffff", color: "#0f172a" }
      : { backgroundColor: "#1b2a3a", color: "#ffffff" },
    overlayStyle: {
      position: "fixed",
      inset: 0,
      zIndex: 9998,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "16px",
      overflowY: "auto",
      backgroundColor: isLightMode ? "rgba(148, 163, 184, 0.35)" : "rgba(0, 0, 0, 0.72)",
      backdropFilter: "blur(6px)",
    },
    alertOverlayStyle: {
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      backgroundColor: isLightMode ? "rgba(148, 163, 184, 0.35)" : "rgba(0, 0, 0, 0.72)",
      backdropFilter: "blur(6px)",
    },
    shellClass: isLightMode
      ? "rounded-3xl border border-[#bfd0ea] bg-[#f8fbff] text-slate-900 shadow-2xl"
      : "rounded-3xl border border-[#233447] bg-[#18232f] text-white shadow-2xl",
    borderClass: isLightMode ? "border-[#bfd0ea]" : "border-[#233447]",
    softNoticeClass: isLightMode
      ? "rounded-2xl bg-[#edf4ff] px-5 py-4 text-sm leading-7 text-slate-600"
      : "rounded-2xl bg-white/5 px-5 py-4 text-sm leading-7 text-white/75",
    surfaceClass: isLightMode
      ? "rounded-2xl bg-[#eef5ff] p-5 shadow-sm md:p-6"
      : "rounded-2xl bg-[#111a24] p-5 shadow-sm md:p-6",
    innerSurfaceClass: isLightMode
      ? "rounded-2xl bg-[#e6f0ff] p-4"
      : "rounded-2xl bg-[#0f1720] p-4",
    cardClass: isLightMode
      ? "rounded-2xl border border-[#bfd0ea] bg-white p-4"
      : "rounded-2xl border border-[#233447] bg-[#111a24] p-4",
    tableWrapClass: isLightMode
      ? "overflow-x-auto rounded-2xl border border-[#bfd0ea] bg-[#eef5ff] p-4"
      : "overflow-x-auto rounded-2xl border border-[#233447] bg-[#0f1720] p-4",
    tableHeaderCellClass: isLightMode
      ? "border border-[#bfd0ea] bg-[#f8fbff] p-3 align-top"
      : "border border-[#233447] bg-[#18232f] p-3 align-top",
    tableCellClass: isLightMode
      ? "border border-[#bfd0ea] p-3 align-top"
      : "border border-[#233447] p-3 align-top",
    mutedTextClass: isLightMode ? "text-slate-500" : "text-white/60",
    subtleTextClass: isLightMode ? "text-slate-600" : "text-white/80",
    labelTextClass: isLightMode ? "text-slate-800" : "text-white",
    destructiveButtonClass: isLightMode
      ? "btn btn-sm btn-square rounded-xl border border-[#d97777] bg-transparent text-error hover:border-[#dc2626] hover:bg-error/10"
      : "btn btn-sm btn-square rounded-xl border border-[#5b2a38] bg-transparent text-error hover:border-[#7a3247] hover:bg-error/10",
    utilityButtonClass: isLightMode
      ? "btn rounded-xl border-[#94a3b8] bg-transparent px-5 text-slate-700 hover:border-[#64748b] hover:bg-slate-200/60"
      : "btn rounded-xl border-[#3b5168] bg-transparent px-5 text-white hover:border-[#4a647f] hover:bg-white/5",
    modalCloseButtonClass: isLightMode
      ? "btn btn-ghost btn-square rounded-xl text-slate-700 hover:bg-slate-200/70"
      : "btn btn-ghost btn-square rounded-xl text-white hover:bg-white/10",
  };
}

const listeningQuestionTypes = [
  "Multiple Choice",
  "True / False / Not Given (or Yes / No / Not Given)",
  "All Matching Activities",
  "Table Completion",
];

const answerTypeOptions = {
  TFNG: {
    label: "T / F / NG",
    values: ["TRUE", "FALSE", "NOT GIVEN"],
  },
  YNNG: {
    label: "Y / N / NG",
    values: ["YES", "NO", "NOT GIVEN"],
  },
};

// New TFNG row
function createEmptyTfngQuestion(answerType = "TFNG") {
  return {
    id: createId(),
    answerType,
    questionNumber: "",
    prompt: "",
    correctAnswer: answerTypeOptions[answerType]?.values?.[0] || "TRUE",
  };
}

// New choice row
function createEmptyMultipleChoiceQuestion() {
  return {
    id: createId(),
    questionNumber: "",
    prompt: "",
    options: [
      { label: "A", text: "" },
      { label: "B", text: "" },
      { label: "C", text: "" },
      { label: "D", text: "" },
    ],
    correctAnswer: "",
    correctAnswers: [],
  };
}

// New table row
function createEmptyTableCompletionRow(columnCount = 2) {
  return {
    id: createId(),
    cells: Array.from({ length: Math.max(1, columnCount) }, () => ""),
  };
}

// Split nonempty lines
function parseNonEmptyLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

// New matching row
function createEmptyMatchingInformationQuestion() {
  return {
    id: createId(),
    questionNumber: "",
    prompt: "",
    correctAnswer: "",
  };
}

// Parse matching lines
function parseMatchingQuestionLines(value) {
  return parseNonEmptyLines(value).map((line, index) => {
    const match = line.match(/^(\d+)\s+(.+)$/);

    if (match) {
      return {
        id: `${createId()}-${index}`,
        questionNumber: match[1],
        prompt: match[2].trim(),
      };
    }

    return {
      id: `${createId()}-${index}`,
      questionNumber: "",
      prompt: line,
    };
  });
}

// Next question number
function getNextListeningQuestionNumber(questions, existingQuestionNumbers = []) {
  const allNumbers = [
    ...existingQuestionNumbers,
    ...questions.map((question) => Number(question.questionNumber)),
  ].filter((value) => Number.isInteger(value) && value >= 1 && value <= 40);

  if (allNumbers.length === 0) {
    return "1";
  }

  return String(Math.min(40, Math.max(...allNumbers) + 1));
}

// First group number
function getQuestionGroupFirstNumber(questionGroup) {
  if (!Array.isArray(questionGroup?.items) || questionGroup.items.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const firstNumber = Number(questionGroup.items[0]?.questionNumber);
  return Number.isInteger(firstNumber) ? firstNumber : Number.POSITIVE_INFINITY;
}

// Sort by number
function sortQuestionItemsByNumber(items = []) {
  return [...items].sort((leftItem, rightItem) => {
    const leftNumber = Number(leftItem?.questionNumber);
    const rightNumber = Number(rightItem?.questionNumber);

    if (!Number.isInteger(leftNumber) && !Number.isInteger(rightNumber)) {
      return 0;
    }

    if (!Number.isInteger(leftNumber)) {
      return 1;
    }

    if (!Number.isInteger(rightNumber)) {
      return -1;
    }

    return leftNumber - rightNumber;
  });
}

// Clean cell preview
function buildTableCellPreviewText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

// Flatten question items
function flattenSectionQuestionItems(questionGroups = []) {
  return questionGroups.flatMap((questionGroup) => {
    const sortedItems = sortQuestionItemsByNumber(questionGroup.items);

    return sortedItems.map((item) => ({
      ...item,
      groupId: questionGroup.id,
      questionType: questionGroup.type,
      questionTypeTitle:
        questionGroup.type === "MATCHING_INFORMATION"
          ? "All Matching Activities"
          :
        questionGroup.type === "MULTIPLE_CHOICE"
          ? "Multiple Choice"
          : questionGroup.type === "TABLE"
            ? "Table Completion"
            : item.answerType === "YNNG"
              ? "Yes / No / Not Given"
              : "True / False / Not Given",
      sourceText:
        questionGroup.type === "MATCHING_INFORMATION"
          ? (Array.isArray(questionGroup.possibleAnswers)
              ? questionGroup.possibleAnswers
              : []
            ).join(" | ")
          : questionGroup.type === "MULTIPLE_CHOICE"
          ? questionGroup.sourceText || ""
          : questionGroup.type === "TABLE"
            ? (questionGroup.tableRows || [])
                .flatMap((row) => (Array.isArray(row?.cells) ? row.cells : []))
                .join(" ")
            : "",
    }));
  });
}

// Parse choice text
function parseMultipleChoiceQuestions(sourceText) {
  const lines = String(sourceText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks = [];
  let currentBlock = null;

  lines.forEach((line) => {
    const questionMatch = line.match(/^(\d+)[\.\)]?\s+(.+)$/);

    if (questionMatch) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }

      currentBlock = {
        questionNumber: questionMatch[1],
        promptLines: [questionMatch[2].trim()],
        optionLines: [],
      };
      return;
    }

    if (!currentBlock) {
      return;
    }

    const optionMatch = line.match(/^([A-E])[\.\)]?\s+(.+)$/i);

    if (optionMatch) {
      currentBlock.optionLines.push({
        label: optionMatch[1].toUpperCase(),
        text: optionMatch[2].trim(),
      });
      return;
    }

    if (currentBlock.optionLines.length === 0) {
      currentBlock.promptLines.push(line);
      return;
    }

    const lastOption = currentBlock.optionLines[currentBlock.optionLines.length - 1];
    lastOption.text = `${lastOption.text} ${line}`.trim();
  });

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks.map((block, index) => ({
    id: `${createId()}-${index}`,
    questionNumber: block.questionNumber,
    prompt: block.promptLines.join(" ").trim(),
    options: block.optionLines,
    correctAnswer: "",
    correctAnswers: [],
  }));
}

// Find table blanks
function extractTableCompletionQuestions(tableRows = [], previousQuestions = []) {
  const extractedQuestions = [];

  tableRows.forEach((row, rowIndex) => {
    const cells = Array.isArray(row?.cells) ? row.cells : [];

    cells.forEach((cell, cellIndex) => {
      const matches = [...String(cell || "").matchAll(/(\d+)\s*\.{5,}/g)];

      matches.forEach((match, blankOrder) => {
        const questionNumber = String(match[1] || "").trim();
        const matchingPreviousQuestion =
          previousQuestions.find(
            (previousQuestion) =>
              String(previousQuestion.questionNumber).trim() === questionNumber
          ) ||
          previousQuestions.find(
            (previousQuestion) =>
              previousQuestion.rowId === row.id &&
              Number(previousQuestion.cellIndex) === cellIndex &&
              Number(previousQuestion.blankOrder) === blankOrder
          );

        extractedQuestions.push({
          id: matchingPreviousQuestion?.id || createId(),
          questionNumber,
          correctAnswer: matchingPreviousQuestion?.correctAnswer || "",
          rowId: row.id,
          rowIndex,
          cellIndex,
          blankOrder,
          prompt: buildTableCellPreviewText(cell),
        });
      });
    });
  });

  return extractedQuestions;
}

// Main action button
function CreatorActionButton({ onClick, children, themeMode }) {
  const theme = getListeningTheme(themeMode);

  return (
    <button
      type="button"
      className="btn gap-2 border-0 font-bold text-white"
      style={{
        backgroundColor: theme.actionButton.backgroundColor,
        color: theme.actionButton.color,
      }}
      onClick={onClick}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor =
          theme.actionButton.hoverBackgroundColor;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor =
          theme.actionButton.backgroundColor;
      }}
    >
      {children}
    </button>
  );
}

// Show test card
function ListeningTestCard({ test, onDelete, onEdit }) {
  const sectionQuestionCount = Array.isArray(test.sections)
    ? test.sections.reduce(
        (count, section) =>
          count +
          (Array.isArray(section.questions)
            ? section.questions.reduce(
                (sectionCount, group) =>
                  sectionCount +
                  (Array.isArray(group.questions) ? group.questions.length : 0),
                0
              )
            : 0),
        0
      )
    : 0;
  const audioCount = Array.isArray(test.sections)
    ? test.sections.filter((section) => section.audioUrl || section.audioPath).length
    : 0;

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

        <p className="text-sm text-base-content/65">
          Questions saved: {sectionQuestionCount}
        </p>

        <p className="text-sm text-base-content/65">
          Audio parts attached: {audioCount}/4
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

// Show test editor
function ListeningTestPanel({
  formValues,
  questionTypeSelections,
  partAudioNames,
  partAudioPreviewUrls,
  isSaving,
  saveProgress,
  errorMessage,
  themeMode,
  onClose,
  onChange,
  onAudioChange,
  onAddQuestionType,
  onDeleteListeningQuestionItem,
  onSave,
}) {
  const [confirmState, setConfirmState] = useState(null);
  const [isPortalReady, setIsPortalReady] = useState(false);
  const theme = getListeningTheme(themeMode);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  return (
    <>
      <section className="relative z-10 w-full rounded-3xl border border-base-300 bg-base-100 shadow-xl">
        <div className="flex items-center justify-between border-b border-base-300 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
              IELTS Listening
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Create Listening Test
            </h2>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-square rounded-xl"
            aria-label="Close listening test creator"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6">
          {isSaving ? (
            <div className="rounded-2xl border border-info/30 bg-info/10 px-5 py-4 text-sm font-medium text-info-content">
              {saveProgress.sectionNumber
                ? `Uploading Part ${saveProgress.sectionNumber} audio... ${saveProgress.progress}%`
                : "Saving listening test..."}
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
                onChange={(event) => onChange("testDifficulty", event.target.value)}
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

          {[1, 2, 3, 4].map((sectionNumber) => {
            const titleField = `part${sectionNumber}Title`;
            const infoField = `part${sectionNumber}Info`;
            const questionsField = `part${sectionNumber}Questions`;
            const sectionQuestions = Array.isArray(formValues[questionsField])
              ? formValues[questionsField]
              : [];
            const sortedSectionQuestions = [...sectionQuestions].sort(
              (leftGroup, rightGroup) =>
                getQuestionGroupFirstNumber(leftGroup) -
                getQuestionGroupFirstNumber(rightGroup)
            );
            const orderedQuestionItems = sortQuestionItemsByNumber(
              flattenSectionQuestionItems(sortedSectionQuestions)
            );

            return (
              <section
                key={`listening-section-${sectionNumber}`}
                className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm"
              >
                <div className="mb-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
                    Part {sectionNumber}
                  </p>
                  <h3 className="text-xl font-semibold">
                    Listening Part {sectionNumber}
                  </h3>
                </div>

                <div className="grid gap-5">
                  <label className="form-control">
                    <span className="label-text mb-2 font-medium">
                      Part {sectionNumber} - Title
                    </span>
                    <input
                      type="text"
                      className={`${theme.inputClass} w-full text-lg font-semibold`}
                      placeholder={`Enter the title for Listening Part ${sectionNumber}`}
                      value={formValues[titleField]}
                      onChange={(event) => onChange(titleField, event.target.value)}
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-2 font-medium">
                      Part {sectionNumber} - Information
                    </span>
                    <textarea
                      className={`${theme.textareaClass} min-h-32 w-full leading-7`}
                      placeholder={`Enter the instructions, notes, or setup text for Part ${sectionNumber}.`}
                      value={formValues[infoField]}
                      onChange={(event) => onChange(infoField, event.target.value)}
                    />
                  </label>

                  <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/30 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <MusicalNoteIcon className="h-5 w-5 text-[#007F73]" />
                      <p className="font-medium">
                        Part {sectionNumber} - Upload audio
                      </p>
                    </div>

                    <input
                      type="file"
                      accept="audio/*"
                      className={theme.fileInputClass}
                      onChange={(event) => onAudioChange(sectionNumber, event)}
                    />

                    <p
                      className={`mt-3 text-sm ${
                        partAudioNames[sectionNumber] ||
                        partAudioPreviewUrls[sectionNumber]
                          ? "text-base-content/65"
                          : "font-bold text-error"
                      }`}
                    >
                      {partAudioNames[sectionNumber] ||
                        (partAudioPreviewUrls[sectionNumber]
                          ? "Existing audio attached"
                          : "No audio selected")}
                    </p>

                    {partAudioPreviewUrls[sectionNumber] ? (
                      <audio
                        className="mt-4 w-full"
                        controls
                        src={partAudioPreviewUrls[sectionNumber]}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/30 p-4">
                    <p className="mb-3 font-medium">
                      Part {sectionNumber} - Add question type
                    </p>
                    <label className="form-control max-w-md">
                      <span className="sr-only">
                        Select question type for part {sectionNumber}
                      </span>
                      <select
                        className={`${theme.selectClass} max-w-md font-medium`}
                        style={theme.selectStyle}
                        value={questionTypeSelections[sectionNumber] || ""}
                        onChange={(event) => {
                          const nextQuestionType = event.target.value;

                          if (!nextQuestionType) {
                            return;
                          }

                          onAddQuestionType(sectionNumber, nextQuestionType);
                        }}
                      >
                        <option value="" disabled>
                          Select question type
                        </option>
                        {listeningQuestionTypes.map((questionType) => (
                          <option
                            key={`part-${sectionNumber}-${questionType}`}
                            value={questionType}
                          >
                            {questionType}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {orderedQuestionItems.length > 0 ? (
                    <div className="space-y-4 rounded-2xl border border-base-300 bg-base-200/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">Saved Questions</p>
                        <div className="badge badge-outline">
                          {orderedQuestionItems.length} questions
                        </div>
                      </div>

                      <div className="space-y-3">
                        {orderedQuestionItems.map((item) => (
                          <article
                            key={item.id}
                            className="rounded-xl border border-base-300 bg-base-100 p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium text-base-content/60">
                                  Question {item.questionNumber || "Unassigned"}
                                </p>
                                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-base-content/45">
                                  {item.questionTypeTitle}
                                </p>
                              </div>
                              <button
                                type="button"
                                className={theme.destructiveButtonClass}
                                aria-label={`Delete question ${item.questionNumber || ""}`}
                                onClick={() =>
                                  setConfirmState({
                                    title: "Delete Question",
                                    message: `Are you sure you want to delete Question ${
                                      item.questionNumber || "?"
                                    }?`,
                                    confirmLabel: "Delete",
                                    onConfirm: () => {
                                      onDeleteListeningQuestionItem(
                                        sectionNumber,
                                        item.groupId,
                                        item.id
                                      );
                                      setConfirmState(null);
                                    },
                                  })
                                }
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>

                            {item.questionType === "MATCHING_INFORMATION" ? (
                              <>
                                <p className="mt-2 leading-7">
                                  {item.prompt || "No question text added yet."}
                                </p>
                                <p className="mt-3 text-sm font-medium text-primary">
                                  Correct match: {item.correctAnswer || "Not set"}
                                </p>
                              </>
                            ) : item.questionType === "MULTIPLE_CHOICE" ? (
                              <>
                                <p className="mt-2 leading-7">
                                  {item.prompt || "No question text added yet."}
                                </p>
                                <div className="mt-3 space-y-1 text-sm text-base-content/75">
                                  {(Array.isArray(item.options) ? item.options : []).map((option) => (
                                    <p key={`${item.id}-${option.label}`}>
                                      {option.label}. {option.text}
                                    </p>
                                  ))}
                                </div>
                                <p className="mt-3 text-sm font-medium text-primary">
                                  Correct answer: {Array.isArray(item.correctAnswers) &&
                                  item.correctAnswers.length > 0
                                    ? item.correctAnswers.join(", ")
                                    : item.correctAnswer || "Not set"}
                                </p>
                              </>
                            ) : item.questionType === "TABLE" ? (
                              <>
                                <p className="mt-2 text-sm leading-7 text-base-content/70">
                                  {item.prompt
                                    ? `${item.prompt.slice(0, 180)}${
                                        item.prompt.length > 180 ? "..." : ""
                                      }`
                                    : "No table cell text added yet."}
                                </p>
                                <p className="mt-3 text-sm font-medium text-primary">
                                  Exact answer: {item.correctAnswer || "Not set"}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="mt-2 leading-7">
                                  {item.prompt || "No question text added yet."}
                                </p>
                                <p className="mt-3 text-sm font-medium text-primary">
                                  {answerTypeOptions[item.answerType || "TFNG"]?.label ||
                                    "T / F / NG"}{" "}
                                  : {item.correctAnswer}
                                </p>
                              </>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 border-t border-base-300 px-6 py-5">
          {errorMessage ? (
            <p className="mr-auto self-center text-sm font-medium text-error">
              {errorMessage}
            </p>
          ) : null}
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <CreatorActionButton onClick={onSave} themeMode={themeMode}>
            {isSaving ? "Saving..." : "Save Test"}
          </CreatorActionButton>
        </div>
      </section>

      {isPortalReady && confirmState
        ? createPortal(
            <div style={theme.alertOverlayStyle}>
              <section className={`w-full max-w-md p-6 ${theme.shellClass}`}>
                <h3 className="text-xl font-semibold tracking-tight">
                  {confirmState.title}
                </h3>
                <p className={`mt-3 leading-7 ${theme.subtleTextClass}`}>
                  {confirmState.message}
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="btn px-5"
                    onClick={() => setConfirmState(null)}
                  >
                    Cancel
                  </button>
                  <CreatorActionButton
                    onClick={confirmState.onConfirm}
                    themeMode={themeMode}
                  >
                    {confirmState.confirmLabel}
                  </CreatorActionButton>
                </div>
              </section>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

// Show TFNG dialog
function TfngQuestionDialog({
  sectionNumber,
  questions,
  errorMessage,
  themeMode,
  onChangeQuestion,
  onAddQuestion,
  onRemoveQuestion,
  onClose,
  onSave,
}) {
  const [isPortalReady, setIsPortalReady] = useState(false);
  const theme = getListeningTheme(themeMode);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  if (!isPortalReady) {
    return null;
  }

  return createPortal(
    <div style={theme.overlayStyle}>
      <section className={`my-auto max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto ${theme.shellClass}`}>
        <div className={`flex items-center justify-between border-b px-6 py-5 md:px-7 ${theme.borderClass}`}>
          <div>
            <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${theme.mutedTextClass}`}>
              Part {sectionNumber}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              True / False / Not Given
            </h2>
          </div>

          <button
            type="button"
            className={theme.modalCloseButtonClass}
            aria-label="Close TFNG question dialog"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6 md:px-7 md:py-7">
          <div className={theme.softNoticeClass}>
            Add one or more listening questions for this part. Use the answer type selector to switch between T/F/NG and Y/N/NG.
          </div>

          {questions.map((question, index) => (
            <section key={question.id} className={`mt-1 ${theme.surfaceClass}`}>
              <div className="mb-6 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">
                  Question {index + 1}
                </h3>
                {questions.length > 1 ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                    onClick={() => onRemoveQuestion(question.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="grid gap-6 pt-1">
                <label className="form-control max-w-sm">
                  <span className={`label-text mb-2 font-medium ${theme.labelTextClass}`}>
                    Select Answer Type
                  </span>
                  <select
                    className={`${theme.selectClass} max-w-sm appearance-none`}
                    style={theme.selectStyle}
                    value={question.answerType || "TFNG"}
                    onChange={(event) =>
                      onChangeQuestion(question.id, "answerType", event.target.value)
                    }
                  >
                    {Object.entries(answerTypeOptions).map(([value, option]) => (
                      <option key={`${question.id}-${value}`} value={value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-control max-w-sm">
                  <span className="label-text mb-2 font-medium">
                    Question Number
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    className={`${theme.inputClass} w-36 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                    placeholder="1-40"
                    value={question.questionNumber}
                    onChange={(event) =>
                      onChangeQuestion(question.id, "questionNumber", event.target.value)
                    }
                  />
                </label>

                <label className="form-control">
                  <span className="label-text mb-2 font-medium">
                    Question Text
                  </span>
                  <textarea
                    className={`${theme.textareaClass} min-h-32 w-full leading-7`}
                    placeholder="Enter one question statement here."
                    value={question.prompt}
                    onChange={(event) =>
                      onChangeQuestion(question.id, "prompt", event.target.value)
                    }
                  />
                </label>

                <label className="form-control max-w-sm">
                  <span className="label-text mb-2 font-medium">
                    Select Answer
                  </span>
                  <select
                    className={`${theme.selectClass} max-w-sm appearance-none`}
                    style={theme.selectStyle}
                    value={question.correctAnswer}
                    onChange={(event) =>
                      onChangeQuestion(question.id, "correctAnswer", event.target.value)
                    }
                  >
                    {(answerTypeOptions[question.answerType || "TFNG"]?.values || []).map((option) => (
                      <option key={`${question.id}-${option}`} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          ))}

          <div className="pt-4">
            <button
              type="button"
              className={theme.utilityButtonClass}
              onClick={onAddQuestion}
            >
              Add Another Question
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3 px-6 py-5 md:px-7">
          {errorMessage ? (
            <p className="mr-auto self-center text-sm font-medium text-error">
              {errorMessage}
            </p>
          ) : null}
          <button type="button" className="btn px-5" onClick={onClose}>
            Cancel
          </button>
          <CreatorActionButton onClick={onSave} themeMode={themeMode}>
            Save Questions
          </CreatorActionButton>
        </div>
      </section>
    </div>,
    document.body
  );
}

// Show matching dialog
function MatchingInformationDialog({
  sectionNumber,
  questions,
  instructions,
  questionsText,
  answersText,
  errorMessage,
  themeMode,
  onChangeInstructions,
  onChangeQuestionsText,
  onChangeAnswersText,
  onChangeQuestion,
  onRemoveQuestion,
  onClose,
  onSave,
}) {
  const possibleAnswers = parseNonEmptyLines(answersText);
  const [confirmState, setConfirmState] = useState(null);
  const [isPortalReady, setIsPortalReady] = useState(false);
  const theme = getListeningTheme(themeMode);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  if (!isPortalReady) {
    return null;
  }

  return createPortal(
    <div style={theme.overlayStyle}>
      <section className={`my-auto max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto ${theme.shellClass}`}>
        <div className={`flex items-center justify-between border-b px-6 py-5 md:px-7 ${theme.borderClass}`}>
          <div>
            <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${theme.mutedTextClass}`}>
              Part {sectionNumber}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Matching Information
            </h2>
          </div>

          <button
            type="button"
            className={theme.modalCloseButtonClass}
            aria-label="Close matching information dialog"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6 md:px-7 md:py-7">
          <div className={theme.softNoticeClass}>
            Add the question lines in one field and the selectable answers in the other. The builder will generate the matching table underneath, just like reading.
          </div>

          <section className={`mt-1 ${theme.surfaceClass}`}>
            <div className="grid gap-6 pt-1">
              <label className="form-control">
                <span className={`label-text mb-2 font-medium ${theme.labelTextClass}`}>
                  Instructions
                </span>
                <textarea
                  className={`${theme.textareaClass} min-h-28 w-full leading-7`}
                  placeholder="Enter the instructions students should see, for example: Choose FIVE answers from the box and write the correct letter, A-G, next to Questions 26-30."
                  value={instructions}
                  onChange={(event) => onChangeInstructions(event.target.value)}
                />
              </label>

              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <label className="form-control">
                  <span className={`label-text mb-2 font-medium ${theme.labelTextClass}`}>
                    Field 1: Questions
                  </span>
                  <textarea
                    className={`${theme.textareaClass} min-h-56 w-full leading-7`}
                    placeholder={`26 structure\n27 eye contact\n28 body language\n29 choice of words\n30 handouts`}
                    value={questionsText}
                    onChange={(event) => onChangeQuestionsText(event.target.value)}
                  />
                </label>

                <label className="form-control">
                  <span className={`label-text mb-2 font-medium ${theme.labelTextClass}`}>
                    Field 2: Answers that can be selected
                  </span>
                  <textarea
                    className={`${theme.textareaClass} min-h-56 w-full leading-7`}
                    placeholder={`A lacked a conclusion\nB useful in the future\nC not enough\nD sometimes distracting\nE showed originality\nF covered a wide range\nG not too technical`}
                    value={answersText}
                    onChange={(event) => onChangeAnswersText(event.target.value)}
                  />
                </label>
              </div>

              <div className={theme.innerSurfaceClass}>
                <table className="table">
                  <thead>
                    <tr className={theme.mutedTextClass}>
                      <th className="w-24">Q No.</th>
                      <th>Question</th>
                      <th className="w-72">Correct Answer</th>
                      <th className="w-44">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((question) => (
                      <tr key={question.id}>
                        <td className="align-top">
                          <input
                            type="number"
                            min="1"
                            max="40"
                            className={`${theme.inputClass} w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                            value={question.questionNumber}
                            onChange={(event) =>
                              onChangeQuestion(
                                question.id,
                                "questionNumber",
                                event.target.value
                              )
                            }
                          />
                        </td>
                        <td className="align-top">
                          <input
                            type="text"
                            className={`${theme.inputClass} w-full`}
                            value={question.prompt}
                            onChange={(event) =>
                              onChangeQuestion(
                                question.id,
                                "prompt",
                                event.target.value
                              )
                            }
                          />
                        </td>
                        <td className="align-top">
                          <select
                            className={`${theme.selectClass} w-full appearance-none`}
                            style={theme.selectStyle}
                            value={question.correctAnswer}
                            onChange={(event) =>
                              onChangeQuestion(
                                question.id,
                                "correctAnswer",
                                event.target.value
                              )
                            }
                          >
                            <option value="">Select answer</option>
                            {possibleAnswers.map((option) => (
                              <option key={`${question.id}-${option}`} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="align-top">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={theme.destructiveButtonClass}
                              aria-label={`Delete question ${question.questionNumber || ""}`}
                              onClick={() =>
                                setConfirmState({
                                  title: "Delete Question",
                                  message: `Are you sure you want to delete Question ${
                                    question.questionNumber || "?"
                                  }?`,
                                  confirmLabel: "Delete",
                                  onConfirm: () => {
                                    onRemoveQuestion(question.id);
                                    setConfirmState(null);
                                  },
                                })
                              }
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-4 flex justify-end gap-3 px-6 py-5 md:px-7">
          {errorMessage ? (
            <p className="mr-auto self-center text-sm font-medium text-error">
              {errorMessage}
            </p>
          ) : null}
          <button type="button" className="btn px-5" onClick={onClose}>
            Cancel
          </button>
          <CreatorActionButton onClick={onSave} themeMode={themeMode}>
            Save Questions
          </CreatorActionButton>
        </div>
      </section>

      {confirmState ? (
        <div style={theme.alertOverlayStyle}>
          <section className={`w-full max-w-md p-6 ${theme.shellClass}`}>
            <h3 className="text-xl font-semibold tracking-tight">
              {confirmState.title}
            </h3>
            <p className={`mt-3 leading-7 ${theme.subtleTextClass}`}>
              {confirmState.message}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="btn px-5"
                onClick={() => setConfirmState(null)}
              >
                Cancel
              </button>
              <CreatorActionButton
                onClick={confirmState.onConfirm}
                themeMode={themeMode}
              >
                {confirmState.confirmLabel}
              </CreatorActionButton>
            </div>
          </section>
        </div>
      ) : null}
    </div>,
    document.body
  );
}

// Show choice dialog
function MultipleChoiceDialog({
  sectionNumber,
  instructions,
  sourceText,
  questions,
  errorMessage,
  themeMode,
  onChangeInstructions,
  onChangeText,
  onAddQuestion,
  onChangeQuestionField,
  onChangeQuestionOption,
  onChangeQuestionAnswer,
  onClose,
  onSave,
}) {
  const [isPortalReady, setIsPortalReady] = useState(false);
  const theme = getListeningTheme(themeMode);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  if (!isPortalReady) {
    return null;
  }

  return createPortal(
    <div style={theme.overlayStyle}>
      <section className={`my-auto max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto ${theme.shellClass}`}>
        <div className={`flex items-center justify-between border-b px-6 py-5 md:px-7 ${theme.borderClass}`}>
          <div>
            <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${theme.mutedTextClass}`}>
              Part {sectionNumber}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Multiple Choice
            </h2>
          </div>
          <button
            type="button"
            className={theme.modalCloseButtonClass}
            aria-label="Close multiple choice dialog"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6 md:px-7 md:py-7">
          <div className={theme.softNoticeClass}>
            Paste the multiple choice block once. The builder will detect the question number, prompt, and A-D choices automatically.
          </div>

          <section className={theme.surfaceClass}>
            <div className="grid gap-6">
              <label className="form-control">
                <span className={`label-text mb-2 font-medium ${theme.labelTextClass}`}>
                  Instructions
                </span>
                <textarea
                  className={`${theme.textareaClass} min-h-24 w-full leading-7`}
                  placeholder="Enter the instructions students should see."
                  value={instructions}
                  onChange={(event) => onChangeInstructions(event.target.value)}
                />
              </label>

              <label className="form-control">
                <span className={`label-text mb-2 font-medium ${theme.labelTextClass}`}>
                  Multiple Choice Text
                </span>
                <textarea
                  className={`${theme.textareaClass} min-h-72 w-full leading-7`}
                  placeholder="Paste the multiple choice question block here."
                  value={sourceText}
                  onChange={(event) => onChangeText(event.target.value)}
                />
              </label>

              <div className={theme.innerSurfaceClass}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className={`font-medium ${theme.labelTextClass}`}>
                    Generated Questions
                  </p>
                  <button
                    type="button"
                    className={theme.utilityButtonClass}
                    onClick={onAddQuestion}
                  >
                    Add Manual Question
                  </button>
                </div>

                {questions.length > 0 ? (
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <section key={question.id} className={theme.cardClass}>
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold">
                            Question {index + 1}
                          </h3>
                          <div className="badge badge-outline">
                            {question.questionNumber || "No number"}
                          </div>
                        </div>

                        <div className="grid gap-4">
                          <label className="form-control max-w-sm">
                            <span className="label-text mb-2 font-medium">
                              Question Number
                            </span>
                            <input
                              type="number"
                              min="1"
                              max="40"
                              className={`${theme.inputClass} w-36 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                              value={question.questionNumber}
                              onChange={(event) =>
                                onChangeQuestionField(
                                  question.id,
                                  "questionNumber",
                                  event.target.value
                                )
                              }
                            />
                          </label>

                          <label className="form-control">
                            <span className="label-text mb-2 font-medium">
                              Question Text
                            </span>
                            <textarea
                              className={`${theme.textareaClass} min-h-24 w-full leading-7`}
                              value={question.prompt}
                              onChange={(event) =>
                                onChangeQuestionField(
                                  question.id,
                                  "prompt",
                                  event.target.value
                                )
                              }
                            />
                          </label>

                          <div className="grid gap-4 md:grid-cols-2">
                            {question.options.map((option) => (
                              <label key={`${question.id}-${option.label}`} className="form-control">
                                <span className="label-text mb-2 font-medium">
                                  Option {option.label}
                                </span>
                                <input
                                  type="text"
                                  className={`${theme.inputClass} w-full`}
                                  value={option.text}
                                  onChange={(event) =>
                                    onChangeQuestionOption(
                                      question.id,
                                      option.label,
                                      event.target.value
                                    )
                                  }
                                />
                              </label>
                            ))}
                          </div>

                          <label className="form-control max-w-sm">
                            <span className="label-text mb-2 font-medium">
                              Correct Answer
                            </span>
                            <div className="space-y-2">
                              {question.options
                                .filter((option) => String(option.text).trim())
                                .map((option) => (
                                  <label
                                    key={`${question.id}-answer-${option.label}`}
                                    className="label cursor-pointer justify-start gap-3 rounded-lg border border-base-300 bg-base-100 px-3 py-3"
                                  >
                                    <input
                                      type="checkbox"
                                      className="checkbox checkbox-sm"
                                      checked={(Array.isArray(question.correctAnswers)
                                        ? question.correctAnswers
                                        : []
                                      ).includes(option.label)}
                                      onChange={() =>
                                        onChangeQuestionAnswer(question.id, option.label)
                                      }
                                    />
                                    <span className="label-text font-medium">
                                      {option.label}
                                    </span>
                                  </label>
                                ))}
                            </div>
                          </label>
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm leading-7 ${theme.mutedTextClass}`}>
                    No multiple choice questions detected yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-4 flex justify-end gap-3 px-6 py-5 md:px-7">
          {errorMessage ? (
            <p className="mr-auto self-center text-sm font-medium text-error">
              {errorMessage}
            </p>
          ) : null}
          <button type="button" className="btn px-5" onClick={onClose}>
            Cancel
          </button>
          <CreatorActionButton onClick={onSave} themeMode={themeMode}>
            Save Questions
          </CreatorActionButton>
        </div>
      </section>
    </div>,
    document.body
  );
}

// Show table dialog
function TableCompletionDialog({
  sectionNumber,
  instructions,
  headers,
  rows,
  questions,
  errorMessage,
  themeMode,
  onChangeInstructions,
  onAddColumn,
  onRemoveColumn,
  onChangeHeader,
  onAddRow,
  onRemoveRow,
  onChangeCell,
  onChangeQuestion,
  onClose,
  onSave,
}) {
  const [isPortalReady, setIsPortalReady] = useState(false);
  const theme = getListeningTheme(themeMode);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  if (!isPortalReady) {
    return null;
  }

  return createPortal(
    <div style={theme.overlayStyle}>
      <section className={`my-auto max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto ${theme.shellClass}`}>
        <div className={`flex items-center justify-between border-b px-6 py-5 md:px-7 ${theme.borderClass}`}>
          <div>
            <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${theme.mutedTextClass}`}>
              Part {sectionNumber}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Table Completion
            </h2>
          </div>
          <button
            type="button"
            className={theme.modalCloseButtonClass}
            aria-label="Close table completion dialog"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6 md:px-7 md:py-7">
          <div className={theme.softNoticeClass}>
            Add the table headers and rows here. Use a question number followed by at least five dots inside a cell, like 21 ........, to generate answer fields automatically.
          </div>

          <section className={theme.surfaceClass}>
            <div className="grid gap-6">
              <label className="form-control">
                <span className={`label-text mb-2 font-medium ${theme.labelTextClass}`}>
                  Instructions
                </span>
                <textarea
                  className={`${theme.textareaClass} min-h-24 w-full leading-7`}
                  placeholder="Enter the instructions students should see."
                  value={instructions}
                  onChange={(event) => onChangeInstructions(event.target.value)}
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={theme.utilityButtonClass}
                  onClick={onAddColumn}
                >
                  Add Column
                </button>
                <button
                  type="button"
                  className={theme.utilityButtonClass}
                  onClick={onAddRow}
                >
                  Add Row
                </button>
              </div>

              <div className={theme.tableWrapClass}>
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {headers.map((header, columnIndex) => (
                        <th
                          key={`table-header-${columnIndex}`}
                          className={theme.tableHeaderCellClass}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="text"
                              className={`${theme.inputClass} w-full`}
                              placeholder={`Column ${columnIndex + 1}`}
                              value={header}
                              onChange={(event) =>
                                onChangeHeader(columnIndex, event.target.value)
                              }
                            />
                            {headers.length > 1 ? (
                              <button
                                type="button"
                                className={theme.destructiveButtonClass}
                                onClick={() => onRemoveColumn(columnIndex)}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </th>
                      ))}
                      <th className={theme.tableHeaderCellClass}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        {row.cells.map((cell, cellIndex) => (
                          <td
                            key={`${row.id}-cell-${cellIndex}`}
                            className={theme.tableCellClass}
                          >
                            <textarea
                              className={`${theme.textareaClass} min-h-24 w-full leading-7`}
                              value={cell}
                              onChange={(event) =>
                                onChangeCell(row.id, cellIndex, event.target.value)
                              }
                            />
                          </td>
                        ))}
                        <td className={theme.tableCellClass}>
                          {rows.length > 1 ? (
                            <button
                              type="button"
                              className={theme.destructiveButtonClass}
                              onClick={() => onRemoveRow(row.id)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={theme.innerSurfaceClass}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className={`font-medium ${theme.labelTextClass}`}>
                    Detected Answer Fields
                  </p>
                  <div className="badge badge-outline">
                    {questions.length} answers
                  </div>
                </div>

                {questions.length > 0 ? (
                  <div className="space-y-4">
                    {questions.map((question) => (
                      <div
                        key={question.id}
                        className={`grid gap-3 md:grid-cols-[120px_minmax(0,1fr)] ${theme.cardClass}`}
                      >
                        <div>
                          <p className={`text-sm font-medium ${theme.mutedTextClass}`}>
                            Question
                          </p>
                          <p className="mt-1 text-lg font-semibold">
                            {question.questionNumber}
                          </p>
                        </div>
                        <label className="form-control">
                          <span className={`label-text mb-2 font-medium ${theme.labelTextClass}`}>
                            Enter Correct Answer
                          </span>
                          <input
                            type="text"
                            className={`${theme.inputClass} w-full`}
                            placeholder={`Enter the exact answer for Question ${question.questionNumber}`}
                            value={question.correctAnswer}
                            onChange={(event) =>
                              onChangeQuestion(question.id, event.target.value)
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm leading-7 ${theme.mutedTextClass}`}>
                    No blanks detected yet. Add a number followed by at least five dots in a table cell to generate answer fields.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-4 flex justify-end gap-3 px-6 py-5 md:px-7">
          {errorMessage ? (
            <p className="mr-auto self-center text-sm font-medium text-error">
              {errorMessage}
            </p>
          ) : null}
          <button type="button" className="btn px-5" onClick={onClose}>
            Cancel
          </button>
          <CreatorActionButton onClick={onSave} themeMode={themeMode}>
            Save Questions
          </CreatorActionButton>
        </div>
      </section>
    </div>,
    document.body
  );
}

// New empty form
function createEmptyListeningForm() {
  return {
    testName: "",
    testDifficulty: "medium",
    date: getTodayDate(),
    part1Title: "",
    part1Info: "",
    part1Questions: [],
    part2Title: "",
    part2Info: "",
    part2Questions: [],
    part3Title: "",
    part3Info: "",
    part3Questions: [],
    part4Title: "",
    part4Info: "",
    part4Questions: [],
  };
}

// Reset type picks
function createEmptyQuestionTypeSelections() {
  return {
    1: "",
    2: "",
    3: "",
    4: "",
  };
}

// Reset audio state
function createEmptyAudioState() {
  return {
    1: "",
    2: "",
    3: "",
    4: "",
  };
}

// Rebuild saved form
function createListeningFormFromTest(test) {
  const nextForm = createEmptyListeningForm();
  const matchingDifficulty =
    difficultyOptions.find(
      (option) =>
        option.label.toLowerCase() === String(test?.difficulty).toLowerCase()
    )?.value || "medium";

  nextForm.testName = test?.name || "";
  nextForm.testDifficulty = matchingDifficulty;
  nextForm.date = test?.date || getTodayDate();

  const sections = Array.isArray(test?.sections) ? test.sections : [];

  sections.forEach((section, index) => {
    const sectionNumber = section?.sectionNumber || index + 1;
    const titleField = `part${sectionNumber}Title`;
    const infoField = `part${sectionNumber}Info`;
    const questionsField = `part${sectionNumber}Questions`;

    nextForm[titleField] = section?.title || "";
    nextForm[infoField] = section?.info || "";
    nextForm[questionsField] = Array.isArray(section?.questions)
      ? section.questions.flatMap((questionGroup) => {
          if (questionGroup.type === "TFNG") {
            return [
              {
                id: questionGroup.id || createId(),
                type: "TFNG",
                title:
                  questionGroup.title ||
                  (questionGroup.questions?.[0]?.answerType === "YNNG"
                    ? "Yes / No / Not Given"
                    : "True / False / Not Given"),
                items: Array.isArray(questionGroup.questions)
                  ? questionGroup.questions.map((question) => ({
                      id: question.id || createId(),
                      answerType: question.answerType || "TFNG",
                      questionNumber: String(question.number || ""),
                      prompt: question.question || "",
                      correctAnswer:
                        question.correctAnswer ||
                        answerTypeOptions[question.answerType || "TFNG"]?.values?.[0] ||
                        "TRUE",
                    }))
                  : [],
              },
            ];
          }

          if (questionGroup.type === "MULTIPLE_CHOICE") {
            return [
              {
                id: questionGroup.id || createId(),
                type: "MULTIPLE_CHOICE",
                title: questionGroup.title || "Multiple Choice",
                instructions: questionGroup.instructions || "",
                sourceText: questionGroup.sourceText || "",
                items: Array.isArray(questionGroup.questions)
                  ? questionGroup.questions.map((question) => ({
                      id: question.id || createId(),
                      questionNumber: String(question.number || ""),
                      prompt: question.question || "",
                      options: Array.isArray(question.options)
                        ? question.options.map((option) => ({
                            label: option.label,
                            text: option.text || "",
                          }))
                        : [
                            { label: "A", text: "" },
      { label: "B", text: "" },
      { label: "C", text: "" },
      { label: "D", text: "" },
      { label: "E", text: "" },
    ],
                      correctAnswer: question.correctAnswer || "",
                      correctAnswers: Array.isArray(question.correctAnswers)
                        ? question.correctAnswers
                        : Array.isArray(question.acceptedAnswers)
                          ? question.acceptedAnswers
                          : question.correctAnswer
                            ? [question.correctAnswer]
                            : [],
                    }))
                  : [],
              },
            ];
          }

          if (questionGroup.type === "MATCHING_INFORMATION") {
            return [
              {
                id: questionGroup.id || createId(),
                type: "MATCHING_INFORMATION",
                title: questionGroup.title || "All Matching Activities",
                activityType: questionGroup.activityType || "MATCH_INFO_TO_OPTIONS",
                instructions: questionGroup.instructions || "",
                possibleAnswers: Array.isArray(questionGroup.possibleAnswers)
                  ? questionGroup.possibleAnswers
                  : [],
                items: Array.isArray(questionGroup.questions)
                  ? questionGroup.questions.map((question) => ({
                      id: question.id || createId(),
                      questionNumber: String(question.number || ""),
                      prompt: question.question || "",
                      correctAnswer: question.correctAnswer || "",
                    }))
                  : [],
              },
            ];
          }

          if (questionGroup.type === "TABLE") {
            return [
              {
                id: questionGroup.id || createId(),
                type: "TABLE",
                title: questionGroup.title || "Table Completion",
                instructions: questionGroup.instructions || "",
                tableHeaders: Array.isArray(questionGroup.table?.headers)
                  ? questionGroup.table.headers
                  : ["", ""],
                tableRows: Array.isArray(questionGroup.table?.rows)
                  ? questionGroup.table.rows.map((row) => ({
                      id: createId(),
                      cells: Array.isArray(row?.cells) ? row.cells : ["", ""],
                    }))
                  : [createEmptyTableCompletionRow()],
                items: Array.isArray(questionGroup.questions)
                  ? questionGroup.questions.map((question) => ({
                      id: question.id || createId(),
                      questionNumber: String(question.number || ""),
                      correctAnswer: question.correctAnswer || "",
                      rowIndex: Number(question.rowIndex),
                      cellIndex: Number(question.cellIndex),
                      blankOrder: Number(question.blankOrder),
                      prompt: question.question || "",
                    }))
                  : [],
              },
            ];
          }

          return [];
        })
      : [];
  });

  return nextForm;
}

const ListeningTestCreator = forwardRef(function ListeningTestCreator(
  { themeMode = "dark" },
  ref
) {
  const [isListeningTestComposerOpen, setIsListeningTestComposerOpen] = useState(false);
  const [listeningTests, setListeningTests] = useState([]);
  const [isListeningTestsLoading, setIsListeningTestsLoading] = useState(true);
  const [isSavingListeningTest, setIsSavingListeningTest] = useState(false);
  const [isDeletingListeningTest, setIsDeletingListeningTest] = useState(false);
  const [listeningTestError, setListeningTestError] = useState("");
  const [listeningTestNotice, setListeningTestNotice] = useState("");
  const [editingListeningTestId, setEditingListeningTestId] = useState("");
  const [saveProgress, setSaveProgress] = useState({
    sectionNumber: 0,
    progress: 0,
  });
  const [listeningTestForm, setListeningTestForm] = useState(createEmptyListeningForm);
  const [questionTypeSelections, setQuestionTypeSelections] = useState(
    createEmptyQuestionTypeSelections
  );
  const [selectedAudioFilesBySection, setSelectedAudioFilesBySection] = useState(() => ({
    1: null,
    2: null,
    3: null,
    4: null,
  }));
  const [selectedAudioNamesBySection, setSelectedAudioNamesBySection] = useState(
    createEmptyAudioState
  );
  const [selectedAudioPreviewUrlsBySection, setSelectedAudioPreviewUrlsBySection] =
    useState(createEmptyAudioState);

  const [isTfngDialogOpen, setIsTfngDialogOpen] = useState(false);
  const [tfngDialogSectionNumber, setTfngDialogSectionNumber] = useState(1);
  const [tfngDialogQuestions, setTfngDialogQuestions] = useState([
    createEmptyTfngQuestion("TFNG"),
  ]);
  const [tfngDialogError, setTfngDialogError] = useState("");

  const [isMultipleChoiceDialogOpen, setIsMultipleChoiceDialogOpen] = useState(false);
  const [multipleChoiceDialogSectionNumber, setMultipleChoiceDialogSectionNumber] =
    useState(1);
  const [multipleChoiceDialogInstructions, setMultipleChoiceDialogInstructions] =
    useState("");
  const [multipleChoiceDialogText, setMultipleChoiceDialogText] = useState("");
  const [multipleChoiceDialogQuestions, setMultipleChoiceDialogQuestions] = useState(
    []
  );
  const [multipleChoiceDialogError, setMultipleChoiceDialogError] = useState("");
  const [isMatchingInformationDialogOpen, setIsMatchingInformationDialogOpen] =
    useState(false);
  const [matchingInformationDialogSectionNumber, setMatchingInformationDialogSectionNumber] =
    useState(1);
  const [matchingInformationDialogQuestions, setMatchingInformationDialogQuestions] =
    useState([createEmptyMatchingInformationQuestion()]);
  const [matchingInformationDialogInstructions, setMatchingInformationDialogInstructions] =
    useState("");
  const [matchingInformationDialogQuestionsText, setMatchingInformationDialogQuestionsText] =
    useState("");
  const [matchingInformationDialogPossibleAnswersText, setMatchingInformationDialogPossibleAnswersText] =
    useState("");
  const [matchingInformationDialogError, setMatchingInformationDialogError] =
    useState("");

  const [isTableCompletionDialogOpen, setIsTableCompletionDialogOpen] = useState(false);
  const [tableCompletionDialogSectionNumber, setTableCompletionDialogSectionNumber] =
    useState(1);
  const [tableCompletionDialogInstructions, setTableCompletionDialogInstructions] =
    useState("");
  const [tableCompletionDialogHeaders, setTableCompletionDialogHeaders] = useState([
    "",
    "",
  ]);
  const [tableCompletionDialogRows, setTableCompletionDialogRows] = useState([
    createEmptyTableCompletionRow(),
  ]);
  const [tableCompletionDialogQuestions, setTableCompletionDialogQuestions] = useState(
    []
  );
  const [tableCompletionDialogError, setTableCompletionDialogError] = useState("");

  useEffect(() => {
    async function loadListeningTests() {
      try {
        setIsListeningTestsLoading(true);
        setListeningTests(await listListeningTests());
      } catch (error) {
        console.error("[Creator] Failed to load listening tests:", error);
      } finally {
        setIsListeningTestsLoading(false);
      }
    }

    loadListeningTests();
  }, []);

  useEffect(() => {
    if (!listeningTestNotice) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setListeningTestNotice("");
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [listeningTestNotice]);

  useEffect(() => {
    return () => {
      Object.values(selectedAudioPreviewUrlsBySection).forEach((previewUrl) => {
        revokePreviewUrl(previewUrl);
      });
    };
  }, [selectedAudioPreviewUrlsBySection]);

  function resetAudioState() {
    Object.values(selectedAudioPreviewUrlsBySection).forEach((previewUrl) => {
      revokePreviewUrl(previewUrl);
    });
    setSelectedAudioFilesBySection({
      1: null,
      2: null,
      3: null,
      4: null,
    });
    setSelectedAudioNamesBySection(createEmptyAudioState());
    setSelectedAudioPreviewUrlsBySection(createEmptyAudioState());
  }

  function openCreateNew() {
    setListeningTestError("");
    setListeningTestNotice("");
    setEditingListeningTestId("");
    setSaveProgress({ sectionNumber: 0, progress: 0 });
    setListeningTestForm(createEmptyListeningForm());
    setQuestionTypeSelections(createEmptyQuestionTypeSelections());
    setIsTfngDialogOpen(false);
    setTfngDialogQuestions([createEmptyTfngQuestion("TFNG")]);
    setTfngDialogError("");
    setIsMultipleChoiceDialogOpen(false);
    setMultipleChoiceDialogInstructions("");
    setMultipleChoiceDialogText("");
    setMultipleChoiceDialogQuestions([]);
    setMultipleChoiceDialogError("");
    setIsMatchingInformationDialogOpen(false);
    setMatchingInformationDialogQuestions([createEmptyMatchingInformationQuestion()]);
    setMatchingInformationDialogInstructions("");
    setMatchingInformationDialogQuestionsText("");
    setMatchingInformationDialogPossibleAnswersText("");
    setMatchingInformationDialogError("");
    setIsTableCompletionDialogOpen(false);
    setTableCompletionDialogInstructions("");
    setTableCompletionDialogHeaders(["", ""]);
    setTableCompletionDialogRows([createEmptyTableCompletionRow()]);
    setTableCompletionDialogQuestions([]);
    setTableCompletionDialogError("");
    resetAudioState();
    setIsListeningTestComposerOpen(true);
  }

  useImperativeHandle(ref, () => ({
    openCreateNew,
  }));

  function handleListeningTestChange(field, value) {
    setListeningTestForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleListeningAudioChange(sectionNumber, event) {
    const nextFile = event.target.files?.[0] || null;

    setSelectedAudioFilesBySection((currentState) => ({
      ...currentState,
      [sectionNumber]: nextFile,
    }));
    setSelectedAudioNamesBySection((currentState) => ({
      ...currentState,
      [sectionNumber]: nextFile ? nextFile.name : "",
    }));
    setSelectedAudioPreviewUrlsBySection((currentState) => {
      revokePreviewUrl(currentState[sectionNumber]);

      return {
        ...currentState,
        [sectionNumber]: nextFile ? URL.createObjectURL(nextFile) : "",
      };
    });
  }

  function handleCloseListeningTestComposer() {
    if (isSavingListeningTest) {
      return;
    }

    setIsListeningTestComposerOpen(false);
    setListeningTestError("");
    setListeningTestNotice("");
    setEditingListeningTestId("");
    setQuestionTypeSelections(createEmptyQuestionTypeSelections());
    setIsTfngDialogOpen(false);
    setTfngDialogError("");
    setIsMultipleChoiceDialogOpen(false);
    setMultipleChoiceDialogInstructions("");
    setMultipleChoiceDialogText("");
    setMultipleChoiceDialogQuestions([]);
    setMultipleChoiceDialogError("");
    setIsMatchingInformationDialogOpen(false);
    setMatchingInformationDialogQuestions([createEmptyMatchingInformationQuestion()]);
    setMatchingInformationDialogInstructions("");
    setMatchingInformationDialogQuestionsText("");
    setMatchingInformationDialogPossibleAnswersText("");
    setMatchingInformationDialogError("");
    setIsTableCompletionDialogOpen(false);
    setTableCompletionDialogInstructions("");
    setTableCompletionDialogHeaders(["", ""]);
    setTableCompletionDialogRows([createEmptyTableCompletionRow()]);
    setTableCompletionDialogQuestions([]);
    setTableCompletionDialogError("");
    setSaveProgress({ sectionNumber: 0, progress: 0 });
  }

  function handleAddListeningQuestionType(sectionNumber, questionType) {
    setQuestionTypeSelections((currentSelections) => ({
      ...currentSelections,
      [sectionNumber]: questionType,
    }));

    const sectionQuestionsField = `part${sectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      listeningTestForm[sectionQuestionsField]
    )
      ? listeningTestForm[sectionQuestionsField]
      : [];
    const existingQuestionNumbers = existingSectionQuestions.flatMap(
      (questionGroup) =>
        Array.isArray(questionGroup.items)
          ? questionGroup.items.map((item) => String(item.questionNumber).trim())
          : []
    );

    if (questionType === "True / False / Not Given (or Yes / No / Not Given)") {
      setTfngDialogSectionNumber(sectionNumber);
      setTfngDialogQuestions([
        {
          ...createEmptyTfngQuestion("TFNG"),
          questionNumber: getNextListeningQuestionNumber([], existingQuestionNumbers),
        },
      ]);
      setTfngDialogError("");
      setListeningTestError("");
      setQuestionTypeSelections((currentSelections) => ({
        ...currentSelections,
        [sectionNumber]: "",
      }));
      setIsTfngDialogOpen(true);
      return;
    }

    if (questionType === "Multiple Choice") {
      setMultipleChoiceDialogSectionNumber(sectionNumber);
      setMultipleChoiceDialogInstructions("");
      setMultipleChoiceDialogText("");
      setMultipleChoiceDialogQuestions([]);
      setMultipleChoiceDialogError("");
      setListeningTestError("");
      setQuestionTypeSelections((currentSelections) => ({
        ...currentSelections,
        [sectionNumber]: "",
      }));
      setIsMultipleChoiceDialogOpen(true);
      return;
    }

    if (questionType === "All Matching Activities") {
      setMatchingInformationDialogSectionNumber(sectionNumber);
      setMatchingInformationDialogQuestions([createEmptyMatchingInformationQuestion()]);
      setMatchingInformationDialogInstructions("");
      setMatchingInformationDialogQuestionsText("");
      setMatchingInformationDialogPossibleAnswersText("");
      setMatchingInformationDialogError("");
      setListeningTestError("");
      setQuestionTypeSelections((currentSelections) => ({
        ...currentSelections,
        [sectionNumber]: "",
      }));
      setIsMatchingInformationDialogOpen(true);
      return;
    }

    if (questionType === "Table Completion") {
      setTableCompletionDialogSectionNumber(sectionNumber);
      setTableCompletionDialogInstructions("");
      setTableCompletionDialogHeaders(["", ""]);
      setTableCompletionDialogRows([createEmptyTableCompletionRow()]);
      setTableCompletionDialogQuestions([]);
      setTableCompletionDialogError("");
      setListeningTestError("");
      setQuestionTypeSelections((currentSelections) => ({
        ...currentSelections,
        [sectionNumber]: "",
      }));
      setIsTableCompletionDialogOpen(true);
    }
  }

  function handleEditListeningTest(test) {
    setListeningTestError("");
    setListeningTestNotice("");
    setEditingListeningTestId(test.id);
    setListeningTestForm(createListeningFormFromTest(test));
    setQuestionTypeSelections(createEmptyQuestionTypeSelections());
    setIsTfngDialogOpen(false);
    setTfngDialogError("");
    setIsMultipleChoiceDialogOpen(false);
    setMultipleChoiceDialogInstructions("");
    setMultipleChoiceDialogText("");
    setMultipleChoiceDialogQuestions([]);
    setMultipleChoiceDialogError("");
    setIsTableCompletionDialogOpen(false);
    setTableCompletionDialogInstructions("");
    setTableCompletionDialogHeaders(["", ""]);
    setTableCompletionDialogRows([createEmptyTableCompletionRow()]);
    setTableCompletionDialogQuestions([]);
    setTableCompletionDialogError("");
    setSaveProgress({ sectionNumber: 0, progress: 0 });
    resetAudioState();

    const nextPreviewUrls = createEmptyAudioState();
    const sections = Array.isArray(test.sections) ? test.sections : [];

    sections.forEach((section, index) => {
      const sectionNumber = section?.sectionNumber || index + 1;
      nextPreviewUrls[sectionNumber] = section?.audioUrl || "";
    });

    setSelectedAudioPreviewUrlsBySection(nextPreviewUrls);
    setIsListeningTestComposerOpen(true);
  }

  function handleCloseTfngDialog() {
    setIsTfngDialogOpen(false);
    setTfngDialogError("");
  }

  function handleCloseMultipleChoiceDialog() {
    setIsMultipleChoiceDialogOpen(false);
    setMultipleChoiceDialogInstructions("");
    setMultipleChoiceDialogText("");
    setMultipleChoiceDialogQuestions([]);
    setMultipleChoiceDialogError("");
  }

  function handleCloseMatchingInformationDialog() {
    setIsMatchingInformationDialogOpen(false);
    setMatchingInformationDialogQuestions([createEmptyMatchingInformationQuestion()]);
    setMatchingInformationDialogInstructions("");
    setMatchingInformationDialogQuestionsText("");
    setMatchingInformationDialogPossibleAnswersText("");
    setMatchingInformationDialogError("");
  }

  function handleCloseTableCompletionDialog() {
    setIsTableCompletionDialogOpen(false);
    setTableCompletionDialogInstructions("");
    setTableCompletionDialogHeaders(["", ""]);
    setTableCompletionDialogRows([createEmptyTableCompletionRow()]);
    setTableCompletionDialogQuestions([]);
    setTableCompletionDialogError("");
  }

  function handleAddTfngQuestion() {
    const sectionQuestionsField = `part${tfngDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      listeningTestForm[sectionQuestionsField]
    )
      ? listeningTestForm[sectionQuestionsField]
      : [];
    const existingQuestionNumbers = existingSectionQuestions.flatMap(
      (questionGroup) =>
        Array.isArray(questionGroup.items)
          ? questionGroup.items.map((item) => String(item.questionNumber).trim())
          : []
    );

    setTfngDialogQuestions((currentQuestions) => [
      ...currentQuestions,
      {
        ...createEmptyTfngQuestion(
          currentQuestions[currentQuestions.length - 1]?.answerType || "TFNG"
        ),
        questionNumber: getNextListeningQuestionNumber(
          currentQuestions,
          existingQuestionNumbers
        ),
      },
    ]);
  }

  function handleRemoveTfngQuestion(questionId) {
    setTfngDialogQuestions((currentQuestions) =>
      currentQuestions.filter((question) => question.id !== questionId)
    );
  }

  function handleChangeTfngQuestion(questionId, field, value) {
    setTfngDialogQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              ...(field === "answerType"
                ? {
                    answerType: value,
                    correctAnswer:
                      answerTypeOptions[value]?.values?.includes(question.correctAnswer)
                        ? question.correctAnswer
                        : answerTypeOptions[value]?.values?.[0] || "TRUE",
                  }
                : {
                    [field]: value,
                  }),
            }
          : question
      )
    );
  }

  function syncMultipleChoiceQuestions(sourceText, previousQuestions = []) {
    const parsedQuestions = parseMultipleChoiceQuestions(sourceText);

    setMultipleChoiceDialogQuestions(
      parsedQuestions.map((question) => {
        const matchingPreviousQuestion = previousQuestions.find(
          (previousQuestion) =>
            String(previousQuestion.questionNumber).trim() ===
            String(question.questionNumber).trim()
        );

        return {
          ...question,
          id: matchingPreviousQuestion?.id || question.id,
          correctAnswer: matchingPreviousQuestion?.correctAnswer || "",
          correctAnswers: Array.isArray(matchingPreviousQuestion?.correctAnswers)
            ? matchingPreviousQuestion.correctAnswers.filter((savedAnswer) =>
                question.options.some((option) => option.label === savedAnswer)
              )
            : question.options.some(
                  (option) => option.label === matchingPreviousQuestion?.correctAnswer
                )
              ? [matchingPreviousQuestion.correctAnswer]
              : [],
        };
      })
    );
  }

  function syncMatchingInformationQuestions({
    questionsText,
    possibleAnswersText,
    previousQuestions = [],
  }) {
    const parsedQuestions = parseMatchingQuestionLines(questionsText);
    const possibleAnswers = parseNonEmptyLines(possibleAnswersText);

    setMatchingInformationDialogQuestions(
      parsedQuestions.length > 0
        ? parsedQuestions.map((question, index) => ({
            ...question,
            correctAnswer:
              possibleAnswers.includes(previousQuestions[index]?.correctAnswer)
                ? previousQuestions[index].correctAnswer
                : possibleAnswers[0] || "",
          }))
        : [createEmptyMatchingInformationQuestion()]
    );
  }

  function handleChangeMatchingInformationInstructions(value) {
    setMatchingInformationDialogInstructions(value);
  }

  function handleChangeMatchingInformationPossibleAnswersText(value) {
    setMatchingInformationDialogPossibleAnswersText(value);
    syncMatchingInformationQuestions({
      questionsText: matchingInformationDialogQuestionsText,
      possibleAnswersText: value,
      previousQuestions: matchingInformationDialogQuestions,
    });
  }

  function handleChangeMatchingInformationQuestionsText(value) {
    setMatchingInformationDialogQuestionsText(value);
    syncMatchingInformationQuestions({
      questionsText: value,
      possibleAnswersText: matchingInformationDialogPossibleAnswersText,
      previousQuestions: matchingInformationDialogQuestions,
    });
  }

  function handleChangeMatchingInformationQuestion(questionId, field, value) {
    setMatchingInformationDialogQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              [field]: value,
            }
          : question
      )
    );
  }

  function handleRemoveMatchingInformationQuestion(questionId) {
    setMatchingInformationDialogQuestions((currentQuestions) =>
      currentQuestions.length > 1
        ? currentQuestions.filter((question) => question.id !== questionId)
        : currentQuestions
    );
  }

  function handleChangeMultipleChoiceInstructions(value) {
    setMultipleChoiceDialogInstructions(value);
  }

  function handleChangeMultipleChoiceText(value) {
    setMultipleChoiceDialogText(value);
    syncMultipleChoiceQuestions(value, multipleChoiceDialogQuestions);
  }

  function handleAddMultipleChoiceQuestion() {
    const sectionQuestionsField = `part${multipleChoiceDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      listeningTestForm[sectionQuestionsField]
    )
      ? listeningTestForm[sectionQuestionsField]
      : [];
    const existingQuestionNumbers = existingSectionQuestions.flatMap(
      (questionGroup) =>
        Array.isArray(questionGroup.items)
          ? questionGroup.items.map((item) => String(item.questionNumber).trim())
          : []
    );

    setMultipleChoiceDialogQuestions((currentQuestions) => [
      ...currentQuestions,
      {
        ...createEmptyMultipleChoiceQuestion(),
        questionNumber: getNextListeningQuestionNumber(
          currentQuestions,
          existingQuestionNumbers
        ),
      },
    ]);
  }

  function handleChangeMultipleChoiceQuestionField(questionId, field, value) {
    setMultipleChoiceDialogQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              [field]: value,
            }
          : question
      )
    );
  }

  function handleChangeMultipleChoiceQuestionOption(questionId, optionLabel, value) {
    setMultipleChoiceDialogQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option) =>
                option.label === optionLabel
                  ? {
                      ...option,
                      text: value,
                    }
                  : option
              ),
            }
          : question
      )
    );
  }

  function handleChangeMultipleChoiceQuestionAnswer(questionId, value) {
    setMultipleChoiceDialogQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              correctAnswers: (Array.isArray(question.correctAnswers)
                ? question.correctAnswers
                : []
              ).includes(value)
                ? question.correctAnswers.filter((answer) => answer !== value)
                : [
                    ...(Array.isArray(question.correctAnswers)
                      ? question.correctAnswers
                      : []),
                    value,
                  ].sort(),
              correctAnswer: value,
            }
          : question
      )
    );
  }

  function syncTableCompletionQuestions(tableRows, previousQuestions = []) {
    setTableCompletionDialogQuestions(
      extractTableCompletionQuestions(tableRows, previousQuestions)
    );
  }

  function handleChangeTableCompletionInstructions(value) {
    setTableCompletionDialogInstructions(value);
  }

  function handleAddTableCompletionColumn() {
    setTableCompletionDialogHeaders((currentHeaders) => [...currentHeaders, ""]);
    setTableCompletionDialogRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        cells: [...row.cells, ""],
      }))
    );
  }

  function handleRemoveTableCompletionColumn(columnIndex) {
    if (tableCompletionDialogHeaders.length <= 1) {
      return;
    }

    const nextRows = tableCompletionDialogRows.map((row) => ({
      ...row,
      cells: row.cells.filter((_, index) => index !== columnIndex),
    }));

    setTableCompletionDialogHeaders((currentHeaders) =>
      currentHeaders.filter((_, index) => index !== columnIndex)
    );
    setTableCompletionDialogRows(nextRows);
    syncTableCompletionQuestions(nextRows, tableCompletionDialogQuestions);
  }

  function handleChangeTableCompletionHeader(columnIndex, value) {
    setTableCompletionDialogHeaders((currentHeaders) =>
      currentHeaders.map((header, index) =>
        index === columnIndex ? value : header
      )
    );
  }

  function handleAddTableCompletionRow() {
    setTableCompletionDialogRows((currentRows) => [
      ...currentRows,
      createEmptyTableCompletionRow(tableCompletionDialogHeaders.length),
    ]);
  }

  function handleRemoveTableCompletionRow(rowId) {
    if (tableCompletionDialogRows.length <= 1) {
      return;
    }

    const nextRows = tableCompletionDialogRows.filter((row) => row.id !== rowId);
    setTableCompletionDialogRows(nextRows);
    syncTableCompletionQuestions(nextRows, tableCompletionDialogQuestions);
  }

  function handleChangeTableCompletionCell(rowId, cellIndex, value) {
    const nextRows = tableCompletionDialogRows.map((row) =>
      row.id === rowId
        ? {
            ...row,
            cells: row.cells.map((cell, index) =>
              index === cellIndex ? value : cell
            ),
          }
        : row
    );

    setTableCompletionDialogRows(nextRows);
    syncTableCompletionQuestions(nextRows, tableCompletionDialogQuestions);
  }

  function handleChangeTableCompletionQuestion(questionId, value) {
    setTableCompletionDialogQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              correctAnswer: value,
            }
          : question
      )
    );
  }

  function handleDeleteListeningQuestionItem(sectionNumber, groupId, itemId) {
    const sectionQuestionsField = `part${sectionNumber}Questions`;

    setListeningTestForm((currentForm) => ({
      ...currentForm,
      [sectionQuestionsField]: (
        Array.isArray(currentForm[sectionQuestionsField])
          ? currentForm[sectionQuestionsField]
          : []
      )
        .map((questionGroup) => {
          if (questionGroup.id !== groupId) {
            return questionGroup;
          }

          if (questionGroup.type === "TABLE") {
            const targetItem = Array.isArray(questionGroup.items)
              ? questionGroup.items.find((item) => item.id === itemId)
              : null;

            return {
              ...questionGroup,
              tableRows: Array.isArray(questionGroup.tableRows)
                ? questionGroup.tableRows.map((row) =>
                    row.id !== targetItem?.rowId
                      ? row
                      : {
                          ...row,
                          cells: row.cells.map((cell, cellIndex) =>
                            cellIndex !== Number(targetItem?.cellIndex)
                              ? cell
                              : String(cell || "").replace(
                                  new RegExp(
                                    `${String(targetItem?.questionNumber || "").replace(
                                      /[.*+?^${}()|[\]\\]/g,
                                      "\\$&"
                                    )}\\s*\\.{5,}`,
                                    "g"
                                  ),
                                  ""
                                )
                          ),
                        }
                  )
                : [],
              items: Array.isArray(questionGroup.items)
                ? questionGroup.items.filter((item) => item.id !== itemId)
                : [],
            };
          }

          return {
            ...questionGroup,
            items: Array.isArray(questionGroup.items)
              ? questionGroup.items.filter((item) => item.id !== itemId)
              : [],
          };
        })
        .filter(
          (questionGroup) =>
            !Array.isArray(questionGroup.items) || questionGroup.items.length > 0
        ),
    }));
  }

  function handleSaveTfngQuestions() {
    const normalizedNumbers = tfngDialogQuestions.map((question) =>
      String(question.questionNumber).trim()
    );
    const sectionQuestionsField = `part${tfngDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      listeningTestForm[sectionQuestionsField]
    )
      ? listeningTestForm[sectionQuestionsField]
      : [];
    const existingQuestionNumbers = existingSectionQuestions.flatMap(
      (questionGroup) =>
        Array.isArray(questionGroup.items)
          ? questionGroup.items.map((item) => String(item.questionNumber).trim())
          : []
    );

    if (
      tfngDialogQuestions.some(
        (question) =>
          !String(question.questionNumber).trim() || !question.prompt.trim()
      )
    ) {
      setTfngDialogError(
        "Each TFNG question needs a question number and question text."
      );
      return;
    }

    if (new Set(normalizedNumbers).size !== normalizedNumbers.length) {
      setTfngDialogError("Each TFNG question number must be unique.");
      return;
    }

    if (
      tfngDialogQuestions.some((question) => {
        const questionNumber = Number(question.questionNumber);
        return !Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > 40;
      })
    ) {
      setTfngDialogError("Question numbers must be between 1 and 40.");
      return;
    }

    if (
      normalizedNumbers.some((questionNumber) =>
        existingQuestionNumbers.includes(questionNumber)
      )
    ) {
      setTfngDialogError(
        "One or more question numbers are already used in this part."
      );
      return;
    }

    const firstAnswerType = tfngDialogQuestions[0]?.answerType || "TFNG";
    const newQuestionGroup = {
      id: createId(),
      type: "TFNG",
      title:
        firstAnswerType === "YNNG"
          ? "Yes / No / Not Given"
          : "True / False / Not Given",
      items: tfngDialogQuestions.map((question) => ({
        ...question,
        answerType: question.answerType || "TFNG",
        questionNumber: String(question.questionNumber).trim(),
        prompt: question.prompt.trim(),
      })),
    };

    setListeningTestForm((currentForm) => ({
      ...currentForm,
      [sectionQuestionsField]: [
        ...(Array.isArray(currentForm[sectionQuestionsField])
          ? currentForm[sectionQuestionsField]
          : []),
        newQuestionGroup,
      ].sort(
        (leftGroup, rightGroup) =>
          getQuestionGroupFirstNumber(leftGroup) -
          getQuestionGroupFirstNumber(rightGroup)
      ),
    }));
    setTfngDialogError("");
    setIsTfngDialogOpen(false);
    setListeningTestError("");
  }

  function handleSaveMatchingInformationQuestions() {
    const normalizedNumbers = matchingInformationDialogQuestions.map((question) =>
      String(question.questionNumber).trim()
    );
    const sectionQuestionsField = `part${matchingInformationDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      listeningTestForm[sectionQuestionsField]
    )
      ? listeningTestForm[sectionQuestionsField]
      : [];
    const existingQuestionNumbers = existingSectionQuestions.flatMap(
      (questionGroup) =>
        Array.isArray(questionGroup.items)
          ? questionGroup.items.map((item) => String(item.questionNumber).trim())
          : []
    );
    const possibleAnswers = parseNonEmptyLines(
      matchingInformationDialogPossibleAnswersText
    );

    if (
      matchingInformationDialogQuestions.some(
        (question) =>
          !String(question.questionNumber).trim() ||
          !question.prompt.trim() ||
          !question.correctAnswer
      )
    ) {
      setMatchingInformationDialogError(
        "Each matching activity row needs a number, text, and a correct match."
      );
      return;
    }

    if (possibleAnswers.length === 0) {
      setMatchingInformationDialogError(
        "Add at least one selectable answer before saving this matching activity."
      );
      return;
    }

    if (new Set(normalizedNumbers).size !== normalizedNumbers.length) {
      setMatchingInformationDialogError(
        "Each matching information question number must be unique."
      );
      return;
    }

    if (
      matchingInformationDialogQuestions.some((question) => {
        const questionNumber = Number(question.questionNumber);
        return !Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > 40;
      })
    ) {
      setMatchingInformationDialogError("Question numbers must be between 1 and 40.");
      return;
    }

    if (
      normalizedNumbers.some((questionNumber) =>
        existingQuestionNumbers.includes(questionNumber)
      )
    ) {
      setMatchingInformationDialogError(
        "One or more question numbers are already used in this part."
      );
      return;
    }

    const newQuestionGroup = {
      id: createId(),
      type: "MATCHING_INFORMATION",
      title: "All Matching Activities",
      activityType: "MATCH_INFO_TO_OPTIONS",
      instructions: matchingInformationDialogInstructions.trim(),
      possibleAnswers,
      items: matchingInformationDialogQuestions.map((question) => ({
        ...question,
        questionNumber: String(question.questionNumber).trim(),
        prompt: question.prompt.trim(),
        correctAnswer: String(question.correctAnswer).trim(),
      })),
    };

    setListeningTestForm((currentForm) => ({
      ...currentForm,
      [sectionQuestionsField]: [
        ...(Array.isArray(currentForm[sectionQuestionsField])
          ? currentForm[sectionQuestionsField]
          : []),
        newQuestionGroup,
      ].sort(
        (leftGroup, rightGroup) =>
          getQuestionGroupFirstNumber(leftGroup) -
          getQuestionGroupFirstNumber(rightGroup)
      ),
    }));
    setMatchingInformationDialogQuestions([createEmptyMatchingInformationQuestion()]);
    setMatchingInformationDialogInstructions("");
    setMatchingInformationDialogPossibleAnswersText("");
    setMatchingInformationDialogQuestionsText("");
    setMatchingInformationDialogError("");
    setIsMatchingInformationDialogOpen(false);
    setListeningTestError("");
  }

  function handleSaveMultipleChoiceQuestions() {
    const normalizedNumbers = multipleChoiceDialogQuestions.map((question) =>
      String(question.questionNumber).trim()
    );
    const sectionQuestionsField = `part${multipleChoiceDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      listeningTestForm[sectionQuestionsField]
    )
      ? listeningTestForm[sectionQuestionsField]
      : [];
    const existingQuestionNumbers = existingSectionQuestions.flatMap(
      (questionGroup) =>
        Array.isArray(questionGroup.items)
          ? questionGroup.items.map((item) => String(item.questionNumber).trim())
          : []
    );

    if (!multipleChoiceDialogText.trim()) {
      setMultipleChoiceDialogError("Paste the multiple choice text before saving.");
      return;
    }

    if (multipleChoiceDialogQuestions.length === 0) {
      setMultipleChoiceDialogError(
        "No multiple choice questions were detected from the pasted text."
      );
      return;
    }

    if (
      multipleChoiceDialogQuestions.some(
        (question) =>
          !String(question.questionNumber).trim() ||
          !question.prompt.trim() ||
          !Array.isArray(question.options) ||
          question.options.filter((option) => String(option.text).trim()).length < 2 ||
          !Array.isArray(question.correctAnswers) ||
          question.correctAnswers.length === 0
      )
    ) {
      setMultipleChoiceDialogError(
        "Each multiple choice question needs a number, prompt, at least two options, and at least one selected correct answer."
      );
      return;
    }

    if (new Set(normalizedNumbers).size !== normalizedNumbers.length) {
      setMultipleChoiceDialogError(
        "Each multiple choice question number must be unique."
      );
      return;
    }

    if (
      multipleChoiceDialogQuestions.some((question) => {
        const questionNumber = Number(question.questionNumber);
        return !Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > 40;
      })
    ) {
      setMultipleChoiceDialogError("Question numbers must be between 1 and 40.");
      return;
    }

    if (
      normalizedNumbers.some((questionNumber) =>
        existingQuestionNumbers.includes(questionNumber)
      )
    ) {
      setMultipleChoiceDialogError(
        "One or more question numbers are already used in this part."
      );
      return;
    }

    const newQuestionGroup = {
      id: createId(),
      type: "MULTIPLE_CHOICE",
      title: "Multiple Choice",
      instructions: multipleChoiceDialogInstructions.trim(),
      sourceText: multipleChoiceDialogText,
      items: multipleChoiceDialogQuestions.map((question) => ({
        ...question,
        questionNumber: String(question.questionNumber).trim(),
        prompt: question.prompt.trim(),
        correctAnswer: question.correctAnswers.join(" / "),
        correctAnswers: question.correctAnswers,
        options: question.options
          .filter((option) => String(option.text).trim())
          .map((option) => ({
            label: option.label,
            text: option.text.trim(),
          })),
      })),
    };

    setListeningTestForm((currentForm) => ({
      ...currentForm,
      [sectionQuestionsField]: [
        ...(Array.isArray(currentForm[sectionQuestionsField])
          ? currentForm[sectionQuestionsField]
          : []),
        newQuestionGroup,
      ].sort(
        (leftGroup, rightGroup) =>
          getQuestionGroupFirstNumber(leftGroup) -
          getQuestionGroupFirstNumber(rightGroup)
      ),
    }));
    setMultipleChoiceDialogInstructions("");
    setMultipleChoiceDialogText("");
    setMultipleChoiceDialogQuestions([]);
    setMultipleChoiceDialogError("");
    setIsMultipleChoiceDialogOpen(false);
    setListeningTestError("");
  }

  function handleSaveTableCompletionQuestions() {
    const normalizedNumbers = tableCompletionDialogQuestions.map((question) =>
      String(question.questionNumber).trim()
    );
    const sectionQuestionsField = `part${tableCompletionDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      listeningTestForm[sectionQuestionsField]
    )
      ? listeningTestForm[sectionQuestionsField]
      : [];
    const existingQuestionNumbers = existingSectionQuestions.flatMap(
      (questionGroup) =>
        Array.isArray(questionGroup.items)
          ? questionGroup.items.map((item) => String(item.questionNumber).trim())
          : []
    );
    const normalizedHeaders = tableCompletionDialogHeaders.map((header) =>
      String(header || "").trim()
    );
    const normalizedRows = tableCompletionDialogRows.map((row) => ({
      ...row,
      cells: Array.isArray(row.cells)
        ? row.cells.map((cell) => String(cell || "").trim())
        : [""],
    }));

    if (normalizedHeaders.some((header) => !header)) {
      setTableCompletionDialogError("Each table column needs a heading.");
      return;
    }

    if (
      normalizedRows.length === 0 ||
      normalizedRows.every((row) => row.cells.every((cell) => !cell))
    ) {
      setTableCompletionDialogError("Add at least one populated table row before saving.");
      return;
    }

    if (tableCompletionDialogQuestions.length === 0) {
      setTableCompletionDialogError(
        "No answer fields were detected. Add a number followed by at least five dots inside a table cell."
      );
      return;
    }

    if (
      tableCompletionDialogQuestions.some(
        (question) =>
          !String(question.questionNumber).trim() ||
          !String(question.correctAnswer).trim()
      )
    ) {
      setTableCompletionDialogError(
        "Every detected table completion answer must be filled in."
      );
      return;
    }

    if (new Set(normalizedNumbers).size !== normalizedNumbers.length) {
      setTableCompletionDialogError(
        "Each table completion question number must be unique."
      );
      return;
    }

    if (
      tableCompletionDialogQuestions.some((question) => {
        const questionNumber = Number(question.questionNumber);
        return !Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > 40;
      })
    ) {
      setTableCompletionDialogError("Question numbers must be between 1 and 40.");
      return;
    }

    if (
      normalizedNumbers.some((questionNumber) =>
        existingQuestionNumbers.includes(questionNumber)
      )
    ) {
      setTableCompletionDialogError(
        "One or more question numbers are already used in this part."
      );
      return;
    }

    const newQuestionGroup = {
      id: createId(),
      type: "TABLE",
      title: "Table Completion",
      instructions: tableCompletionDialogInstructions.trim(),
      tableHeaders: normalizedHeaders,
      tableRows: normalizedRows,
      items: tableCompletionDialogQuestions.map((question) => ({
        ...question,
        questionNumber: String(question.questionNumber).trim(),
        correctAnswer: String(question.correctAnswer).trim(),
        prompt: buildTableCellPreviewText(question.prompt),
      })),
    };

    setListeningTestForm((currentForm) => ({
      ...currentForm,
      [sectionQuestionsField]: [
        ...(Array.isArray(currentForm[sectionQuestionsField])
          ? currentForm[sectionQuestionsField]
          : []),
        newQuestionGroup,
      ].sort(
        (leftGroup, rightGroup) =>
          getQuestionGroupFirstNumber(leftGroup) -
          getQuestionGroupFirstNumber(rightGroup)
      ),
    }));
    setTableCompletionDialogInstructions("");
    setTableCompletionDialogHeaders(["", ""]);
    setTableCompletionDialogRows([createEmptyTableCompletionRow()]);
    setTableCompletionDialogQuestions([]);
    setTableCompletionDialogError("");
    setIsTableCompletionDialogOpen(false);
    setListeningTestError("");
  }

  async function handleSaveListeningTest() {
    if (isSavingListeningTest) {
      return;
    }

    if (!listeningTestForm.testName.trim()) {
      setListeningTestError("Test name is required.");
      return;
    }

    if (
      [1, 2, 3, 4].some(
        (sectionNumber) =>
          !String(listeningTestForm[`part${sectionNumber}Title`] || "").trim()
      )
    ) {
      setListeningTestError("Each listening part needs a title.");
      return;
    }

    try {
      setIsSavingListeningTest(true);
      setListeningTestError("");
      setListeningTestNotice("");
      setSaveProgress({ sectionNumber: 0, progress: 0 });

      const difficultyLabel =
        difficultyOptions.find(
          (option) => option.value === listeningTestForm.testDifficulty
        )?.label || "Medium";
      const existingTest = listeningTests.find(
        (test) => test.id === editingListeningTestId
      );
      const existingAudioAssetsBySection = { 1: {}, 2: {}, 3: {}, 4: {} };

      (Array.isArray(existingTest?.sections) ? existingTest.sections : []).forEach(
        (section, index) => {
          const sectionNumber = Number(section?.sectionNumber) || index + 1;
          existingAudioAssetsBySection[sectionNumber] = {
            audioUrl: section?.audioUrl || "",
            audioPath: section?.audioPath || "",
          };
        }
      );

      const { notice, savedTest } = await withTimeout(
        saveListeningTest({
          editingTestId: editingListeningTestId,
          formValues: listeningTestForm,
          difficultyLabel,
          selectedAudioFilesBySection,
          existingAudioAssetsBySection,
          onUploadProgress: (sectionNumber, progress) => {
            setSaveProgress({ sectionNumber, progress });
          },
        }),
        240000,
        "Saving the listening test took too long. Please try again."
      );

      setListeningTests((currentTests) => [
        savedTest,
        ...currentTests.filter((test) => test.id !== savedTest.id),
      ]);
      setListeningTestNotice(notice);
      setIsListeningTestComposerOpen(false);
      setEditingListeningTestId("");
      setSaveProgress({ sectionNumber: 0, progress: 0 });
    } catch (error) {
      console.error("[Creator] Failed to save listening test:", error);
      setListeningTestError(error?.message || "Failed to save listening test.");
    } finally {
      setIsSavingListeningTest(false);
    }
  }

  async function handleDeleteListeningTest(test) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this listening test?"
    );

    if (!shouldDelete || isDeletingListeningTest) {
      return;
    }

    try {
      setIsDeletingListeningTest(true);
      setListeningTestError("");
      setListeningTestNotice("");
      setListeningTests((currentTests) =>
        currentTests.filter((currentTest) => currentTest.id !== test.id)
      );

      if (editingListeningTestId === test.id) {
        handleCloseListeningTestComposer();
      }

      await withTimeout(
        deleteListeningTest(test),
        30000,
        "Deleting the listening test took too long. Please try again."
      );

      setListeningTestNotice("Listening test deleted.");
    } catch (error) {
      console.error("[Creator] Failed to delete listening test:", error);
      setListeningTestError(error?.message || "Failed to delete listening test.");
      setListeningTests((currentTests) => [test, ...currentTests]);
    } finally {
      setIsDeletingListeningTest(false);
    }
  }

  return (
    <>
      <div className="flex min-h-full flex-col gap-6">
        {isTfngDialogOpen ? (
          <TfngQuestionDialog
            sectionNumber={tfngDialogSectionNumber}
            questions={tfngDialogQuestions}
            errorMessage={tfngDialogError}
            onChangeQuestion={handleChangeTfngQuestion}
            onAddQuestion={handleAddTfngQuestion}
            onRemoveQuestion={handleRemoveTfngQuestion}
            onClose={handleCloseTfngDialog}
            onSave={handleSaveTfngQuestions}
            themeMode={themeMode}
          />
        ) : null}

        {isMultipleChoiceDialogOpen ? (
          <MultipleChoiceDialog
            sectionNumber={multipleChoiceDialogSectionNumber}
            instructions={multipleChoiceDialogInstructions}
            sourceText={multipleChoiceDialogText}
            questions={multipleChoiceDialogQuestions}
            errorMessage={multipleChoiceDialogError}
            onChangeInstructions={handleChangeMultipleChoiceInstructions}
            onChangeText={handleChangeMultipleChoiceText}
            onAddQuestion={handleAddMultipleChoiceQuestion}
            onChangeQuestionField={handleChangeMultipleChoiceQuestionField}
            onChangeQuestionOption={handleChangeMultipleChoiceQuestionOption}
            onChangeQuestionAnswer={handleChangeMultipleChoiceQuestionAnswer}
            onClose={handleCloseMultipleChoiceDialog}
            onSave={handleSaveMultipleChoiceQuestions}
            themeMode={themeMode}
          />
        ) : null}

        {isMatchingInformationDialogOpen ? (
          <MatchingInformationDialog
            sectionNumber={matchingInformationDialogSectionNumber}
            questions={matchingInformationDialogQuestions}
            instructions={matchingInformationDialogInstructions}
            questionsText={matchingInformationDialogQuestionsText}
            answersText={matchingInformationDialogPossibleAnswersText}
            errorMessage={matchingInformationDialogError}
            onChangeInstructions={handleChangeMatchingInformationInstructions}
            onChangeQuestionsText={handleChangeMatchingInformationQuestionsText}
            onChangeAnswersText={handleChangeMatchingInformationPossibleAnswersText}
            onChangeQuestion={handleChangeMatchingInformationQuestion}
            onRemoveQuestion={handleRemoveMatchingInformationQuestion}
            onClose={handleCloseMatchingInformationDialog}
            onSave={handleSaveMatchingInformationQuestions}
            themeMode={themeMode}
          />
        ) : null}

        {isTableCompletionDialogOpen ? (
          <TableCompletionDialog
            sectionNumber={tableCompletionDialogSectionNumber}
            instructions={tableCompletionDialogInstructions}
            headers={tableCompletionDialogHeaders}
            rows={tableCompletionDialogRows}
            questions={tableCompletionDialogQuestions}
            errorMessage={tableCompletionDialogError}
            onChangeInstructions={handleChangeTableCompletionInstructions}
            onAddColumn={handleAddTableCompletionColumn}
            onRemoveColumn={handleRemoveTableCompletionColumn}
            onChangeHeader={handleChangeTableCompletionHeader}
            onAddRow={handleAddTableCompletionRow}
            onRemoveRow={handleRemoveTableCompletionRow}
            onChangeCell={handleChangeTableCompletionCell}
            onChangeQuestion={handleChangeTableCompletionQuestion}
            onClose={handleCloseTableCompletionDialog}
            onSave={handleSaveTableCompletionQuestions}
            themeMode={themeMode}
          />
        ) : null}

        <section className="flex min-h-[calc(100vh-4rem)] flex-col">
          <div className="flex flex-1 flex-col gap-6">
            {isListeningTestComposerOpen ? (
              <ListeningTestPanel
                formValues={listeningTestForm}
                questionTypeSelections={questionTypeSelections}
                partAudioNames={selectedAudioNamesBySection}
                partAudioPreviewUrls={selectedAudioPreviewUrlsBySection}
                isSaving={isSavingListeningTest}
                saveProgress={saveProgress}
                errorMessage={listeningTestError}
                themeMode={themeMode}
                onClose={handleCloseListeningTestComposer}
                onChange={handleListeningTestChange}
                onAudioChange={handleListeningAudioChange}
                onAddQuestionType={handleAddListeningQuestionType}
                onDeleteListeningQuestionItem={handleDeleteListeningQuestionItem}
                onSave={handleSaveListeningTest}
              />
            ) : (
              <>
                {listeningTestNotice ? (
                  <div className="w-full rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm font-medium text-warning-content">
                    {listeningTestNotice}
                  </div>
                ) : null}

                {listeningTests.length > 0 ? (
                  <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {listeningTests.map((test) => (
                      <ListeningTestCard
                        key={test.id}
                        test={test}
                        onDelete={handleDeleteListeningTest}
                        onEdit={handleEditListeningTest}
                      />
                    ))}
                  </div>
                ) : isListeningTestsLoading ? (
                  <div className="w-full rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
                    <p className="text-lg font-medium text-base-content/65">
                      Loading listening tests...
                    </p>
                  </div>
                ) : (
                  <div className="w-full rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
                    <p className="text-lg font-medium text-base-content/65">
                      No listening tests yet.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
});

export default ListeningTestCreator;

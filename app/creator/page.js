"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AcademicCapIcon,
  Bars3Icon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ComputerDesktopIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRequireRole } from "../../lib/firebase/role-guard";
import {
  deleteReadingTest,
  listReadingTests,
  saveReadingTest,
} from "../../lib/tests/reading-tests";
import {
  deleteWritingTest,
  listWritingTests,
  saveWritingTest,
} from "../../lib/tests/writing-tests";

const mockExamItems = [
  {
    key: "reading-test",
    label: "Reading Test",
    icon: BookOpenIcon,
  },
  {
    key: "writing-test",
    label: "Writing Test",
    icon: PencilSquareIcon,
  },
  {
    key: "listening-test",
    label: "Listening Test",
    icon: MusicalNoteIcon,
  },
  {
    key: "speaking-test",
    label: "Speaking Test",
    icon: MicrophoneIcon,
  },
];

const practiceActivityItems = [
  {
    key: "grammar",
    label: "Grammar",
    icon: AcademicCapIcon,
  },
  {
    key: "reading",
    label: "Reading",
    icon: BookOpenIcon,
  },
  {
    key: "writing",
    label: "Writing",
    icon: PencilSquareIcon,
  },
  {
    key: "speed-typing",
    label: "Speed Typing",
    icon: ClockIcon,
  },
];

const sidebarSections = [
  {
    key: "mock-exams",
    label: "Mock Exams",
    icon: ComputerDesktopIcon,
    items: mockExamItems,
  },
  {
    key: "practice-activity",
    label: "Practice Activity",
    icon: ClipboardDocumentCheckIcon,
    items: practiceActivityItems,
  },
];

const allSidebarItems = sidebarSections.flatMap((section) => section.items);

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function revokePreviewUrl(url) {
  if (typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
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

const readingQuestionTypes = [
  "Multiple Choice",
  "True / False / Not Given (or Yes / No / Not Given)",
  "All Matching Activities",
  "Sentence Completion",
  "Summary Completion",
  "Note Completion",
  "Table Completion",
  "Flow-chart Completion",
  "Diagram Label Completion",
  "Short Answer Questions",
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

const matchingActivityOptions = [
  {
    value: "MATCH_PARAGRAPHS_TO_INFO",
    label: "Match paragraphs to info",
  },
  {
    value: "MATCH_INFO_TO_PARAGRAPHS",
    label: "Match info to paragraphs",
  },
];

function createEmptyTfngQuestion(answerType = "TFNG") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    answerType,
    questionNumber: "",
    prompt: "",
    correctAnswer: answerTypeOptions[answerType]?.values?.[0] || "TRUE",
  };
}

function getNextReadingQuestionNumber(questions, existingQuestionNumbers = []) {
  const allNumbers = [
    ...existingQuestionNumbers,
    ...questions.map((question) => Number(question.questionNumber)),
  ].filter((value) => Number.isInteger(value) && value >= 1 && value <= 40);

  if (allNumbers.length === 0) {
    return "1";
  }

  const highestQuestionNumber = Math.max(...allNumbers);
  return String(Math.min(40, highestQuestionNumber + 1));
}

function getQuestionGroupFirstNumber(questionGroup) {
  if (!Array.isArray(questionGroup?.items) || questionGroup.items.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const firstNumber = Number(questionGroup.items[0]?.questionNumber);
  return Number.isInteger(firstNumber) ? firstNumber : Number.POSITIVE_INFINITY;
}

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

function flattenSectionQuestionItems(questionGroups = []) {
  return questionGroups.flatMap((questionGroup) => {
    const sortedItems = sortQuestionItemsByNumber(questionGroup.items);

    return sortedItems.map((item) => ({
      ...item,
      groupId: questionGroup.id,
      questionType: questionGroup.type,
      questionTypeTitle:
        questionGroup.type === "TFNG"
          ? "True / False / Not Given"
          : questionGroup.type === "MATCHING_INFORMATION"
            ? "Matching Information"
            : questionGroup.type === "SUMMARY_COMPLETION"
              ? "Summary Completion"
              : questionGroup.type === "MULTIPLE_CHOICE"
                ? "Multiple Choice"
                : questionGroup.type === "TABLE"
                  ? "Table Completion"
                : "Question",
      sourceText:
        questionGroup.type === "SUMMARY_COMPLETION"
          ? questionGroup.summaryText || ""
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

function extractParagraphLabels(passageText) {
  const matches = String(passageText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^([A-Z])(?:[\.\)]|\s|$)/);
      return match ? match[1] : "";
    })
    .filter(Boolean);

  return [...new Set(matches)];
}

function createEmptyMatchingInformationQuestion(paragraphLabels = []) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    questionNumber: "",
    prompt: "",
    correctAnswer: paragraphLabels[0] || "",
  };
}

function parseSummaryCompletionQuestions(summaryText) {
  const matches = [...String(summaryText || "").matchAll(/(\d+)\s*\.{5,}/g)];

  return matches.map((match, index) => ({
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    questionNumber: match[1],
    correctAnswer: "",
  }));
}

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

    const optionMatch = line.match(/^([A-D])[\.\)]?\s+(.+)$/i);

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
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    questionNumber: block.questionNumber,
    prompt: block.promptLines.join(" ").trim(),
    options: block.optionLines,
    correctAnswer: "",
  }));
}

function createEmptyMultipleChoiceQuestion() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    questionNumber: "",
    prompt: "",
    options: [
      { label: "A", text: "" },
      { label: "B", text: "" },
      { label: "C", text: "" },
      { label: "D", text: "" },
    ],
    correctAnswer: "",
  };
}

function getMatchingActivityLabel(activityType) {
  return (
    matchingActivityOptions.find((option) => option.value === activityType)
      ?.label || "Match info to paragraphs"
  );
}

function buildDefaultParagraphPromptLines(paragraphLabels = []) {
  return paragraphLabels.map((label) => `Paragraph ${label}`).join("\n");
}

function parseNonEmptyLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseMatchingQuestionLines(value) {
  return parseNonEmptyLines(value).map((line, index) => {
    const match = line.match(/^(\d+)\s+(.+)$/);

    if (match) {
      return {
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        questionNumber: match[1],
        prompt: match[2].trim(),
      };
    }

    return {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      questionNumber: "",
      prompt: line,
    };
  });
}

function createEmptyTableCompletionRow(columnCount = 2) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cells: Array.from({ length: Math.max(1, columnCount) }, () => ""),
  };
}

function buildTableCellPreviewText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

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
          id:
            matchingPreviousQuestion?.id ||
            `${Date.now()}-${rowIndex}-${cellIndex}-${blankOrder}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
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

function createEmptyReadingForm() {
  return {
    testName: "",
    testDifficulty: "medium",
    date: getTodayDate(),
    section1Title: "",
    section1Subtitle: "",
    section1Text: "",
    section1Questions: [],
    section2Title: "",
    section2Subtitle: "",
    section2Text: "",
    section2Questions: [],
    section3Title: "",
    section3Subtitle: "",
    section3Text: "",
    section3Questions: [],
  };
}

function createEmptyReadingQuestionTypeSelections() {
  return {
    1: "",
    2: "",
    3: "",
  };
}

function createReadingFormFromTest(test) {
  const nextForm = createEmptyReadingForm();
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
    const titleField = `section${sectionNumber}Title`;
    const subtitleField = `section${sectionNumber}Subtitle`;
    const textField = `section${sectionNumber}Text`;
    const questionsField = `section${sectionNumber}Questions`;

    nextForm[titleField] = section?.title || "";
    nextForm[subtitleField] = section?.subtitle || "";
    nextForm[textField] = section?.passage || "";
    nextForm[questionsField] = Array.isArray(section?.questions)
      ? section.questions
          .flatMap((questionGroup) => {
            if (questionGroup.type === "TFNG") {
              return [
                {
                  id:
                    questionGroup.id ||
                    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  type: "TFNG",
                  title: questionGroup.title || "True / False / Not Given",
                  items: Array.isArray(questionGroup.questions)
                    ? questionGroup.questions.map((question) => ({
                        id:
                          question.id ||
                          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

            if (questionGroup.type === "MATCHING_INFORMATION") {
              return [
                {
                  id:
                    questionGroup.id ||
                    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  type: "MATCHING_INFORMATION",
                  title:
                    questionGroup.title || "Matching Information (to paragraphs)",
                  activityType:
                    questionGroup.activityType || "MATCH_INFO_TO_PARAGRAPHS",
                  instructions: questionGroup.instructions || "",
                  items: Array.isArray(questionGroup.questions)
                    ? questionGroup.questions.map((question) => ({
                        id:
                          question.id ||
                          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        questionNumber: String(question.number || ""),
                        prompt: question.question || "",
                        correctAnswer: question.correctAnswer || "",
                      }))
                    : [],
                },
              ];
            }

            if (questionGroup.type === "SUMMARY_COMPLETION") {
              return [
                {
                  id:
                    questionGroup.id ||
                    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  type: "SUMMARY_COMPLETION",
                  title: questionGroup.title || "Summary Completion",
                  instructions: questionGroup.instructions || "",
                  summaryText: questionGroup.summaryText || "",
                  items: Array.isArray(questionGroup.questions)
                    ? questionGroup.questions.map((question) => ({
                        id:
                          question.id ||
                          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        questionNumber: String(question.number || ""),
                        correctAnswer: question.correctAnswer || "",
                      }))
                    : [],
                },
              ];
            }

            if (questionGroup.type === "MULTIPLE_CHOICE") {
              return [
                {
                  id:
                    questionGroup.id ||
                    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  type: "MULTIPLE_CHOICE",
                  title: questionGroup.title || "Multiple Choice",
                  instructions: questionGroup.instructions || "",
                  sourceText: questionGroup.sourceText || "",
                  items: Array.isArray(questionGroup.questions)
                    ? questionGroup.questions.map((question) => ({
                        id:
                          question.id ||
                          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        questionNumber: String(question.number || ""),
                        prompt: question.question || "",
                        options: Array.isArray(question.options)
                          ? question.options.map((option) => ({
                              label: option.label || "",
                              text: option.text || "",
                            }))
                          : [],
                        correctAnswer: question.correctAnswer || "",
                      }))
                    : [],
                },
              ];
            }

            if (questionGroup.type === "TABLE") {
              const tableRows = Array.isArray(questionGroup.table?.rows)
                ? questionGroup.table.rows.map((row, rowIndex) => ({
                    id: `${Date.now()}-${rowIndex}-${Math.random()
                      .toString(36)
                      .slice(2, 8)}`,
                    cells: Array.isArray(row?.cells) ? row.cells : [""],
                  }))
                : [createEmptyTableCompletionRow()];

              const detectedItems = extractTableCompletionQuestions(
                tableRows,
                Array.isArray(questionGroup.questions)
                  ? questionGroup.questions.map((question) => ({
                      id:
                        question.id ||
                        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      questionNumber: String(question.number || ""),
                      correctAnswer: question.correctAnswer || "",
                    }))
                  : []
              );

              return [
                {
                  id:
                    questionGroup.id ||
                    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  type: "TABLE",
                  title: questionGroup.title || "Table Completion",
                  instructions: questionGroup.instructions || "",
                  tableHeaders: Array.isArray(questionGroup.table?.headers)
                    ? questionGroup.table.headers
                    : ["", ""],
                  tableRows,
                  items: detectedItems,
                },
              ];
            }

            return [];
          })
      : [];
  });

  return nextForm;
}

function SidebarItem({
  item,
  isCollapsed,
  isActive,
  onSelect,
  nested = false,
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      title={isCollapsed ? item.label : undefined}
      className={`btn btn-ghost h-12 justify-start rounded-xl px-3 normal-case transition ${
        isActive
          ? "bg-base-100 text-primary shadow-sm"
          : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
      } ${nested ? "text-sm" : ""}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
}

function SidebarSection({
  label,
  icon: Icon,
  items,
  isCollapsed,
  isOpen,
  activeItemKey,
  onToggle,
  onSelect,
}) {
  const hasActiveItem = items.some((item) => item.key === activeItemKey);

  return (
    <div className="mt-2 flex flex-col gap-1">
      <button
        type="button"
        onClick={onToggle}
        title={isCollapsed ? label : undefined}
        className={`flex h-12 items-center rounded-xl px-3 transition ${
          hasActiveItem || isOpen
            ? "bg-base-200 text-base-content"
            : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && (
          <>
            <span className="ml-3 flex-1 truncate text-left font-medium">
              {label}
            </span>
            {isOpen ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div className={`flex flex-col gap-1 ${isCollapsed ? "" : "pl-3"}`}>
          {items.map((item) => (
            <SidebarItem
              key={item.key}
              item={item}
              isCollapsed={isCollapsed}
              isActive={activeItemKey === item.key}
              onSelect={onSelect}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
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

const darkSelectClassName =
  "select w-full border-[#233447] bg-[#1b2a3a] px-4 text-white focus:border-[#3b5168] focus:outline-none";
const darkInputClassName =
  "input border-[#233447] bg-[#1b2a3a] px-4 text-white placeholder:text-white/45 focus:border-[#3b5168] focus:outline-none";
const darkTextareaClassName =
  "textarea border-[#233447] bg-[#1b2a3a] px-4 py-3 text-white placeholder:text-white/45 focus:border-[#3b5168] focus:outline-none";

function WritingTestCard({ test, onDelete, onEdit }) {
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
          <button type="button" className="btn btn-outline" onClick={() => onEdit(test)}>
            Edit Test
          </button>
        </div>
      </div>
    </article>
  );
}

function ReadingTestCard({ test, onDelete, onEdit }) {
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

function WritingTestPanel({
  formValues,
  selectedImageName,
  selectedImagePreviewUrl,
  isSaving,
  hasNewImageUpload,
  uploadProgress,
  errorMessage,
  onClose,
  onChange,
  onImageChange,
  onSave,
}) {
  return (
    <section className="w-full max-w-5xl rounded-3xl border border-base-300 bg-base-100 shadow-xl">
      <div className="flex items-center justify-between border-b border-base-300 px-6 py-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
            IELTS Writing
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Create Writing Test
          </h2>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-square rounded-xl"
          aria-label="Close writing test creator"
          onClick={onClose}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-6 px-6 py-6">
        {isSaving ? (
          <div className="rounded-2xl border border-info/30 bg-info/10 px-5 py-4 text-sm font-medium text-info-content">
            {hasNewImageUpload
              ? `Uploading image and saving test... ${uploadProgress}%`
              : "Saving test..."}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="form-control md:col-span-1">
            <span className="label-text mb-2 font-medium">Test Name</span>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Enter test name"
              value={formValues.testName}
              onChange={(event) => onChange("testName", event.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-2 font-medium">Test Difficulty</span>
            <select
              className="select select-bordered w-full"
              style={{ color: getDifficultyTextColor(formValues.testDifficulty) }}
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
              className="input input-bordered w-full"
              value={formValues.date}
              readOnly
            />
          </label>
        </div>

        <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Section 1
            </p>
            <h3 className="text-xl font-semibold">Part 1</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-3xl font-black uppercase tracking-[0.18em] text-[#1b2ea8]">
                Writing Task 1
              </p>
              <p className="text-lg font-medium">
                You should spend about 20 minutes on this task.
              </p>
            </div>

            <label className="form-control">
              <span className="label-text mb-2 font-medium">Task Prompt</span>
              <textarea
                className="textarea textarea-bordered min-h-44 w-full leading-7"
                placeholder={
                  "Enter the Task 1 prompt here.\n\nUse blank lines, numbering, or extra instructions exactly as you want them to appear."
                }
                value={formValues.part1Prompt}
                onChange={(event) =>
                  onChange("part1Prompt", event.target.value)
                }
              />
              <span className="label-text-alt mt-2 text-base-content/60">
                Blank lines and line breaks are preserved while editing.
              </span>
            </label>

            <p className="text-lg font-medium">Write at least 150 words.</p>

            <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/40 p-4">
              <p className="mb-3 font-medium">Upload Image</p>
              <input
                type="file"
                accept="image/*"
                className="file-input file-input-bordered w-full"
                onChange={onImageChange}
              />
              <p className="mt-3 text-sm text-base-content/65">
                {selectedImageName || "No image selected"}
              </p>

              <div className="mt-4 rounded-2xl border border-base-300 bg-base-100 p-4">
                <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-base-content/45">
                  Image Preview
                </p>
                {selectedImagePreviewUrl ? (
                  <img
                    src={selectedImagePreviewUrl}
                    alt="Task 1 uploaded preview"
                    className="max-h-[32rem] w-full rounded-xl object-contain"
                  />
                ) : (
                  <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-base-300 bg-base-200/50 px-6 text-center text-base-content/55">
                    Uploaded Task 1 visual will appear here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Section 2
            </p>
            <h3 className="text-xl font-semibold">Part 2</h3>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-3xl font-black uppercase tracking-[0.18em] text-[#1b2ea8]">
                  Writing Task 2
                </p>
                <p className="text-lg font-medium">
                  You should spend about 40 minutes on this task.
                </p>
                <p className="text-lg font-medium">
                  Write about the following topic:
                </p>
              </div>

              <label className="form-control">
                <span className="label-text mb-2 font-medium">
                  Task Prompt
                </span>
                <textarea
                  className="textarea textarea-bordered min-h-52 w-full leading-7"
                  placeholder={
                    "Enter the Task 2 prompt here.\n\nUse blank lines, numbering, or extra instructions exactly as you want them to appear."
                  }
                  value={formValues.part2Prompt}
                  onChange={(event) => onChange("part2Prompt", event.target.value)}
                />
                <span className="label-text-alt mt-2 text-base-content/60">
                  Blank lines and line breaks are preserved while editing.
                </span>
              </label>

              <div className="space-y-3">
                <p className="text-lg font-medium">Write at least 250 words.</p>
              </div>
            </div>
          </div>
        </section>
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
        <CreatorActionButton onClick={onSave}>
          {isSaving ? "Saving..." : "Save Test"}
        </CreatorActionButton>
      </div>
    </section>
  );
}

function ReadingTestPanel({
  formValues,
  questionTypeSelections,
  isSidebarCollapsed,
  isSaving,
  errorMessage,
  onClose,
  onChange,
  onAddQuestionType,
  onDeleteReadingQuestionItem,
  onSave,
}) {
  const [confirmState, setConfirmState] = useState(null);
  const [isPortalReady, setIsPortalReady] = useState(false);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  return (
    <>
      <section
        className={`relative z-10 w-full rounded-3xl border border-base-300 bg-base-100 shadow-xl transition-[margin] duration-200 ${
          isSidebarCollapsed ? "ml-52" : "ml-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-base-300 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
              IELTS Reading
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Create Reading Test
            </h2>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-square rounded-xl"
            aria-label="Close reading test creator"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6">
          {isSaving ? (
            <div className="rounded-2xl border border-info/30 bg-info/10 px-5 py-4 text-sm font-medium text-info-content">
              Saving reading test...
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <label className="form-control md:col-span-1">
              <span className="label-text mb-2 font-medium">Test Name</span>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Enter test name"
                value={formValues.testName}
                onChange={(event) => onChange("testName", event.target.value)}
              />
            </label>

            <label className="form-control">
              <span className="label-text mb-2 font-medium">Test Difficulty</span>
              <select
                className="select select-bordered w-full"
                style={{ color: getDifficultyTextColor(formValues.testDifficulty) }}
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
                className="input input-bordered w-full"
                value={formValues.date}
                readOnly
              />
            </label>
          </div>

          {[1, 2, 3].map((sectionNumber) => {
            const titleField = `section${sectionNumber}Title`;
            const subtitleField = `section${sectionNumber}Subtitle`;
            const textField = `section${sectionNumber}Text`;
            const questionsField = `section${sectionNumber}Questions`;
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
                key={`reading-section-${sectionNumber}`}
                className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm"
              >
                <div className="mb-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
                    Section {sectionNumber}
                  </p>
                  <h3 className="text-xl font-semibold">
                    Reading Passage {sectionNumber}
                  </h3>
                </div>

                <div className="grid gap-5">
                  <label className="form-control">
                    <span className="label-text mb-2 font-medium">
                      Section {sectionNumber} - Heading
                    </span>
                    <input
                      type="text"
                      className={`${darkInputClassName} w-full text-lg font-semibold`}
                      placeholder={`Enter the heading for Reading Passage ${sectionNumber}`}
                      value={formValues[titleField]}
                      onChange={(event) =>
                        onChange(titleField, event.target.value)
                      }
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-2 font-medium">
                      Section {sectionNumber} - Subheading
                    </span>
                    <input
                      type="text"
                      className={`${darkInputClassName} w-full`}
                      placeholder={`Enter the subheading for Reading Passage ${sectionNumber}`}
                      value={formValues[subtitleField]}
                      onChange={(event) =>
                        onChange(subtitleField, event.target.value)
                      }
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-2 font-medium">
                      Section {sectionNumber} - Paste text here
                    </span>
                    <textarea
                      className="textarea textarea-bordered min-h-48 w-full leading-7"
                      placeholder={`Paste the full passage for Section ${sectionNumber} here.`}
                      value={formValues[textField]}
                      onChange={(event) =>
                        onChange(textField, event.target.value)
                      }
                    />
                  </label>

                  <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/30 p-4">
                    <p className="mb-3 font-medium">
                      Section {sectionNumber} - Add question type
                    </p>
                    <label className="form-control max-w-md">
                      <span className="sr-only">
                        Select question type for section {sectionNumber}
                      </span>
                      <select
                        className={`${darkSelectClassName} max-w-md font-medium`}
                        style={{
                          backgroundColor: "#1b2a3a",
                          color: "#ffffff",
                        }}
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
                        {readingQuestionTypes.map((questionType) => (
                          <option
                            key={`section-${sectionNumber}-${questionType}`}
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
                          {orderedQuestionItems.length}{" "}
                          questions
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
                                className="btn btn-sm btn-square rounded-xl border border-[#5b2a38] bg-transparent text-error hover:border-[#7a3247] hover:bg-error/10"
                                aria-label={`Delete question ${item.questionNumber || ""}`}
                                onClick={() =>
                                  setConfirmState({
                                    type: "delete-question",
                                    title: "Delete Question",
                                    message: `Are you sure you want to delete Question ${
                                      item.questionNumber || "?"
                                    }?`,
                                    confirmLabel: "Delete",
                                    onConfirm: () => {
                                      onDeleteReadingQuestionItem(
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

                            {item.questionType === "SUMMARY_COMPLETION" ? (
                              <>
                                <p className="mt-2 text-sm leading-7 text-base-content/70">
                                  {item.sourceText
                                    ? `${item.sourceText.slice(0, 180)}${
                                        item.sourceText.length > 180 ? "..." : ""
                                      }`
                                    : "No summary text added yet."}
                                </p>
                                <p className="mt-3 text-sm font-medium text-primary">
                                  Exact answer: {item.correctAnswer || "Not set"}
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
                                  Correct answer: {item.correctAnswer || "Not set"}
                                </p>
                              </>
                            ) : item.questionType === "MATCHING_INFORMATION" ? (
                              <>
                                <p className="mt-2 leading-7">
                                  {item.prompt || "No question text added yet."}
                                </p>
                                <p className="mt-3 text-sm font-medium text-primary">
                                  Correct match: {item.correctAnswer || "Not set"}
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
          <CreatorActionButton onClick={onSave}>
            {isSaving ? "Saving..." : "Save Test"}
          </CreatorActionButton>
        </div>
      </section>

      {isPortalReady && confirmState
        ? createPortal(
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                backgroundColor: "rgba(0, 0, 0, 0.72)",
                backdropFilter: "blur(6px)",
              }}
            >
              <section className="w-full max-w-md rounded-3xl border border-[#233447] bg-[#18232f] p-6 text-white shadow-2xl">
                <h3 className="text-xl font-semibold tracking-tight">
                  {confirmState.title}
                </h3>
                <p className="mt-3 leading-7 text-white/80">
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
                  <CreatorActionButton onClick={confirmState.onConfirm}>
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

function MatchingInformationDialog({
  sectionNumber,
  questions,
  instructions,
  questionsText,
  answersText,
  errorMessage,
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

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  function handleConfirmDelete(question) {
    setConfirmState({
      type: "delete-question",
      title: "Delete Question",
      message: `Are you sure you want to delete Question ${
        question.questionNumber || "?"
      }?`,
      confirmLabel: "Delete",
      onConfirm: () => {
        onRemoveQuestion(question.id);
        setConfirmState(null);
      },
    });
  }

  function handleCloseConfirm() {
    setConfirmState(null);
  }

  if (!isPortalReady) {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <section className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[#233447] bg-[#18232f] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#233447] px-6 py-5 md:px-7">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
              Section {sectionNumber}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Matching Information
            </h2>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-square rounded-xl text-white hover:bg-white/10"
            aria-label="Close matching information dialog"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6 md:px-7 md:py-7">
          <div className="rounded-2xl bg-white/5 px-5 py-4 text-sm leading-7 text-white/75">
            Add the question lines in one field and the selectable answers in the other. The builder will generate a simple matching table underneath.
          </div>

          <section className="mt-1 rounded-2xl bg-[#111a24] p-5 shadow-sm md:p-6">
            <div className="grid gap-6 pt-1">
              <label className="form-control">
                <span className="label-text mb-2 font-medium text-white">
                  Instructions
                </span>
                <textarea
                  className={`${darkTextareaClassName} min-h-28 w-full leading-7`}
                  placeholder="Enter the instructions students should see, for example: Match each person with the correct idea, A-E."
                  value={instructions}
                  onChange={(event) =>
                    onChangeInstructions(event.target.value)
                  }
                />
              </label>

              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <label className="form-control">
                  <span className="label-text mb-2 font-medium text-white">
                    Field 1: Questions
                  </span>
                  <textarea
                    className={`${darkTextareaClassName} min-h-56 w-full leading-7`}
                    placeholder={`20 Peter Toohey\n21 Thomas Goetz\n22 John Eastwood\n23 Francoise Wemelsfelder`}
                    value={questionsText}
                    onChange={(event) =>
                      onChangeQuestionsText(event.target.value)
                    }
                  />
                </label>

                <label className="form-control">
                  <span className="label-text mb-2 font-medium text-white">
                    Field 2: Answers that can be selected
                  </span>
                  <textarea
                    className={`${darkTextareaClassName} min-h-56 w-full leading-7`}
                    placeholder={`A The way we live today may encourage boredom.\nB One sort of boredom is worse than all the others.\nC Levels of boredom may fall in the future.`}
                    value={answersText}
                    onChange={(event) =>
                      onChangeAnswersText(event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="overflow-x-auto rounded-2xl bg-[#0f1720] p-4">
                <table className="table">
                  <thead>
                    <tr className="text-white/70">
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
                            className={`${darkInputClassName} w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
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
                            className={`${darkInputClassName} w-full`}
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
                            className={`${darkSelectClassName} w-full appearance-none`}
                            style={{ backgroundColor: "#1b2a3a", color: "#ffffff" }}
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
                              className="btn btn-sm btn-square rounded-xl border border-[#5b2a38] bg-transparent text-error hover:border-[#7a3247] hover:bg-error/10"
                              aria-label={`Delete question ${question.questionNumber || ""}`}
                              onClick={() => handleConfirmDelete(question)}
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
          <CreatorActionButton onClick={onSave}>
            Save Questions
          </CreatorActionButton>
        </div>
      </section>

      {confirmState ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            backgroundColor: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(6px)",
          }}
        >
          <section className="w-full max-w-md rounded-3xl border border-[#233447] bg-[#18232f] p-6 text-white shadow-2xl">
            <h3 className="text-xl font-semibold tracking-tight">
              {confirmState.title}
            </h3>
            <p className="mt-3 leading-7 text-white/80">
              {confirmState.message}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="btn px-5"
                onClick={handleCloseConfirm}
              >
                Cancel
              </button>
              <CreatorActionButton onClick={confirmState.onConfirm}>
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

function TfngQuestionDialog({
  sectionNumber,
  questions,
  errorMessage,
  onChangeQuestion,
  onAddQuestion,
  onRemoveQuestion,
  onClose,
  onSave,
}) {
  const [isPortalReady, setIsPortalReady] = useState(false);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  if (!isPortalReady) {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <section className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[#233447] bg-[#18232f] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#233447] px-6 py-5 md:px-7">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
              Section {sectionNumber}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              True / False / Not Given
            </h2>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-square rounded-xl text-white hover:bg-white/10"
            aria-label="Close TFNG question dialog"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6 md:px-7 md:py-7">
          <div className="rounded-2xl bg-white/5 px-5 py-4 text-sm leading-7 text-white/75">
            Add one or more TFNG questions for this section. Each question should use a reading test question number from 1 to 40 and one correct answer.
          </div>

          {questions.map((question, index) => (
            <section
              key={question.id}
              className="mt-1 rounded-2xl bg-[#111a24] p-5 shadow-sm md:p-6"
            >
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
                  <span className="label-text mb-2 font-medium text-white">
                    Select Answer Type
                  </span>
                  <select
                    className={`${darkSelectClassName} max-w-sm appearance-none`}
                    style={{
                      backgroundColor: "#1b2a3a",
                      color: "#ffffff",
                    }}
                    value={question.answerType || "TFNG"}
                    onChange={(event) =>
                      onChangeQuestion(
                        question.id,
                        "answerType",
                        event.target.value
                      )
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
                    className={`${darkInputClassName} w-36 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                    placeholder="1-40"
                    value={question.questionNumber}
                    onChange={(event) =>
                      onChangeQuestion(
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
                    className={`${darkTextareaClassName} min-h-32 w-full leading-7`}
                    placeholder="Enter one question statement here. Use Add Another Question below to create multiple questions of the same type."
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
                    className={`${darkSelectClassName} max-w-sm appearance-none`}
                    style={{
                      backgroundColor: "#1b2a3a",
                      color: "#ffffff",
                    }}
                    value={question.correctAnswer}
                    onChange={(event) =>
                      onChangeQuestion(
                        question.id,
                        "correctAnswer",
                        event.target.value
                      )
                    }
                  >
                    {(answerTypeOptions[question.answerType || "TFNG"]?.values ||
                      []).map((option) => (
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
              className="btn rounded-xl border-[#3b5168] bg-transparent px-5 text-white hover:border-[#4a647f] hover:bg-white/5"
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
          <CreatorActionButton onClick={onSave}>
            Save Questions
          </CreatorActionButton>
        </div>
      </section>
    </div>,
    document.body
  );
}

function SummaryCompletionDialog({
  sectionNumber,
  instructions,
  summaryText,
  questions,
  errorMessage,
  onChangeInstructions,
  onChangeText,
  onChangeQuestion,
  onClose,
  onSave,
}) {
  const [isPortalReady, setIsPortalReady] = useState(false);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  if (!isPortalReady) {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <section className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[#233447] bg-[#18232f] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#233447] px-6 py-5 md:px-7">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
              Section {sectionNumber}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Summary Completion
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-square rounded-xl text-white hover:bg-white/10"
            aria-label="Close summary completion dialog"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6 md:px-7 md:py-7">
          <div className="rounded-2xl bg-white/5 px-5 py-4 text-sm leading-7 text-white/75">
            Paste the full summary text once. The builder will automatically detect blanks when it finds a question number followed by at least five dots, like 24 ........
          </div>

          <section className="rounded-2xl bg-[#111a24] p-5 shadow-sm md:p-6">
            <div className="grid gap-6">
              <label className="form-control">
                <span className="label-text mb-2 font-medium text-white">
                  Instructions
                </span>
                <textarea
                  className={`${darkTextareaClassName} min-h-24 w-full leading-7`}
                  placeholder="Enter the instructions students should see."
                  value={instructions}
                  onChange={(event) => onChangeInstructions(event.target.value)}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-2 font-medium text-white">
                  Summary Text
                </span>
                <textarea
                  className={`${darkTextareaClassName} min-h-72 w-full leading-7`}
                  placeholder="Paste the summary completion text here."
                  value={summaryText}
                  onChange={(event) => onChangeText(event.target.value)}
                />
              </label>

              <div className="rounded-2xl bg-[#0f1720] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="font-medium text-white">Generated Answer Fields</p>
                  <div className="badge badge-outline">{questions.length} answers</div>
                </div>

                {questions.length > 0 ? (
                  <div className="space-y-4">
                    {questions.map((question) => (
                      <div
                        key={question.id}
                        className="grid gap-3 rounded-2xl border border-[#233447] bg-[#111a24] p-4 md:grid-cols-[120px_minmax(0,1fr)]"
                      >
                        <div>
                          <p className="text-sm font-medium text-white/60">
                            Question
                          </p>
                          <p className="mt-1 text-lg font-semibold">
                            {question.questionNumber}
                          </p>
                        </div>
                        <label className="form-control">
                          <span className="label-text mb-2 font-medium text-white">
                            Enter Correct Answer
                          </span>
                          <input
                            type="text"
                            className={`${darkInputClassName} w-full`}
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
                  <p className="text-sm leading-7 text-white/60">
                    No blanks detected yet. Add a number followed by at least five dots in the summary text to generate answer fields.
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
          <CreatorActionButton onClick={onSave}>
            Save Questions
          </CreatorActionButton>
        </div>
      </section>
    </div>,
    document.body
  );
}

function MultipleChoiceDialog({
  sectionNumber,
  instructions,
  sourceText,
  questions,
  errorMessage,
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

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  if (!isPortalReady) {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <section className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[#233447] bg-[#18232f] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#233447] px-6 py-5 md:px-7">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
              Section {sectionNumber}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Multiple Choice
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-square rounded-xl text-white hover:bg-white/10"
            aria-label="Close multiple choice dialog"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6 md:px-7 md:py-7">
          <div className="rounded-2xl bg-white/5 px-5 py-4 text-sm leading-7 text-white/75">
            Paste the full IELTS multiple choice block once. The builder will detect the question number, question text, and A-D choices automatically so the teacher only needs to pick the correct answer.
          </div>

          <section className="rounded-2xl bg-[#111a24] p-5 shadow-sm md:p-6">
            <div className="grid gap-6">
              <label className="form-control">
                <span className="label-text mb-2 font-medium text-white">
                  Instructions
                </span>
                <textarea
                  className={`${darkTextareaClassName} min-h-24 w-full leading-7`}
                  placeholder="Enter the instructions students should see."
                  value={instructions}
                  onChange={(event) => onChangeInstructions(event.target.value)}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-2 font-medium text-white">
                  Multiple Choice Text
                </span>
                <textarea
                  className={`${darkTextareaClassName} min-h-72 w-full leading-7`}
                  placeholder="Paste the multiple choice question block here."
                  value={sourceText}
                  onChange={(event) => onChangeText(event.target.value)}
                />
              </label>

              <div className="rounded-2xl bg-[#0f1720] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="font-medium text-white">Generated Questions</p>
                  <div className="badge badge-outline">{questions.length} questions</div>
                </div>

                {questions.length > 0 ? (
                  <div className="space-y-4">
                    {questions.map((question) => (
                      <div
                        key={question.id}
                        className="rounded-2xl border border-[#233447] bg-[#111a24] p-4"
                      >
                        <label className="form-control max-w-xs">
                          <span className="label-text mb-3 font-medium text-white">
                            Question Number
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="40"
                            className={`${darkInputClassName} w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
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

                        <label className="form-control mt-4 block">
                          <span className="label-text mb-3 font-medium text-white">
                            Question Text
                          </span>
                          <textarea
                            className={`${darkTextareaClassName} min-h-24 w-full leading-7`}
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

                        <div className="mt-4 space-y-3">
                          {question.options.map((option) => (
                            <div
                              key={`${question.id}-${option.label}`}
                              className="rounded-xl border border-[#233447] bg-[#18232f] px-5 py-4"
                            >
                              <div className="flex items-center gap-4">
                                <input
                                  type="radio"
                                  name={`multiple-choice-${question.id}`}
                                  className="radio radio-sm"
                                  checked={question.correctAnswer === option.label}
                                  onChange={() =>
                                    onChangeQuestionAnswer(question.id, option.label)
                                  }
                                />
                                <span className="font-semibold text-white">
                                  {option.label}.
                                </span>
                                <input
                                  type="text"
                                  className={`${darkInputClassName} flex-1`}
                                  value={option.text}
                                  onChange={(event) =>
                                    onChangeQuestionOption(
                                      question.id,
                                      option.label,
                                      event.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-white/60">
                    No multiple choice questions detected yet. Paste a numbered question followed by A, B, C, and D options to generate them.
                  </p>
                )}

                <div className="pt-4">
                  <button
                    type="button"
                    className="btn rounded-xl border-[#3b5168] bg-transparent px-5 text-white hover:border-[#4a647f] hover:bg-white/5"
                    onClick={onAddQuestion}
                  >
                    Add Another Question
                  </button>
                </div>
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
          <CreatorActionButton onClick={onSave}>
            Save Questions
          </CreatorActionButton>
        </div>
      </section>
    </div>,
    document.body
  );
}

function TableCompletionDialog({
  sectionNumber,
  instructions,
  headers,
  rows,
  questions,
  errorMessage,
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

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  if (!isPortalReady) {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <section className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto rounded-3xl border border-[#233447] bg-[#18232f] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#233447] px-6 py-5 md:px-7">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
              Section {sectionNumber}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Table Completion
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-square rounded-xl text-white hover:bg-white/10"
            aria-label="Close table completion dialog"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6 md:px-7 md:py-7">
          <div className="rounded-2xl bg-white/5 px-5 py-4 text-sm leading-7 text-white/75">
            Build the table first, then type each numbered blank directly inside the right cell using at least five dots, like 5 ........ . Every detected numbered blank becomes a student answer field automatically, including multiple blanks in the same cell.
          </div>

          <section className="rounded-2xl bg-[#111a24] p-5 shadow-sm md:p-6">
            <div className="grid gap-6">
              <label className="form-control">
                <span className="label-text mb-2 font-medium text-white">
                  Instructions
                </span>
                <textarea
                  className={`${darkTextareaClassName} min-h-24 w-full leading-7`}
                  placeholder="Enter the instructions students should see."
                  value={instructions}
                  onChange={(event) => onChangeInstructions(event.target.value)}
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn rounded-xl border-[#3b5168] bg-transparent px-5 text-white hover:border-[#4a647f] hover:bg-white/5"
                  onClick={onAddColumn}
                >
                  Add Column
                </button>
                <button
                  type="button"
                  className="btn rounded-xl border-[#3b5168] bg-transparent px-5 text-white hover:border-[#4a647f] hover:bg-white/5"
                  onClick={onAddRow}
                >
                  Add Row
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#233447] bg-[#0f1720] p-4">
                <table className="w-full min-w-[720px] border-separate border-spacing-0">
                  <thead>
                    <tr>
                      {headers.map((header, headerIndex) => (
                        <th
                          key={`table-header-${headerIndex}`}
                          className="border border-[#233447] bg-[#18232f] p-3 align-top"
                        >
                          <div className="space-y-3">
                            <input
                              type="text"
                              className={`${darkInputClassName} w-full`}
                              placeholder={`Column ${headerIndex + 1} heading`}
                              value={header}
                              onChange={(event) =>
                                onChangeHeader(headerIndex, event.target.value)
                              }
                            />
                            {headers.length > 1 ? (
                              <button
                                type="button"
                                className="btn btn-sm rounded-xl border-[#5b2a38] bg-transparent text-white hover:border-[#7a3247] hover:bg-white/5"
                                onClick={() => onRemoveColumn(headerIndex)}
                              >
                                Remove Column
                              </button>
                            ) : null}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={row.id}>
                        {row.cells.map((cell, cellIndex) => (
                          <td
                            key={`${row.id}-${cellIndex}`}
                            className="border border-[#233447] p-3 align-top"
                          >
                            <textarea
                              className={`${darkTextareaClassName} min-h-28 w-full leading-7`}
                              placeholder={`Row ${rowIndex + 1}, column ${cellIndex + 1}`}
                              value={cell}
                              onChange={(event) =>
                                onChangeCell(row.id, cellIndex, event.target.value)
                              }
                            />
                          </td>
                        ))}
                        <td className="p-3 align-top">
                          {rows.length > 1 ? (
                            <button
                              type="button"
                              className="btn btn-sm rounded-xl border-[#5b2a38] bg-transparent text-white hover:border-[#7a3247] hover:bg-white/5"
                              onClick={() => onRemoveRow(row.id)}
                            >
                              Remove Row
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl bg-[#0f1720] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="font-medium text-white">Detected Answers</p>
                  <div className="badge badge-outline">{questions.length} answers</div>
                </div>

                {questions.length > 0 ? (
                  <div className="space-y-4">
                    {questions.map((question) => (
                      <div
                        key={question.id}
                        className="grid gap-3 rounded-2xl border border-[#233447] bg-[#111a24] p-4 md:grid-cols-[120px_minmax(0,1fr)]"
                      >
                        <div>
                          <p className="text-sm font-medium text-white/60">
                            Question
                          </p>
                          <p className="mt-1 text-lg font-semibold">
                            {question.questionNumber}
                          </p>
                        </div>
                        <label className="form-control">
                          <span className="label-text mb-2 font-medium text-white">
                            Enter Correct Answer
                          </span>
                          <input
                            type="text"
                            className={`${darkInputClassName} w-full`}
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
                  <p className="text-sm leading-7 text-white/60">
                    No answer fields detected yet. Add a number followed by at least five dots inside any table cell to generate them automatically.
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
          <CreatorActionButton onClick={onSave}>
            Save Questions
          </CreatorActionButton>
        </div>
      </section>
    </div>,
    document.body
  );
}

function CenteredAlertDialog({ message, onClose }) {
  const [isPortalReady, setIsPortalReady] = useState(false);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  if (!isPortalReady || !message) {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <section className="w-full max-w-md rounded-3xl border border-[#233447] bg-[#18232f] p-6 text-white shadow-2xl">
        <h3 className="text-xl font-semibold tracking-tight">
          Builder Not Available
        </h3>
        <p className="mt-3 leading-7 text-white/80">{message}</p>
        <div className="mt-6 flex justify-end">
          <CreatorActionButton onClick={onClose}>OK</CreatorActionButton>
        </div>
      </section>
    </div>,
    document.body
  );
}

export default function CreatorPage() {
  const isAuthorized = useRequireRole("creator");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSectionKey, setOpenSectionKey] = useState("mock-exams");
  const [activeItemKey, setActiveItemKey] = useState("reading-test");
  const [isReadingTestComposerOpen, setIsReadingTestComposerOpen] = useState(false);
  const [readingTests, setReadingTests] = useState([]);
  const [isReadingTestsLoading, setIsReadingTestsLoading] = useState(true);
  const [isSavingReadingTest, setIsSavingReadingTest] = useState(false);
  const [isDeletingReadingTest, setIsDeletingReadingTest] = useState(false);
  const [readingTestError, setReadingTestError] = useState("");
  const [readingTestNotice, setReadingTestNotice] = useState("");
  const [readingBuilderNotice, setReadingBuilderNotice] = useState("");
  const [editingReadingTestId, setEditingReadingTestId] = useState("");
  const [readingTestForm, setReadingTestForm] = useState(createEmptyReadingForm);
  const [readingQuestionTypeSelections, setReadingQuestionTypeSelections] =
    useState(createEmptyReadingQuestionTypeSelections);
  const [isTfngDialogOpen, setIsTfngDialogOpen] = useState(false);
  const [tfngDialogSectionNumber, setTfngDialogSectionNumber] = useState(1);
  const [tfngDialogQuestions, setTfngDialogQuestions] = useState([
    createEmptyTfngQuestion(),
  ]);
  const [tfngDialogError, setTfngDialogError] = useState("");
  const [isMatchingInformationDialogOpen, setIsMatchingInformationDialogOpen] =
    useState(false);
  const [matchingInformationDialogSectionNumber, setMatchingInformationDialogSectionNumber] =
    useState(1);
  const [matchingInformationDialogQuestions, setMatchingInformationDialogQuestions] =
    useState([createEmptyMatchingInformationQuestion()]);
  const [matchingInformationDialogInstructions, setMatchingInformationDialogInstructions] =
    useState("");
  const [matchingInformationDialogPossibleAnswersText, setMatchingInformationDialogPossibleAnswersText] =
    useState("");
  const [matchingInformationDialogQuestionsText, setMatchingInformationDialogQuestionsText] =
    useState("");
  const [matchingInformationDialogError, setMatchingInformationDialogError] =
    useState("");
  const [isSummaryCompletionDialogOpen, setIsSummaryCompletionDialogOpen] =
    useState(false);
  const [summaryCompletionDialogSectionNumber, setSummaryCompletionDialogSectionNumber] =
    useState(1);
  const [summaryCompletionDialogInstructions, setSummaryCompletionDialogInstructions] =
    useState("");
  const [summaryCompletionDialogText, setSummaryCompletionDialogText] =
    useState("");
  const [summaryCompletionDialogQuestions, setSummaryCompletionDialogQuestions] =
    useState([]);
  const [summaryCompletionDialogError, setSummaryCompletionDialogError] =
    useState("");
  const [isMultipleChoiceDialogOpen, setIsMultipleChoiceDialogOpen] =
    useState(false);
  const [multipleChoiceDialogSectionNumber, setMultipleChoiceDialogSectionNumber] =
    useState(1);
  const [multipleChoiceDialogInstructions, setMultipleChoiceDialogInstructions] =
    useState("");
  const [multipleChoiceDialogText, setMultipleChoiceDialogText] =
    useState("");
  const [multipleChoiceDialogQuestions, setMultipleChoiceDialogQuestions] =
    useState([]);
  const [multipleChoiceDialogError, setMultipleChoiceDialogError] =
    useState("");
  const [isTableCompletionDialogOpen, setIsTableCompletionDialogOpen] =
    useState(false);
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
  const [tableCompletionDialogQuestions, setTableCompletionDialogQuestions] =
    useState([]);
  const [tableCompletionDialogError, setTableCompletionDialogError] =
    useState("");
  const [isWritingTestComposerOpen, setIsWritingTestComposerOpen] = useState(false);
  const [writingTests, setWritingTests] = useState([]);
  const [isWritingTestsLoading, setIsWritingTestsLoading] = useState(true);
  const [isSavingWritingTest, setIsSavingWritingTest] = useState(false);
  const [isDeletingWritingTest, setIsDeletingWritingTest] = useState(false);
  const [writingTestUploadProgress, setWritingTestUploadProgress] = useState(0);
  const [writingTestError, setWritingTestError] = useState("");
  const [writingTestNotice, setWritingTestNotice] = useState("");
  const [editingWritingTestId, setEditingWritingTestId] = useState("");
  const [writingTestForm, setWritingTestForm] = useState({
    testName: "",
    testDifficulty: "medium",
    date: getTodayDate(),
    part1Prompt: "",
    part2Prompt: "",
  });
  const [selectedPart1ImageName, setSelectedPart1ImageName] = useState("");
  const [selectedPart1ImageFile, setSelectedPart1ImageFile] = useState(null);
  const [selectedPart1ImagePreviewUrl, setSelectedPart1ImagePreviewUrl] =
    useState("");
  const activeItem = allSidebarItems.find((item) => item.key === activeItemKey);

  useEffect(() => {
    if (!readingTestNotice) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setReadingTestNotice("");
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [readingTestNotice]);

  useEffect(() => {
    if (!writingTestNotice) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setWritingTestNotice("");
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [writingTestNotice]);

  useEffect(() => {
    async function loadReadingTests() {
      try {
        setIsReadingTestsLoading(true);
        setReadingTests(await listReadingTests());
      } catch (error) {
        console.error("[Creator] Failed to load reading tests:", error);
      } finally {
        setIsReadingTestsLoading(false);
      }
    }

    loadReadingTests();
  }, []);

  useEffect(() => {
    async function loadWritingTests() {
      try {
        setIsWritingTestsLoading(true);
        setWritingTests(await listWritingTests());
      } catch (error) {
        console.error("[Creator] Failed to load writing tests:", error);
      } finally {
        setIsWritingTestsLoading(false);
      }
    }

    loadWritingTests();
  }, []);

  useEffect(() => {
    return () => {
      if (selectedPart1ImagePreviewUrl) {
        revokePreviewUrl(selectedPart1ImagePreviewUrl);
      }
    };
  }, [selectedPart1ImagePreviewUrl]);

  function handleCreateNew() {
    if (!activeItem) {
      return;
    }

    if (activeItem.key === "reading-test") {
      setReadingTestError("");
      setReadingTestNotice("");
      setReadingBuilderNotice("");
      setEditingReadingTestId("");
      setReadingTestForm(createEmptyReadingForm());
      setReadingQuestionTypeSelections(createEmptyReadingQuestionTypeSelections());
      setIsTfngDialogOpen(false);
      setIsMatchingInformationDialogOpen(false);
      setIsSummaryCompletionDialogOpen(false);
      setIsMultipleChoiceDialogOpen(false);
      setIsTableCompletionDialogOpen(false);
      setIsReadingTestComposerOpen(true);
      return;
    }

    if (activeItem.key === "writing-test") {
      setWritingTestError("");
      setWritingTestNotice("");
      setWritingTestUploadProgress(0);
      setEditingWritingTestId("");
      setWritingTestForm({
        testName: "",
        testDifficulty: "medium",
        date: getTodayDate(),
        part1Prompt: "",
        part2Prompt: "",
      });
      setSelectedPart1ImageName("");
      setSelectedPart1ImageFile(null);
      revokePreviewUrl(selectedPart1ImagePreviewUrl);
      setSelectedPart1ImagePreviewUrl("");
      setIsWritingTestComposerOpen(true);
      return;
    }

    console.log(`[Creator] Create new clicked for: ${activeItem.label}`);
  }

  function handleToggleSection(sectionKey) {
    setOpenSectionKey((currentKey) =>
      currentKey === sectionKey ? "" : sectionKey
    );
  }

  function handleSelectItem(itemKey) {
    setActiveItemKey(itemKey);
  }

  function handleWritingTestChange(field, value) {
    setWritingTestForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleReadingTestChange(field, value) {
    setReadingTestForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleCloseReadingTestComposer() {
    if (isSavingReadingTest) {
      return;
    }

    setIsReadingTestComposerOpen(false);
    setReadingTestError("");
    setReadingBuilderNotice("");
    setReadingTestNotice("");
    setReadingQuestionTypeSelections(createEmptyReadingQuestionTypeSelections());
    setIsTfngDialogOpen(false);
    setTfngDialogError("");
    setIsMatchingInformationDialogOpen(false);
    setMatchingInformationDialogInstructions("");
    setMatchingInformationDialogQuestionsText("");
    setMatchingInformationDialogPossibleAnswersText("");
    setMatchingInformationDialogError("");
    setIsSummaryCompletionDialogOpen(false);
    setSummaryCompletionDialogInstructions("");
    setSummaryCompletionDialogText("");
    setSummaryCompletionDialogQuestions([]);
    setSummaryCompletionDialogError("");
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
    setReadingBuilderNotice("");
    setEditingReadingTestId("");
  }

  function handleAddReadingQuestionType(sectionNumber, questionType) {
    setReadingQuestionTypeSelections((currentSelections) => ({
      ...currentSelections,
      [sectionNumber]: questionType,
    }));

    const sectionQuestionsField = `section${sectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      readingTestForm[sectionQuestionsField]
    )
      ? readingTestForm[sectionQuestionsField]
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
          questionNumber: getNextReadingQuestionNumber([], existingQuestionNumbers),
        },
      ]);
      setTfngDialogError("");
      setReadingTestError("");
      setReadingQuestionTypeSelections((currentSelections) => ({
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
      setReadingTestError("");
      setReadingQuestionTypeSelections((currentSelections) => ({
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
      setReadingTestError("");
      setReadingQuestionTypeSelections((currentSelections) => ({
        ...currentSelections,
        [sectionNumber]: "",
      }));
      setIsMatchingInformationDialogOpen(true);
      return;
    }

    if (questionType === "Summary Completion") {
      setSummaryCompletionDialogSectionNumber(sectionNumber);
      setSummaryCompletionDialogInstructions("");
      setSummaryCompletionDialogText("");
      setSummaryCompletionDialogQuestions([]);
      setSummaryCompletionDialogError("");
      setReadingTestError("");
      setReadingQuestionTypeSelections((currentSelections) => ({
        ...currentSelections,
        [sectionNumber]: "",
      }));
      setIsSummaryCompletionDialogOpen(true);
      return;
    }

    if (questionType === "Table Completion") {
      setTableCompletionDialogSectionNumber(sectionNumber);
      setTableCompletionDialogInstructions("");
      setTableCompletionDialogHeaders(["", ""]);
      setTableCompletionDialogRows([createEmptyTableCompletionRow()]);
      setTableCompletionDialogQuestions([]);
      setTableCompletionDialogError("");
      setReadingTestError("");
      setReadingQuestionTypeSelections((currentSelections) => ({
        ...currentSelections,
        [sectionNumber]: "",
      }));
      setIsTableCompletionDialogOpen(true);
      return;
    }

    setReadingQuestionTypeSelections((currentSelections) => ({
      ...currentSelections,
      [sectionNumber]: "",
    }));
    setReadingTestError("");
    setReadingBuilderNotice(`${questionType} builder is not available yet.`);
  }

  function handleEditReadingTest(test) {
    setReadingTestError("");
    setReadingBuilderNotice("");
    setReadingTestNotice("");
    setTfngDialogError("");
    setIsTfngDialogOpen(false);
    setIsMatchingInformationDialogOpen(false);
    setIsSummaryCompletionDialogOpen(false);
    setIsMultipleChoiceDialogOpen(false);
    setIsTableCompletionDialogOpen(false);
    setEditingReadingTestId(test.id);
    setReadingTestForm(createReadingFormFromTest(test));
    setReadingQuestionTypeSelections(createEmptyReadingQuestionTypeSelections());
    setIsReadingTestComposerOpen(true);
  }

  function handleCloseTfngDialog() {
    setIsTfngDialogOpen(false);
    setTfngDialogError("");
  }

  function handleCloseReadingBuilderNotice() {
    setReadingBuilderNotice("");
  }

  function handleCloseMatchingInformationDialog() {
    setIsMatchingInformationDialogOpen(false);
    setMatchingInformationDialogInstructions("");
    setMatchingInformationDialogQuestionsText("");
    setMatchingInformationDialogPossibleAnswersText("");
    setMatchingInformationDialogError("");
  }

  function handleCloseSummaryCompletionDialog() {
    setIsSummaryCompletionDialogOpen(false);
    setSummaryCompletionDialogInstructions("");
    setSummaryCompletionDialogText("");
    setSummaryCompletionDialogQuestions([]);
    setSummaryCompletionDialogError("");
  }

  function handleCloseMultipleChoiceDialog() {
    setIsMultipleChoiceDialogOpen(false);
    setMultipleChoiceDialogInstructions("");
    setMultipleChoiceDialogText("");
    setMultipleChoiceDialogQuestions([]);
    setMultipleChoiceDialogError("");
  }

  function handleCloseTableCompletionDialog() {
    setIsTableCompletionDialogOpen(false);
    setTableCompletionDialogInstructions("");
    setTableCompletionDialogHeaders(["", ""]);
    setTableCompletionDialogRows([createEmptyTableCompletionRow()]);
    setTableCompletionDialogQuestions([]);
    setTableCompletionDialogError("");
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

  function handleAddTfngQuestion() {
    const sectionQuestionsField = `section${tfngDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      readingTestForm[sectionQuestionsField]
    )
      ? readingTestForm[sectionQuestionsField]
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
        questionNumber: getNextReadingQuestionNumber(
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

  function syncSummaryCompletionQuestions(summaryText, previousQuestions = []) {
    const parsedQuestions = parseSummaryCompletionQuestions(summaryText);

    setSummaryCompletionDialogQuestions(
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
        };
      })
    );
  }

  function handleChangeSummaryCompletionInstructions(value) {
    setSummaryCompletionDialogInstructions(value);
  }

  function handleChangeSummaryCompletionText(value) {
    setSummaryCompletionDialogText(value);
    syncSummaryCompletionQuestions(value, summaryCompletionDialogQuestions);
  }

  function handleChangeSummaryCompletionQuestion(questionId, value) {
    setSummaryCompletionDialogQuestions((currentQuestions) =>
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
          correctAnswer: question.options.some(
            (option) => option.label === matchingPreviousQuestion?.correctAnswer
          )
            ? matchingPreviousQuestion.correctAnswer
            : "",
        };
      })
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
    const sectionQuestionsField = `section${multipleChoiceDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      readingTestForm[sectionQuestionsField]
    )
      ? readingTestForm[sectionQuestionsField]
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
        questionNumber: getNextReadingQuestionNumber(
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
              correctAnswer: value,
            }
          : question
      )
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
                      answerTypeOptions[value]?.values?.includes(
                        question.correctAnswer
                      )
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

  function handleDeleteReadingQuestionItem(sectionNumber, groupId, itemId) {
    const sectionQuestionsField = `section${sectionNumber}Questions`;

    setReadingTestForm((currentForm) => ({
      ...currentForm,
      [sectionQuestionsField]: (Array.isArray(currentForm[sectionQuestionsField])
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
    const sectionQuestionsField = `section${tfngDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      readingTestForm[sectionQuestionsField]
    )
      ? readingTestForm[sectionQuestionsField]
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
        "One or more question numbers are already used in this section."
      );
      return;
    }

    const newQuestionGroup = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "TFNG",
      title: "True / False / Not Given",
      items: tfngDialogQuestions.map((question) => ({
        ...question,
        answerType: question.answerType || "TFNG",
        questionNumber: String(question.questionNumber).trim(),
        prompt: question.prompt.trim(),
      })),
    };

    setReadingTestForm((currentForm) => ({
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
    setReadingTestError("");
  }

  function handleSaveMatchingInformationQuestions() {
    const normalizedNumbers = matchingInformationDialogQuestions.map((question) =>
      String(question.questionNumber).trim()
    );
    const sectionQuestionsField = `section${matchingInformationDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      readingTestForm[sectionQuestionsField]
    )
      ? readingTestForm[sectionQuestionsField]
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
        "One or more question numbers are already used in this section."
      );
      return;
    }

    const newQuestionGroup = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "MATCHING_INFORMATION",
      title: "All Matching Activities",
      instructions: matchingInformationDialogInstructions.trim(),
      possibleAnswers,
      items: matchingInformationDialogQuestions.map((question) => ({
        ...question,
        questionNumber: String(question.questionNumber).trim(),
        prompt: question.prompt.trim(),
        correctAnswer: String(question.correctAnswer).trim(),
      })),
    };

    setReadingTestForm((currentForm) => ({
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
    setMatchingInformationDialogInstructions("");
    setMatchingInformationDialogPossibleAnswersText("");
    setMatchingInformationDialogQuestionsText("");
    setMatchingInformationDialogError("");
    setIsMatchingInformationDialogOpen(false);
    setReadingTestError("");
  }

  function handleSaveSummaryCompletionQuestions() {
    const normalizedNumbers = summaryCompletionDialogQuestions.map((question) =>
      String(question.questionNumber).trim()
    );
    const sectionQuestionsField = `section${summaryCompletionDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      readingTestForm[sectionQuestionsField]
    )
      ? readingTestForm[sectionQuestionsField]
      : [];
    const existingQuestionNumbers = existingSectionQuestions.flatMap(
      (questionGroup) =>
        Array.isArray(questionGroup.items)
          ? questionGroup.items.map((item) => String(item.questionNumber).trim())
          : []
    );

    if (!summaryCompletionDialogText.trim()) {
      setSummaryCompletionDialogError("Paste the summary completion text before saving.");
      return;
    }

    if (summaryCompletionDialogQuestions.length === 0) {
      setSummaryCompletionDialogError(
        "Add at least one numbered blank like 24 ........ before saving."
      );
      return;
    }

    if (
      summaryCompletionDialogQuestions.some(
        (question) =>
          !String(question.questionNumber).trim() ||
          !String(question.correctAnswer).trim()
      )
    ) {
      setSummaryCompletionDialogError(
        "Every generated summary completion answer must be filled in."
      );
      return;
    }

    if (new Set(normalizedNumbers).size !== normalizedNumbers.length) {
      setSummaryCompletionDialogError(
        "Each summary completion question number must be unique."
      );
      return;
    }

    if (
      summaryCompletionDialogQuestions.some((question) => {
        const questionNumber = Number(question.questionNumber);
        return !Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > 40;
      })
    ) {
      setSummaryCompletionDialogError("Question numbers must be between 1 and 40.");
      return;
    }

    if (
      normalizedNumbers.some((questionNumber) =>
        existingQuestionNumbers.includes(questionNumber)
      )
    ) {
      setSummaryCompletionDialogError(
        "One or more question numbers are already used in this section."
      );
      return;
    }

    const newQuestionGroup = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "SUMMARY_COMPLETION",
      title: "Summary Completion",
      instructions: summaryCompletionDialogInstructions.trim(),
      summaryText: summaryCompletionDialogText,
      items: summaryCompletionDialogQuestions.map((question) => ({
        ...question,
        questionNumber: String(question.questionNumber).trim(),
        correctAnswer: String(question.correctAnswer).trim(),
      })),
    };

    setReadingTestForm((currentForm) => ({
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
    setSummaryCompletionDialogInstructions("");
    setSummaryCompletionDialogText("");
    setSummaryCompletionDialogQuestions([]);
    setSummaryCompletionDialogError("");
    setIsSummaryCompletionDialogOpen(false);
    setReadingTestError("");
  }

  function handleSaveTableCompletionQuestions() {
    const normalizedNumbers = tableCompletionDialogQuestions.map((question) =>
      String(question.questionNumber).trim()
    );
    const sectionQuestionsField = `section${tableCompletionDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      readingTestForm[sectionQuestionsField]
    )
      ? readingTestForm[sectionQuestionsField]
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
        "One or more question numbers are already used in this section."
      );
      return;
    }

    const newQuestionGroup = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

    setReadingTestForm((currentForm) => ({
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
    setReadingTestError("");
  }

  function handleSaveMultipleChoiceQuestions() {
    const normalizedNumbers = multipleChoiceDialogQuestions.map((question) =>
      String(question.questionNumber).trim()
    );
    const sectionQuestionsField = `section${multipleChoiceDialogSectionNumber}Questions`;
    const existingSectionQuestions = Array.isArray(
      readingTestForm[sectionQuestionsField]
    )
      ? readingTestForm[sectionQuestionsField]
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
          !String(question.correctAnswer).trim()
      )
    ) {
      setMultipleChoiceDialogError(
        "Each multiple choice question needs a number, prompt, at least two options, and one selected correct answer."
      );
      return;
    }

    if (new Set(normalizedNumbers).size !== normalizedNumbers.length) {
      setMultipleChoiceDialogError("Each multiple choice question number must be unique.");
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
        "One or more question numbers are already used in this section."
      );
      return;
    }

    const newQuestionGroup = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "MULTIPLE_CHOICE",
      title: "Multiple Choice",
      instructions: multipleChoiceDialogInstructions.trim(),
      sourceText: multipleChoiceDialogText,
      items: multipleChoiceDialogQuestions.map((question) => ({
        ...question,
        questionNumber: String(question.questionNumber).trim(),
        prompt: question.prompt.trim(),
        correctAnswer: String(question.correctAnswer).trim(),
        options: question.options
          .filter((option) => String(option.text).trim())
          .map((option) => ({
            label: option.label,
            text: option.text.trim(),
          })),
      })),
    };

    setReadingTestForm((currentForm) => ({
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
    setReadingTestError("");
  }

  async function handleSaveReadingTest() {
    if (isSavingReadingTest) {
      return;
    }

    if (!readingTestForm.testName.trim()) {
      setReadingTestError("Test name is required.");
      return;
    }

    if (
      !readingTestForm.section1Text.trim() &&
      !readingTestForm.section2Text.trim() &&
      !readingTestForm.section3Text.trim()
    ) {
      setReadingTestError("Add at least one reading passage before saving.");
      return;
    }

    try {
      setIsSavingReadingTest(true);
      setReadingTestError("");
      setReadingTestNotice("");

      const difficultyLabel =
        difficultyOptions.find(
          (option) => option.value === readingTestForm.testDifficulty
        )?.label || "Medium";

      const { notice, savedTest } = await withTimeout(
        saveReadingTest({
          editingTestId: editingReadingTestId,
          formValues: readingTestForm,
          difficultyLabel,
        }),
        45000,
        "Saving the reading test took too long. Please try again."
      );

      setReadingTests((currentTests) => [
        savedTest,
        ...currentTests.filter((test) => test.id !== savedTest.id),
      ]);
      setReadingTestNotice(notice);
      setIsReadingTestComposerOpen(false);
      setEditingReadingTestId("");
    } catch (error) {
      console.error("[Creator] Failed to save reading test:", error);
      setReadingTestError(error?.message || "Failed to save reading test.");
    } finally {
      setIsSavingReadingTest(false);
    }
  }

  async function handleDeleteReadingTest(test) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this reading test?"
    );

    if (!shouldDelete || isDeletingReadingTest) {
      return;
    }

    try {
      setIsDeletingReadingTest(true);
      setReadingTestError("");
      setReadingTestNotice("");
      setReadingTests((currentTests) =>
        currentTests.filter((currentTest) => currentTest.id !== test.id)
      );

      await withTimeout(
        deleteReadingTest(test),
        30000,
        "Deleting the reading test took too long. Please try again."
      );

      setReadingTestNotice("Reading test deleted.");
    } catch (error) {
      console.error("[Creator] Failed to delete reading test:", error);
      setReadingTestError(error?.message || "Failed to delete reading test.");
      setReadingTests((currentTests) => [test, ...currentTests]);
    } finally {
      setIsDeletingReadingTest(false);
    }
  }

  function handleWritingTestImageChange(event) {
    const nextFile = event.target.files?.[0];
    setSelectedPart1ImageFile(nextFile || null);
    setSelectedPart1ImageName(nextFile ? nextFile.name : "");
    revokePreviewUrl(selectedPart1ImagePreviewUrl);
    setSelectedPart1ImagePreviewUrl(
      nextFile ? URL.createObjectURL(nextFile) : ""
    );
  }

  function handleCloseWritingTestComposer() {
    if (isSavingWritingTest) {
      return;
    }

    setIsWritingTestComposerOpen(false);
    setWritingTestError("");
    setWritingTestNotice("");
    setWritingTestUploadProgress(0);
    setEditingWritingTestId("");
  }

  function handleEditWritingTest(test) {
    const matchingDifficulty =
      difficultyOptions.find(
        (option) => option.label.toLowerCase() === String(test.difficulty).toLowerCase()
      )?.value || "medium";

    setWritingTestError("");
    setWritingTestNotice("");
    setEditingWritingTestId(test.id);
    setWritingTestForm({
      testName: test.name || "",
      testDifficulty: matchingDifficulty,
      date: test.date || getTodayDate(),
      part1Prompt: test.task1Prompt || "",
      part2Prompt: test.task2Prompt || "",
    });
    setSelectedPart1ImageName("");
    setSelectedPart1ImageFile(null);
    revokePreviewUrl(selectedPart1ImagePreviewUrl);
    setSelectedPart1ImagePreviewUrl(test.task1ImageUrl || "");
    setIsWritingTestComposerOpen(true);
  }

  async function handleSaveWritingTest() {
    if (isSavingWritingTest) {
      return;
    }

    if (!writingTestForm.testName.trim()) {
      setWritingTestError("Test name is required.");
      return;
    }

    if (!writingTestForm.part1Prompt.trim()) {
      setWritingTestError("Task 1 prompt is required.");
      return;
    }

    if (!writingTestForm.part2Prompt.trim()) {
      setWritingTestError("Task 2 prompt is required.");
      return;
    }

    try {
      setIsSavingWritingTest(true);
      setWritingTestError("");
      setWritingTestNotice("");
      setWritingTestUploadProgress(0);

      const difficultyLabel =
        difficultyOptions.find(
          (option) => option.value === writingTestForm.testDifficulty
        )?.label || "Medium";
      const existingTest = writingTests.find(
        (test) => test.id === editingWritingTestId
      );
      const { notice, savedTest } = await withTimeout(
        saveWritingTest({
          editingTestId: editingWritingTestId,
          formValues: writingTestForm,
          difficultyLabel,
          selectedImageFile: selectedPart1ImageFile,
          existingImageUrl: selectedPart1ImagePreviewUrl,
          existingImagePath: existingTest?.task1ImagePath || "",
          onUploadProgress: setWritingTestUploadProgress,
        }),
        selectedPart1ImageFile ? 210000 : 45000,
        "Saving the writing test took too long. Please try again."
      );

        setWritingTests((currentTests) => [
          savedTest,
          ...currentTests.filter((test) => test.id !== savedTest.id),
        ]);
        setWritingTestNotice(notice === "Test saved." ? "" : notice);
        setIsWritingTestComposerOpen(false);
        setEditingWritingTestId("");
    } catch (error) {
      console.error("[Creator] Failed to save writing test:", error);
      setWritingTestError(
        error?.message || "Failed to save writing test."
      );
    } finally {
      setIsSavingWritingTest(false);
    }
  }

  async function handleDeleteWritingTest(test) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this test?"
    );

    if (!shouldDelete || isDeletingWritingTest) {
      return;
    }

    try {
      setIsDeletingWritingTest(true);
      setWritingTestError("");
      setWritingTestNotice("");
      setWritingTests((currentTests) =>
        currentTests.filter((currentTest) => currentTest.id !== test.id)
      );

      if (editingWritingTestId === test.id) {
        handleCloseWritingTestComposer();
      }

      await withTimeout(
        deleteWritingTest(test),
        30000,
        "Deleting the writing test took too long. Please try again."
      );

      setWritingTestNotice("Test deleted.");
    } catch (error) {
      console.error("[Creator] Failed to delete writing test:", error);
      setWritingTests((currentTests) => {
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
      setWritingTestError(error?.message || "Failed to delete writing test.");
    } finally {
      setIsDeletingWritingTest(false);
    }
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-base-200 text-base-content">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-base-300 bg-base-100/95 backdrop-blur ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="flex items-center justify-between border-b border-base-300 px-4 py-4">
          {!isCollapsed && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
                Creator
              </p>
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-square rounded-xl"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? (
              <Bars3Icon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {sidebarSections.map((section) => (
              <SidebarSection
                key={section.key}
                label={section.label}
                icon={section.icon}
                items={section.items}
                isCollapsed={isCollapsed}
                isOpen={openSectionKey === section.key}
                activeItemKey={activeItemKey}
                onToggle={() => handleToggleSection(section.key)}
                onSelect={(item) => handleSelectItem(item.key)}
              />
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto">
        <div className="min-h-screen p-6 md:p-8">
          <CenteredAlertDialog
            message={readingBuilderNotice}
            onClose={handleCloseReadingBuilderNotice}
          />

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
            />
          ) : null}

          {isSummaryCompletionDialogOpen ? (
            <SummaryCompletionDialog
              sectionNumber={summaryCompletionDialogSectionNumber}
              instructions={summaryCompletionDialogInstructions}
              summaryText={summaryCompletionDialogText}
              questions={summaryCompletionDialogQuestions}
              errorMessage={summaryCompletionDialogError}
              onChangeInstructions={handleChangeSummaryCompletionInstructions}
              onChangeText={handleChangeSummaryCompletionText}
              onChangeQuestion={handleChangeSummaryCompletionQuestion}
              onClose={handleCloseSummaryCompletionDialog}
              onSave={handleSaveSummaryCompletionQuestions}
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
            />
          ) : null}

          <section className="flex min-h-[calc(100vh-4rem)] flex-col">
            <header className="mb-8 flex items-center justify-between gap-4">
              <h1 className="text-3xl font-semibold tracking-tight">
                {activeItem?.label || "Creator Dashboard"}
              </h1>

              <CreatorActionButton onClick={handleCreateNew}>
                <PlusIcon className="h-5 w-5" />
                <span>Create New</span>
              </CreatorActionButton>
            </header>

            {activeItemKey === "reading-test" ? (
              <div className="flex flex-1 flex-col gap-6">
                {isReadingTestComposerOpen ? (
                  <ReadingTestPanel
                    formValues={readingTestForm}
                    questionTypeSelections={readingQuestionTypeSelections}
                    isSidebarCollapsed={isCollapsed}
                    isSaving={isSavingReadingTest}
                    errorMessage={readingTestError}
                    onClose={handleCloseReadingTestComposer}
                    onChange={handleReadingTestChange}
                    onAddQuestionType={handleAddReadingQuestionType}
                    onDeleteReadingQuestionItem={handleDeleteReadingQuestionItem}
                    onSave={handleSaveReadingTest}
                  />
                ) : (
                  <>
                    {readingTestNotice ? (
                      <div
                        className={`w-full rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm font-medium text-warning-content transition-[margin] duration-200 ${
                          isCollapsed ? "ml-52" : "ml-0"
                        }`}
                      >
                        {readingTestNotice}
                      </div>
                    ) : null}

                    {readingTests.length > 0 ? (
                      <div
                        className={`grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3 transition-[margin] duration-200 ${
                          isCollapsed ? "ml-52" : "ml-0"
                        }`}
                      >
                        {readingTests.map((test) => (
                          <ReadingTestCard
                            key={test.id}
                            test={test}
                            onDelete={handleDeleteReadingTest}
                            onEdit={handleEditReadingTest}
                          />
                        ))}
                      </div>
                    ) : isReadingTestsLoading ? (
                      <div
                        className={`w-full rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm transition-[margin] duration-200 ${
                          isCollapsed ? "ml-52" : "ml-0"
                        }`}
                      >
                        <p className="text-lg font-medium text-base-content/65">
                          Loading reading tests...
                        </p>
                      </div>
                    ) : (
                      <div
                        className={`w-full rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm transition-[margin] duration-200 ${
                          isCollapsed ? "ml-52" : "ml-0"
                        }`}
                      >
                        <p className="text-lg font-medium text-base-content/65">
                          No reading tests yet.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : activeItemKey === "writing-test" ? (
              <div className="flex flex-1 flex-col items-start gap-6">
                {isWritingTestComposerOpen ? (
                  <WritingTestPanel
                    formValues={writingTestForm}
                    selectedImageName={selectedPart1ImageName}
                    selectedImagePreviewUrl={selectedPart1ImagePreviewUrl}
                    isSaving={isSavingWritingTest}
                    hasNewImageUpload={!!selectedPart1ImageFile}
                    uploadProgress={writingTestUploadProgress}
                    errorMessage={writingTestError}
                    onClose={handleCloseWritingTestComposer}
                    onChange={handleWritingTestChange}
                    onImageChange={handleWritingTestImageChange}
                    onSave={handleSaveWritingTest}
                  />
                ) : (
                  <>
                    {writingTestNotice ? (
                      <div className="w-full max-w-5xl rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm font-medium text-warning-content">
                        {writingTestNotice}
                      </div>
                    ) : null}

                    {writingTests.length > 0 ? (
                      <div className="grid w-full max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {writingTests.map((test) => (
                          <WritingTestCard
                            key={test.id}
                            test={test}
                            onDelete={handleDeleteWritingTest}
                            onEdit={handleEditWritingTest}
                          />
                        ))}
                      </div>
                    ) : isWritingTestsLoading ? (
                      <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
                        <p className="text-lg font-medium text-base-content/65">
                          Loading writing tests...
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
                        <p className="text-lg font-medium text-base-content/65">
                          No writing tests yet.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
                  <p className="text-lg font-medium text-base-content/65">
                    {activeItem?.label || "Creator Dashboard"} section is ready.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

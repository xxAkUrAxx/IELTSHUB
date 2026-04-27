"use client";

import { useEffect, useState } from "react";
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
  "Matching Headings",
  "Matching Information (to paragraphs)",
  "Matching Features (e.g., people, theories)",
  "Matching Sentence Endings",
  "Sentence Completion",
  "Summary Completion",
  "Note Completion",
  "Table Completion",
  "Flow-chart Completion",
  "Diagram Label Completion",
  "Short Answer Questions",
];

const tfngAnswerOptions = ["TRUE", "FALSE", "NOT GIVEN"];

function createEmptyTfngQuestion() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    questionNumber: "",
    prompt: "",
    correctAnswer: "TRUE",
  };
}

function createEmptyReadingForm() {
  return {
    testName: "",
    testDifficulty: "medium",
    date: getTodayDate(),
    section1Text: "",
    section1Questions: [],
    section2Text: "",
    section2Questions: [],
    section3Text: "",
    section3Questions: [],
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
    const textField = `section${sectionNumber}Text`;
    const questionsField = `section${sectionNumber}Questions`;

    nextForm[textField] = section?.passage || "";
    nextForm[questionsField] = Array.isArray(section?.questions)
      ? section.questions
          .filter((questionGroup) => questionGroup.type === "TFNG")
          .map((questionGroup) => ({
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
                  questionNumber: String(question.number || ""),
                  prompt: question.question || "",
                  correctAnswer: question.correctAnswer || "TRUE",
                }))
              : [],
          }))
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
  isSidebarCollapsed,
  isSaving,
  errorMessage,
  onClose,
  onChange,
  onAddQuestionType,
  onSave,
}) {
  return (
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
            const textField = `section${sectionNumber}Text`;
            const questionsField = `section${sectionNumber}Questions`;
            const sectionQuestions = Array.isArray(formValues[questionsField])
              ? formValues[questionsField]
              : [];
            const tfngQuestions = sectionQuestions.filter(
              (questionGroup) => questionGroup.type === "TFNG"
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
                        className="select w-full border-[#233447] bg-[#1b2a3a] font-medium text-white"
                        style={{
                          borderColor: "#233447",
                          backgroundColor: "#1b2a3a",
                          color: "#ffffff",
                        }}
                        defaultValue=""
                        onChange={(event) => {
                          const nextQuestionType = event.target.value;

                          if (!nextQuestionType) {
                            return;
                          }

                          onAddQuestionType(sectionNumber, nextQuestionType);
                          event.target.value = "";
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

                  {tfngQuestions.length > 0 ? (
                    <div className="space-y-4 rounded-2xl border border-base-300 bg-base-200/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">True / False / Not Given</p>
                        <div className="badge badge-outline">
                          {tfngQuestions.reduce(
                            (count, group) =>
                              count +
                              (Array.isArray(group.items) ? group.items.length : 0),
                            0
                          )}{" "}
                          questions
                        </div>
                      </div>

                      <div className="space-y-3">
                        {tfngQuestions.map((questionGroup) =>
                          questionGroup.items.map((item) => (
                            <article
                              key={item.id}
                              className="rounded-xl border border-base-300 bg-base-100 p-4"
                            >
                              <p className="text-sm font-medium text-base-content/60">
                                Question {item.questionNumber || "Unassigned"}
                              </p>
                              <p className="mt-2 leading-7">
                                {item.prompt || "No question text added yet."}
                              </p>
                              <p className="mt-3 text-sm font-medium text-primary">
                                Correct answer: {item.correctAnswer}
                              </p>
                            </article>
                          ))
                        )}
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
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-[2px]">
      <section className="max-h-[calc(100vh-4rem)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[#233447] bg-[#18232f] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#233447] px-6 py-5">
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

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-2xl border border-[#233447] bg-white/5 px-5 py-4 text-sm text-white/75">
            Add one or more TFNG questions for this section. Each question should use a reading test question number from 1 to 40 and one correct answer.
          </div>

          {questions.map((question, index) => (
            <section
              key={question.id}
              className="rounded-2xl border border-[#233447] bg-[#111a24] p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
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

              <div className="grid gap-4">
                <label className="form-control max-w-sm">
                  <span className="label-text mb-2 font-medium">
                    Question Number
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    list="reading-question-numbers"
                    className="input w-full border-[#233447] bg-[#1b2a3a] text-white"
                    placeholder="Select question number or enter it manually"
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
                  <input
                    type="text"
                    className="input w-full border-[#233447] bg-[#1b2a3a] text-white"
                    placeholder="Enter text here"
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
                    className="select w-full border-[#233447] bg-[#1b2a3a] text-white"
                    value={question.correctAnswer}
                    onChange={(event) =>
                      onChangeQuestion(
                        question.id,
                        "correctAnswer",
                        event.target.value
                      )
                    }
                  >
                    {tfngAnswerOptions.map((option) => (
                      <option key={`${question.id}-${option}`} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          ))}

          <datalist id="reading-question-numbers">
            {Array.from({ length: 40 }, (_, index) => index + 1).map(
              (number) => (
                <option key={`reading-number-${number}`} value={number} />
              )
            )}
          </datalist>

          <button
            type="button"
            className="btn rounded-xl border-[#3b5168] bg-transparent text-white hover:border-[#4a647f] hover:bg-white/5"
            onClick={onAddQuestion}
          >
            Add Another Question
          </button>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#233447] px-6 py-5">
          {errorMessage ? (
            <p className="mr-auto self-center text-sm font-medium text-error">
              {errorMessage}
            </p>
          ) : null}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <CreatorActionButton onClick={onSave}>
            Save Questions
          </CreatorActionButton>
        </div>
      </section>
    </div>
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
  const [editingReadingTestId, setEditingReadingTestId] = useState("");
  const [readingTestForm, setReadingTestForm] = useState(createEmptyReadingForm);
  const [isTfngDialogOpen, setIsTfngDialogOpen] = useState(false);
  const [tfngDialogSectionNumber, setTfngDialogSectionNumber] = useState(1);
  const [tfngDialogQuestions, setTfngDialogQuestions] = useState([
    createEmptyTfngQuestion(),
  ]);
  const [tfngDialogError, setTfngDialogError] = useState("");
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
      setEditingReadingTestId("");
      setReadingTestForm(createEmptyReadingForm());
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
    setReadingTestNotice("");
    setIsTfngDialogOpen(false);
    setTfngDialogError("");
    setEditingReadingTestId("");
  }

  function handleAddReadingQuestionType(sectionNumber, questionType) {
    if (
      questionType === "True / False / Not Given (or Yes / No / Not Given)"
    ) {
      setTfngDialogSectionNumber(sectionNumber);
      setTfngDialogQuestions([createEmptyTfngQuestion()]);
      setTfngDialogError("");
      setIsTfngDialogOpen(true);
      return;
    }

    setReadingTestError(`${questionType} builder is not available yet.`);
  }

  function handleEditReadingTest(test) {
    setReadingTestError("");
    setReadingTestNotice("");
    setTfngDialogError("");
    setIsTfngDialogOpen(false);
    setEditingReadingTestId(test.id);
    setReadingTestForm(createReadingFormFromTest(test));
    setIsReadingTestComposerOpen(true);
  }

  function handleCloseTfngDialog() {
    setIsTfngDialogOpen(false);
    setTfngDialogError("");
  }

  function handleAddTfngQuestion() {
    setTfngDialogQuestions((currentQuestions) => [
      ...currentQuestions,
      createEmptyTfngQuestion(),
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
              [field]: value,
            }
          : question
      )
    );
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
      ],
    }));
    setTfngDialogError("");
    setIsTfngDialogOpen(false);
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
                    isSidebarCollapsed={isCollapsed}
                    isSaving={isSavingReadingTest}
                    errorMessage={readingTestError}
                    onClose={handleCloseReadingTestComposer}
                    onChange={handleReadingTestChange}
                    onAddQuestionType={handleAddReadingQuestionType}
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

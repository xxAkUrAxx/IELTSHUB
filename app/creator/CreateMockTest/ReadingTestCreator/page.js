"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../../lib/firebase/config";
import { useRequireRole } from "../../../../lib/firebase/role-guard";

const difficultyOptions = ["Easy", "Medium", "Hard"];
const questionTypeOptions = [
  "TFNG",
  "YESNO",
  "MCQ",
  "MATCHING",
  "FILL_BLANK",
  "SUMMARY",
  "TABLE",
];
const tfngOptions = ["TRUE", "FALSE", "NOT GIVEN"];

function createStandardQuestion() {
  return {
    number: "",
    type: "TFNG",
    question: "",
    options: [],
    correctAnswer: "",
  };
}

function createTfngGroup() {
  return {
    type: "TFNG",
    instructions: "",
    questions: [
      {
        number: "",
        question: "",
        options: tfngOptions,
        correctAnswer: "",
      },
    ],
  };
}

function createTableQuestion() {
  return {
    number: "",
    type: "TABLE",
    question: "",
    table: {
      headers: [""],
      rows: [
        {
          cells: [""],
          blankIndex: 0,
        },
      ],
    },
    correctAnswer: "",
  };
}

function createSection(sectionNumber) {
  return {
    sectionNumber,
    title: "",
    passage: "",
    questions: [],
  };
}

function formatOptionsForInput(options) {
  return Array.isArray(options) ? options.join("\n") : "";
}

function parseOptionsInput(value) {
  return value
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
}

function normalizeTable(table) {
  const headers = Array.isArray(table?.headers) ? table.headers : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];

  return {
    headers: headers.length > 0 ? headers : [""],
    rows:
      rows.length > 0
        ? rows.map((row) => ({
            cells: Array.isArray(row?.cells) && row.cells.length > 0 ? row.cells : [""],
            blankIndex: typeof row?.blankIndex === "number" ? row.blankIndex : 0,
          }))
        : [
            {
              cells: [""],
              blankIndex: 0,
            },
          ],
  };
}

function normalizeQuestion(question) {
  if (question?.type === "TABLE") {
    return {
      number: question.number || "",
      type: "TABLE",
      question: question.question || "",
      table: normalizeTable(question.table),
      options: [],
      correctAnswer: question.correctAnswer || "",
    };
  }

  if (
    question?.type === "TFNG" &&
    Array.isArray(question.questions)
  ) {
    return {
      type: "TFNG",
      instructions: question.instructions || "",
      questions: question.questions.map((item) => ({
        number: item.number || "",
        question: item.question || "",
        options:
          Array.isArray(item.options) && item.options.length > 0
            ? item.options
            : tfngOptions,
        correctAnswer: item.correctAnswer || "",
      })),
    };
  }

  return {
    number: question?.number || "",
    type: question?.type || "TFNG",
    question: question?.question || "",
    options: Array.isArray(question?.options) ? question.options : [],
    correctAnswer: question?.correctAnswer || "",
  };
}

function normalizeSection(section, index) {
  return {
    sectionNumber: section?.sectionNumber || index + 1,
    title: section?.title || "",
    passage: section?.passage || "",
    questions: Array.isArray(section?.questions)
      ? section.questions.map(normalizeQuestion)
      : [],
  };
}

function getQuestionSummary(question) {
  if (question.type === "TABLE") {
    return `Table${question.number ? ` ${question.number}` : ""}`;
  }

  if (question.type === "TFNG" && Array.isArray(question.questions)) {
    const first = question.questions[0]?.number;
    const last = question.questions[question.questions.length - 1]?.number;
    const range =
      first && last ? ` ${first}-${last}` : first ? ` ${first}` : "";
    return `TFNG Group${range}`;
  }

  return `${question.type}${question.number ? ` ${question.number}` : ""}`;
}

function TableEditor({ question, onChange }) {
  const headers = question.table?.headers || [""];
  const rows = question.table?.rows || [];

  function updateHeader(index, value) {
    const nextHeaders = headers.map((header, headerIndex) =>
      headerIndex === index ? value : header
    );
    onChange({
      ...question,
      table: {
        ...question.table,
        headers: nextHeaders,
      },
    });
  }

  function addHeader() {
    onChange({
      ...question,
      table: {
        ...question.table,
        headers: [...headers, ""],
        rows: rows.map((row) => ({
          ...row,
          cells: [...row.cells, ""],
        })),
      },
    });
  }

  function updateCell(rowIndex, cellIndex, value) {
    const nextRows = rows.map((row, currentRowIndex) =>
      currentRowIndex === rowIndex
        ? {
            ...row,
            cells: row.cells.map((cell, currentCellIndex) =>
              currentCellIndex === cellIndex ? value : cell
            ),
          }
        : row
    );

    onChange({
      ...question,
      table: {
        ...question.table,
        rows: nextRows,
      },
    });
  }

  function updateBlankIndex(rowIndex, value) {
    const nextRows = rows.map((row, currentRowIndex) =>
      currentRowIndex === rowIndex
        ? {
            ...row,
            blankIndex: Number(value) || 0,
          }
        : row
    );

    onChange({
      ...question,
      table: {
        ...question.table,
        rows: nextRows,
      },
    });
  }

  function addRow() {
    onChange({
      ...question,
      table: {
        ...question.table,
        rows: [
          ...rows,
          {
            cells: headers.map(() => ""),
            blankIndex: 0,
          },
        ],
      },
    });
  }

  return (
    <div className="grid gap-3">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Table Question</span>
        </label>
        <textarea
          value={question.question || ""}
          onChange={(event) =>
            onChange({
              ...question,
              question: event.target.value,
            })
          }
          className="textarea textarea-bordered min-h-24 w-full"
          placeholder="Enter table instructions"
        />
      </div>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={addHeader}
            className="btn btn-ghost btn-sm"
          >
            Add Column
          </button>
        </div>

        <div className="grid gap-2">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}
          >
            {headers.map((header, index) => (
              <input
                key={`header-${index}`}
                type="text"
                value={header}
                onChange={(event) => updateHeader(index, event.target.value)}
                className="input input-bordered w-full"
                placeholder={`Header ${index + 1}`}
              />
            ))}
          </div>

          {rows.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="grid gap-2">
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}
              >
                {row.cells.map((cell, cellIndex) => (
                  <input
                    key={`cell-${rowIndex}-${cellIndex}`}
                    type="text"
                    value={cellIndex === row.blankIndex ? cell || "____" : cell}
                    onChange={(event) =>
                      updateCell(rowIndex, cellIndex, event.target.value)
                    }
                    className="input input-bordered w-full"
                    placeholder={`Cell ${cellIndex + 1}`}
                  />
                ))}
              </div>

              <div className="form-control">
                <label className="label py-0">
                  <span className="label-text text-sm">Blank Cell Index</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={Math.max(row.cells.length - 1, 0)}
                  value={row.blankIndex}
                  onChange={(event) => updateBlankIndex(rowIndex, event.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button type="button" onClick={addRow} className="btn btn-ghost btn-sm">
              Add Row
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TfngGroupEditor({ question, onChange, groupKey }) {
  const items = Array.isArray(question.questions) ? question.questions : [];

  function updateItem(index, field, value) {
    onChange({
      ...question,
      questions: items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    });
  }

  function addItem() {
    onChange({
      ...question,
      questions: [
        ...items,
        {
          number: "",
          question: "",
          options: tfngOptions,
          correctAnswer: "",
        },
      ],
    });
  }

  function removeItem(index) {
    onChange({
      ...question,
      questions: items.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  return (
    <div className="grid gap-3">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Instructions</span>
        </label>
        <textarea
          value={question.instructions || ""}
          onChange={(event) =>
            onChange({
              ...question,
              instructions: event.target.value,
            })
          }
          className="textarea textarea-bordered min-h-24 w-full"
          placeholder="Enter TFNG instructions"
        />
      </div>

      <div className="grid gap-2">
        {items.map((item, index) => (
          <div
            key={`tfng-item-${index}`}
            className="rounded-xl border border-base-300 bg-base-100 p-3"
          >
            <div className="mb-2 flex justify-between gap-3">
              <p className="text-sm font-medium text-base-content/70">
                Statement {index + 1}
              </p>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="btn btn-ghost btn-xs"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-2">
              <input
                type="text"
                value={item.number}
                onChange={(event) => updateItem(index, "number", event.target.value)}
                className="input input-bordered w-full"
                placeholder="Question number"
              />
              <textarea
                value={item.question}
                onChange={(event) => updateItem(index, "question", event.target.value)}
                className="textarea textarea-bordered min-h-24 w-full"
                placeholder="Enter statement"
              />
              <div className="flex flex-wrap gap-2">
                {tfngOptions.map((option) => (
                  <label key={option} className="label cursor-pointer gap-2 rounded-lg border border-base-300 px-3 py-2">
                    <input
                      type="radio"
                      name={`tfng-answer-${groupKey}-${index}`}
                      className="radio radio-sm"
                      checked={item.correctAnswer === option}
                      onChange={() => updateItem(index, "correctAnswer", option)}
                    />
                    <span className="label-text">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={addItem} className="btn btn-ghost btn-sm">
          Add TFNG Statement
        </button>
      </div>
    </div>
  );
}

function StandardQuestionEditor({ question, onChange }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Number</span>
          </label>
          <input
            type="text"
            value={question.number || ""}
            onChange={(event) =>
              onChange({
                ...question,
                number: event.target.value,
              })
            }
            className="input input-bordered w-full"
            placeholder="No."
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Type</span>
          </label>
          <select
            value={question.type}
            onChange={(event) =>
              onChange({
                ...question,
                type: event.target.value,
              })
            }
            className="select select-bordered w-full"
          >
            {questionTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Question</span>
        </label>
        <textarea
          value={question.question || ""}
          onChange={(event) =>
            onChange({
              ...question,
              question: event.target.value,
            })
          }
          className="textarea textarea-bordered min-h-24 w-full"
          placeholder="Enter question"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Options</span>
        </label>
        <textarea
          value={formatOptionsForInput(question.options)}
          onChange={(event) =>
            onChange({
              ...question,
              options: parseOptionsInput(event.target.value),
            })
          }
          className="textarea textarea-bordered min-h-24 w-full"
          placeholder="One option per line"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Correct Answer</span>
        </label>
        <input
          type="text"
          value={question.correctAnswer || ""}
          onChange={(event) =>
            onChange({
              ...question,
              correctAnswer: event.target.value,
            })
          }
          className="input input-bordered w-full"
          placeholder="Leave blank if unknown"
        />
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  questionIndex,
  sectionIndex,
  isOpen,
  onToggle,
  onChange,
  onRemove,
}) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-200/50">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 text-left"
        >
          {isOpen ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {getQuestionSummary(question)}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onToggle} className="btn btn-ghost btn-sm">
            {isOpen ? "Hide Question" : "Show Question"}
          </button>
          <button type="button" onClick={onRemove} className="btn btn-ghost btn-sm">
            Remove
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-base-300 px-4 py-4">
          {question.type === "TABLE" ? (
            <TableEditor question={question} onChange={onChange} />
          ) : question.type === "TFNG" && Array.isArray(question.questions) ? (
            <TfngGroupEditor
              question={question}
              onChange={onChange}
              groupKey={`${sectionIndex}-${questionIndex}`}
            />
          ) : (
            <StandardQuestionEditor question={question} onChange={onChange} />
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function CreatorCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthorized = useRequireRole("creator");
  const [testName, setTestName] = useState("");
  const [difficulty, setDifficulty] = useState(difficultyOptions[0]);
  const [sections, setSections] = useState([createSection(1)]);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [pdfFile, setPdfFile] = useState(null);
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const testId = searchParams.get("id");

  const type = searchParams.get("type") || "";
  const category = searchParams.get("category") || "mock";
  const label = searchParams.get("label") || type || "Item";

  useEffect(() => {
    async function loadReadingTest() {
      if (!testId) {
        return;
      }

      setIsLoadingTest(true);

      try {
        const testSnapshot = await getDoc(doc(db, "readingTests", testId));

        if (!testSnapshot.exists()) {
          return;
        }

        const data = testSnapshot.data();
        setTestName(data.name || "");
        setDifficulty(data.difficulty || difficultyOptions[0]);

        const loadedSections = Array.isArray(data.sections) && data.sections.length > 0
          ? data.sections.map(normalizeSection)
          : [createSection(1)];

        setSections(loadedSections);
        setExpandedQuestions({});
      } catch (error) {
        console.error("[Creator Create] Failed to load reading test:", error);
      } finally {
        setIsLoadingTest(false);
      }
    }

    loadReadingTest();
  }, [testId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name: testName,
        difficulty,
        sections,
      };

      if (testId) {
        await updateDoc(doc(db, "readingTests", testId), payload);
      } else {
        await addDoc(collection(db, "readingTests"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      console.log("[Creator Create] Saved item:", {
        ...payload,
        createdAt: new Date().toISOString(),
      });
      router.push("/creator?type=reading");
    } catch (error) {
      console.error("[Creator Create] Failed to save item:", error);
    } finally {
      setIsSaving(false);
    }
  }

  function toggleQuestion(sectionIndex, questionIndex) {
    const key = `${sectionIndex}-${questionIndex}`;
    setExpandedQuestions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function updateSection(sectionIndex, field, value) {
    setSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              [field]: value,
            }
          : section
      )
    );
  }

  function updateQuestion(sectionIndex, questionIndex, nextQuestion) {
    setSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              questions: section.questions.map((question, currentQuestionIndex) =>
                currentQuestionIndex === questionIndex ? nextQuestion : question
              ),
            }
          : section
      )
    );
  }

  function removeQuestion(sectionIndex, questionIndex) {
    setSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              questions: section.questions.filter(
                (_, currentQuestionIndex) => currentQuestionIndex !== questionIndex
              ),
            }
          : section
      )
    );
  }

  function addStandardQuestion(sectionIndex) {
    setSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              questions: [...section.questions, createStandardQuestion()],
            }
          : section
      )
    );
  }

  function addTfngGroup(sectionIndex) {
    setSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              questions: [...section.questions, createTfngGroup()],
            }
          : section
      )
    );
  }

  function addTableQuestion(sectionIndex) {
    setSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              questions: [...section.questions, createTableQuestion()],
            }
          : section
      )
    );
  }

  function handlePdfFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setPdfFile(null);
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setPdfFile(null);
      return;
    }

    setPdfFile(file);
  }

  async function handleParsePdf() {
    if (!pdfFile) {
      return;
    }

    setIsParsingPdf(true);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to parse PDF.");
      }

      const parsedSections =
        Array.isArray(result.sections) && result.sections.length > 0
          ? result.sections.map(normalizeSection)
          : [createSection(1)];

      setSections(parsedSections);
      setExpandedQuestions({});
    } catch (error) {
      console.error("PARSE PDF ERROR:", error);
      alert("Check console for error");
    } finally {
      setIsParsingPdf(false);
    }
  }

  if (!isAuthorized || isLoadingTest) {
    return null;
  }

  return (
    <main className="min-h-screen bg-base-200 px-6 py-8 text-base-content md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex items-center gap-3 text-base-content/60">
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Creator / Create</span>
        </div>

        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-6 p-6 md:p-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
                {category === "practice" ? "Practice Activity" : "Mock Test"}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Create {label}
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-control">
                <label htmlFor="test-name" className="label">
                  <span className="label-text font-medium">Test Name</span>
                </label>
                <input
                  id="test-name"
                  type="text"
                  value={testName}
                  onChange={(event) => setTestName(event.target.value)}
                  className="input input-bordered w-full"
                  placeholder={`Enter ${label.toLowerCase()} title`}
                />
              </div>

              <div className="form-control gap-3">
                <label className="label py-0">
                  <span className="label-text font-medium">Difficulty</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {difficultyOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDifficulty(option)}
                      className={`btn rounded-xl ${
                        difficulty === option
                          ? "btn-primary"
                          : "btn-outline border-base-300"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-control">
                <label htmlFor="reading-pdf" className="label">
                  <span className="label-text font-medium">PDF File</span>
                </label>
                <input
                  id="reading-pdf"
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfFileChange}
                  className="file-input file-input-bordered w-full"
                />
              </div>

              <div className="form-control">
                <button
                  type="button"
                  onClick={handleParsePdf}
                  className="btn btn-outline border-base-300"
                  disabled={!pdfFile || isParsingPdf}
                >
                  {isParsingPdf ? "Parsing PDF..." : "Parse PDF with AI"}
                </button>
              </div>

              <div className="space-y-4">
                {sections.map((section, sectionIndex) => (
                  <div
                    key={`section-${sectionIndex}`}
                    className="rounded-2xl border border-base-300 bg-base-200/50 p-4 md:p-5"
                  >
                    <div className="mb-4 space-y-3">
                      <p className="text-sm font-semibold text-base-content/70">
                        Section {section.sectionNumber || sectionIndex + 1}
                      </p>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Title</span>
                        </label>
                        <input
                          type="text"
                          value={section.title || ""}
                          onChange={(event) =>
                            updateSection(sectionIndex, "title", event.target.value)
                          }
                          className="input input-bordered w-full"
                          placeholder="Section title"
                        />
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Passage</span>
                        </label>
                        <textarea
                          value={section.passage || ""}
                          onChange={(event) =>
                            updateSection(sectionIndex, "passage", event.target.value)
                          }
                          className="textarea textarea-bordered min-h-44 w-full"
                          placeholder="Paste reading passage"
                        />
                      </div>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => addStandardQuestion(sectionIndex)}
                        className="btn btn-outline border-base-300"
                      >
                        Add Question
                      </button>
                      <button
                        type="button"
                        onClick={() => addTfngGroup(sectionIndex)}
                        className="btn btn-outline border-base-300"
                      >
                        Add TFNG Group
                      </button>
                      <button
                        type="button"
                        onClick={() => addTableQuestion(sectionIndex)}
                        className="btn btn-outline border-base-300"
                      >
                        Add Table
                      </button>
                    </div>

                    <div className="space-y-2">
                      {section.questions.map((question, questionIndex) => {
                        const key = `${sectionIndex}-${questionIndex}`;

                        return (
                          <QuestionCard
                            key={key}
                            question={question}
                            questionIndex={questionIndex}
                            sectionIndex={sectionIndex}
                            isOpen={!!expandedQuestions[key]}
                            onToggle={() => toggleQuestion(sectionIndex, questionIndex)}
                            onChange={(nextQuestion) =>
                              updateQuestion(sectionIndex, questionIndex, nextQuestion)
                            }
                            onRemove={() => removeQuestion(sectionIndex, questionIndex)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-base-300 bg-base-200/50 px-4 py-4 text-sm text-base-content/65">
                <p>Type: {type || "Not provided"}</p>
                <p>
                  Category:{" "}
                  {category === "practice" ? "practice" : "mock"}
                </p>
                <p>Date will be generated automatically when you create this item.</p>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Reading Test"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

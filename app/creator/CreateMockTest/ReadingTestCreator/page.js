"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
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
const questionTypeOptions = ["TFNG", "MCQ", "FILL_BLANK", "MATCHING"];

function createQuestion() {
  return {
    type: "TFNG",
    question: "",
    options: [],
    correctAnswer: "",
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

export default function CreatorCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthorized = useRequireRole("creator");
  const [testName, setTestName] = useState("");
  const [passage, setPassage] = useState("");
  const [difficulty, setDifficulty] = useState(difficultyOptions[0]);
  const [sections, setSections] = useState([]);
  const [questions, setQuestions] = useState([]);
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

        const loadedSections = Array.isArray(data.sections) ? data.sections : [];
        const firstSection = loadedSections[0] || { passage: "", questions: [] };

        setSections(loadedSections);
        setPassage(firstSection.passage || "");
        setQuestions(
          (Array.isArray(firstSection.questions) ? firstSection.questions : []).map(
            (question) => ({
            type: question.type || "TFNG",
            question: question.question || "",
            options: Array.isArray(question.options) ? question.options : [],
            correctAnswer: question.correctAnswer || "",
          })
          )
        );
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
        sections: [
          {
            passage,
            questions,
          },
        ],
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

  function handleAddQuestion() {
    setQuestions((current) => [...current, createQuestion()]);
  }

  function handleQuestionChange(index, field, value) {
    setQuestions((current) =>
      current.map((questionItem, questionIndex) =>
        questionIndex === index
          ? {
              ...questionItem,
              [field]: value,
            }
          : questionItem
      )
    );
  }

  function handleRemoveQuestion(index) {
    setQuestions((current) =>
      current.filter((_, questionIndex) => questionIndex !== index)
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

      const sections = Array.isArray(result.sections) ? result.sections : [];
      const firstSection = sections[0] || { passage: "", questions: [] };

      setSections(sections);
      setPassage(firstSection.passage || "");
      setQuestions(
        (Array.isArray(firstSection.questions) ? firstSection.questions : []).map(
          (question) => ({
          type: question.type || "TFNG",
          question: question.question || "",
          options: Array.isArray(question.options) ? question.options : [],
          correctAnswer: question.correctAnswer || "",
        })
        )
      );
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
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

              <div className="form-control">
                <label htmlFor="reading-passage" className="label">
                  <span className="label-text font-medium">Passage</span>
                </label>
                <textarea
                  id="reading-passage"
                  value={passage}
                  onChange={(event) => setPassage(event.target.value)}
                  className="textarea textarea-bordered min-h-44 w-full"
                  placeholder="Paste reading passage"
                />
              </div>

              <div className="form-control">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="btn btn-outline border-base-300"
                >
                  Add Question
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((questionItem, index) => (
                  <div
                    key={`question-${index}`}
                    className="rounded-2xl border border-base-300 bg-base-200/50 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-base-content/70">
                        Question {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(index)}
                        className="btn btn-ghost btn-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4">
                      <div className="form-control">
                        <label htmlFor={`question-type-${index}`} className="label">
                          <span className="label-text font-medium">Type</span>
                        </label>
                        <select
                          id={`question-type-${index}`}
                          value={questionItem.type}
                          onChange={(event) =>
                            handleQuestionChange(index, "type", event.target.value)
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

                      <div className="form-control">
                        <label htmlFor={`question-text-${index}`} className="label">
                          <span className="label-text font-medium">Question</span>
                        </label>
                        <textarea
                          id={`question-text-${index}`}
                          value={questionItem.question}
                          onChange={(event) =>
                            handleQuestionChange(index, "question", event.target.value)
                          }
                          className="textarea textarea-bordered min-h-28 w-full"
                          placeholder="Enter question"
                        />
                      </div>

                      <div className="form-control">
                        <label htmlFor={`question-options-${index}`} className="label">
                          <span className="label-text font-medium">
                            Options
                          </span>
                        </label>
                        <textarea
                          id={`question-options-${index}`}
                          value={formatOptionsForInput(questionItem.options)}
                          onChange={(event) =>
                            handleQuestionChange(
                              index,
                              "options",
                              parseOptionsInput(event.target.value)
                            )
                          }
                          className="textarea textarea-bordered min-h-28 w-full"
                          placeholder="One option per line"
                        />
                      </div>

                      <div className="form-control">
                        <label htmlFor={`question-answer-${index}`} className="label">
                          <span className="label-text font-medium">
                            Correct Answer
                          </span>
                        </label>
                        <input
                          id={`question-answer-${index}`}
                          type="text"
                          value={questionItem.correctAnswer}
                          onChange={(event) =>
                            handleQuestionChange(
                              index,
                              "correctAnswer",
                              event.target.value
                            )
                          }
                          className="input input-bordered w-full"
                          placeholder="Enter correct answer"
                        />
                      </div>
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

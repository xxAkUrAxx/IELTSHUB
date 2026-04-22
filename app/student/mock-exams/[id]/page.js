"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase/config";

const tfngOptions = ["TRUE", "FALSE", "NOT GIVEN"];

function normalizeTable(table) {
  const headers = Array.isArray(table?.headers) ? table.headers : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];

  return {
    headers: headers.length > 0 ? headers : [""],
    rows: rows.map((row) => ({
      cells: Array.isArray(row?.cells) ? row.cells : [],
      blankIndex: typeof row?.blankIndex === "number" ? row.blankIndex : -1,
      questionNumber: row?.questionNumber || "",
    })),
  };
}

function normalizeQuestion(question) {
  if (question?.type === "TABLE") {
    return {
      type: "TABLE",
      instructions: question.instructions || "",
      questionRange: question.questionRange || "",
      question: question.question || "",
      table: normalizeTable(question.table),
    };
  }

  if (question?.type === "TFNG" && Array.isArray(question.questions)) {
    return {
      type: "TFNG",
      instructions: question.instructions || "",
      questionRange: question.questionRange || "",
      questions: question.questions.map((item) => ({
        number: item.number || "",
        question: item.question || "",
        options:
          Array.isArray(item.options) && item.options.length > 0
            ? item.options
            : tfngOptions,
      })),
    };
  }

  return {
    number: question?.number || "",
    type: question?.type || "FILL_BLANK",
    question: question?.question || "",
  };
}

function renderFillBlankQuestion(question, answer, onChange) {
  const hasBlank = question.question.includes("____");
  const parts = hasBlank ? question.question.split("____") : [question.question, ""];

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
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

function renderTfngGroup(question, answers, onChange) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <p className="mb-2 text-sm font-medium text-base-content/60">
        {question.questionRange ? `Questions ${question.questionRange}` : "TFNG"}
      </p>
      <p className="mb-4 text-base leading-7 text-base-content">
        {question.instructions}
      </p>

      <div className="space-y-4">
        {question.questions.map((item, index) => (
          <div key={`tfng-${item.number || index}`} className="rounded-xl border border-base-300 bg-base-200/40 p-4">
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

function renderTableQuestion(question, answers, onChange) {
  const headers = question.table?.headers || [];
  const rows = question.table?.rows || [];

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <p className="mb-2 text-sm font-medium text-base-content/60">Table Completion</p>
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
                    {cellIndex === row.blankIndex ? (
                      <input
                        type="text"
                        value={answers[row.questionNumber || rowIndex] || ""}
                        onChange={(event) =>
                          onChange(row.questionNumber || rowIndex, event.target.value)
                        }
                        className="input input-bordered w-full"
                        placeholder={row.questionNumber ? `Q${row.questionNumber}` : "Answer"}
                      />
                    ) : (
                      cell
                    )}
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

export default function StudentMockExamPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [answers, setAnswers] = useState({});

  const testId = useMemo(
    () => params?.id || searchParams.get("id") || "",
    [params, searchParams]
  );

  useEffect(() => {
    async function loadTest() {
      if (!testId) {
        setErrorMessage("No test id provided.");
        setIsLoading(false);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "readingTests", testId));

        if (!snapshot.exists()) {
          setErrorMessage("Reading test not found.");
          setIsLoading(false);
          return;
        }

        const data = snapshot.data();
        setTest({
          id: snapshot.id,
          name: data.name || "Reading Test",
          sections: Array.isArray(data.sections)
            ? data.sections.map((section) => ({
                ...section,
                questions: Array.isArray(section?.questions)
                  ? section.questions.map(normalizeQuestion)
                  : [],
              }))
            : [],
        });
      } catch (error) {
        console.error("[Student Preview] Failed to load reading test:", error);
        setErrorMessage("Failed to load reading test.");
      } finally {
        setIsLoading(false);
      }
    }

    loadTest();
  }, [testId]);

  function updateAnswer(key, value) {
    setAnswers((current) => ({
      ...current,
      [key]: value,
    }));
  }

  if (isLoading) {
    return null;
  }

  if (!testId || errorMessage) {
    return (
      <main className="min-h-screen bg-base-200 px-6 py-10 text-base-content">
        <div className="mx-auto max-w-4xl rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Preview Error</h1>
          <p className="mt-3 text-base-content/70">
            {errorMessage || "No test id provided."}
          </p>
        </div>
      </main>
    );
  }

  const firstSection = test?.sections?.[0];

  return (
    <main className="min-h-screen bg-base-200 px-6 py-10 text-base-content">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
            Student Preview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{test?.name}</h1>
        </header>

        {test?.sections?.map((section, sectionIndex) => (
          <section
            key={`preview-section-${sectionIndex}`}
            className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
          >
            <article className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
                Section {section.sectionNumber || sectionIndex + 1}
              </p>
              {section.title ? (
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{section.title}</h2>
              ) : null}
              <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-base-content">
                {section.passage}
              </div>
            </article>

            <aside className="space-y-4">
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
            </aside>
          </section>
        ))}

        {!firstSection && !test?.sections?.length ? (
          <div className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
            <p className="text-base-content/70">This test has no sections yet.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

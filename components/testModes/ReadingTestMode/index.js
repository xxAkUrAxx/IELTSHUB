"use client";

import { useEffect, useRef, useState } from "react";

const tfngOptions = ["TRUE", "FALSE", "NOT GIVEN"];
const DEFAULT_LEFT_WIDTH = 60;
const MIN_LEFT_WIDTH = 40;
const MAX_LEFT_WIDTH = 70;

function renderFillBlankQuestion(question, answer, onChange) {
  const hasBlank = question.question.includes("____");
  const parts = hasBlank ? question.question.split("____") : [question.question, ""];

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

function renderTableQuestion(question, answers, onChange) {
  const headers = question.table?.headers || [];
  const rows = question.table?.rows || [];

  return (
    <div className="mb-6 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
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

export default function ReadingTestMode({ testData }) {
  const [answers, setAnswers] = useState({});
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const containerRef = useRef(null);
  const dragStateRef = useRef({
    dragging: false,
  });

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlHeight = html.style.height;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyHeight = body.style.height;
    const previousBodyOverflow = body.style.overflow;

    html.style.height = "100%";
    html.style.overflow = "hidden";
    body.style.height = "100%";
    body.style.overflow = "hidden";

    return () => {
      html.style.height = previousHtmlHeight;
      html.style.overflow = previousHtmlOverflow;
      body.style.height = previousBodyHeight;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    function stopDragging() {
      dragStateRef.current.dragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    function updateWidth(clientX) {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const { left, width } = container.getBoundingClientRect();
      if (!width) {
        return;
      }

      const nextLeftWidth = ((clientX - left) / width) * 100;
      const clampedLeftWidth = Math.min(
        MAX_LEFT_WIDTH,
        Math.max(MIN_LEFT_WIDTH, nextLeftWidth)
      );

      setLeftWidth(clampedLeftWidth);
    }

    function handlePointerMove(event) {
      if (!dragStateRef.current.dragging) {
        return;
      }

      updateWidth(event.clientX);
    }

    function handlePointerUp() {
      if (!dragStateRef.current.dragging) {
        return;
      }

      stopDragging();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      stopDragging();
    };
  }, []);

  function updateAnswer(key, value) {
    setAnswers((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function startResizing(event) {
    dragStateRef.current.dragging = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    event.preventDefault();
  }

  const sections = Array.isArray(testData?.sections) ? testData.sections : [];
  const questions = Array.isArray(testData?.questions) ? testData.questions : [];
  const hasSections = sections.length > 0;
  const rightWidth = 100 - leftWidth;

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-base-200 text-base-content">
      {hasSections ? (
        <div ref={containerRef} className="flex h-full w-full overflow-hidden">
          <div
            className="h-full overflow-y-auto border-r border-base-300 bg-base-100 p-6"
            style={{ width: `${leftWidth}%` }}
          >
            <div className="space-y-8">
              <section className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
                  Student Preview
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  {testData?.name || "Reading Test"}
                </h1>
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
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                      {section.title}
                    </h2>
                  ) : null}
                  <div className="mt-6 whitespace-pre-line text-base leading-8 text-base-content">
                    {section.passage}
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
            tabIndex={0}
            className="reading-test-divider relative h-full w-3 shrink-0 bg-base-200"
            onPointerDown={startResizing}
          >
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-base-300" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-base-100 shadow-sm">
              <span className="h-6 w-[2px] rounded-full bg-base-300" />
            </div>
          </div>

          <div
            className="h-full overflow-y-auto bg-base-200 p-6"
            style={{ width: `${rightWidth}%` }}
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

      <style jsx>{`
        .reading-test-divider {
          cursor: col-resize;
          touch-action: none;
        }
      `}</style>
    </main>
  );
}

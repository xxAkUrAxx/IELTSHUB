"use client";

import { useEffect, useRef, useState } from "react";

const tfngOptions = ["TRUE", "FALSE", "NOT GIVEN"];
const paragraphLetterPattern = /^([A-Z])(?:[\.\)]|\s|$)/;
const DEFAULT_LEFT_WIDTH = 60;
const MIN_LEFT_WIDTH = 40;
const MAX_LEFT_WIDTH = 70;
const DIVIDER_WIDTH = 6;

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
  const [answers, setAnswers] = useState({});
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const previousUserSelectRef = useRef("");

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

  const sections = Array.isArray(testData?.sections) ? testData.sections : [];
  const questions = Array.isArray(testData?.questions) ? testData.questions : [];
  const hasSections = sections.length > 0;
  const rightWidth = 100 - leftWidth;

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

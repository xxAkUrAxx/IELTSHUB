"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../../lib/firebase/config";
import ReadingTestMode from "../../../../components/testModes/ReadingTestMode";

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
        options: Array.isArray(item.options) ? item.options : [],
      })),
    };
  }

  if (question?.type === "MULTIPLE_CHOICE" && Array.isArray(question.questions)) {
    return {
      type: "MULTIPLE_CHOICE",
      instructions: question.instructions || "",
      questionRange: question.questionRange || "",
      questions: question.questions.map((item) => ({
        number: item.number || "",
        question: item.question || "",
        options: Array.isArray(item.options) ? item.options : [],
        correctAnswer: item.correctAnswer || "",
        correctAnswers: Array.isArray(item.correctAnswers)
          ? item.correctAnswers
          : Array.isArray(item.acceptedAnswers)
            ? item.acceptedAnswers
            : item.correctAnswer
              ? [item.correctAnswer]
              : [],
        selectionCount:
          Number(item.selectionCount) > 0
            ? Number(item.selectionCount)
            : Array.isArray(item.correctAnswers) && item.correctAnswers.length > 0
              ? item.correctAnswers.length
              : Array.isArray(item.acceptedAnswers) && item.acceptedAnswers.length > 0
                ? item.acceptedAnswers.length
                : 1,
      })),
    };
  }

  return {
    number: question?.number || "",
    type: question?.type || "FILL_BLANK",
    question: question?.question || "",
  };
}

export default function StudentMockExamPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const testId = useMemo(
    () => params?.id || searchParams.get("id") || "",
    [params, searchParams]
  );

  useEffect(() => {
    if (!testId) {
      setErrorMessage("No test id provided.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "readingTests", testId));

        if (!snapshot.exists()) {
          setErrorMessage("Reading test not found.");
          setTest(null);
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
        setTest(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [testId]);

  if (isLoading) {
    return null;
  }

  if (!testId || errorMessage) {
    return (
      <main className="flex h-screen w-screen overflow-hidden bg-base-200 text-base-content">
        <div className="m-6 rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Preview Error</h1>
          <p className="mt-3 text-base-content/70">
            {errorMessage || "No test id provided."}
          </p>
        </div>
      </main>
    );
  }

  return <ReadingTestMode testData={test} />;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import ListeningTestMode from "../../../../../components/testModes/ListeningTestMode";
import ReadingTestMode from "../../../../../components/testModes/ReadingTestMode";
import SpeakingTestMode from "../../../../../components/testModes/SpeakingTestMode";
import WritingTestMode from "../../../../../components/testModes/WritingTestMode";
import { useAuth } from "../../../../../lib/firebase/auth-context";
import { loadStudentTest } from "../../../../../lib/tests/student-tests";

function renderTestComponent(testType, testData) {
  if (testType === "reading") {
    return <ReadingTestMode testData={testData} />;
  }

  if (testType === "listening") {
    return <ListeningTestMode testData={testData} />;
  }

  if (testType === "writing") {
    return <WritingTestMode testData={testData} />;
  }

  if (testType === "speaking") {
    return <SpeakingTestMode testData={testData} />;
  }

  return null;
}

export default function StudentMockExamRunnerPage() {
  const params = useParams();
  const { isLoading: isAuthLoading, user } = useAuth();
  const [testData, setTestData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const testType = useMemo(() => String(params?.type || "").toLowerCase(), [params]);
  const testId = useMemo(() => String(params?.id || ""), [params]);

  useEffect(() => {
    let isActive = true;

    async function loadTest() {
      if (isAuthLoading) {
        return;
      }

      if (!user) {
        setIsLoading(false);
        return;
      }

      if (!testType || !testId) {
        setErrorMessage("Missing test information.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        const loadedTest = await loadStudentTest({ testType, testId });

        if (!isActive) {
          return;
        }

        setTestData(loadedTest);
      } catch (error) {
        console.error("[Student] Failed to load test:", error);

        if (!isActive) {
          return;
        }

        setErrorMessage(error?.message || "Failed to load test.");
        setTestData(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadTest();

    return () => {
      isActive = false;
    };
  }, [isAuthLoading, testId, testType, user]);

  if (isLoading) {
    return null;
  }

  if (errorMessage || !testData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200 px-6 py-10 text-base-content">
        <div className="w-full max-w-2xl rounded-3xl border border-base-300 bg-base-100 p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">Unable to Load Test</h1>
          <p className="mt-4 text-base leading-7 text-base-content/70">
            {errorMessage || "The requested test could not be loaded."}
          </p>
        </div>
      </main>
    );
  }

  return renderTestComponent(testType, testData);
}

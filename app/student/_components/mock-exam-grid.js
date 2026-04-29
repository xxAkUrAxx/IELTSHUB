"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenIcon,
  MicrophoneIcon,
  PencilSquareIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import TestCard from "./test-card";
import { useAuth } from "../../../lib/firebase/auth-context";
import {
  listStudentResults,
  listStudentTests,
} from "../../../lib/tests/student-tests";

const testTypeIcons = {
  reading: BookOpenIcon,
  writing: PencilSquareIcon,
  listening: SpeakerWaveIcon,
  speaking: MicrophoneIcon,
};

function sortByCreatedAtDescending(tests) {
  return [...tests].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();

    return (Number.isNaN(rightTime) ? 0 : rightTime) -
      (Number.isNaN(leftTime) ? 0 : leftTime);
  });
}

export default function MockExamGrid({
  heading = "Mock Exams",
  testType = "",
}) {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [tests, setTests] = useState([]);
  const [resultsByTestKey, setResultsByTestKey] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadTests() {
      if (isAuthLoading) {
        return;
      }

      if (!user) {
        if (!isActive) {
          return;
        }

        setTests([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        const [loadedTests, loadedResults] = await Promise.all([
          listStudentTests(testType),
          listStudentResults(user.uid),
        ]);

        if (!isActive) {
          return;
        }

        setTests(sortByCreatedAtDescending(loadedTests));
        setResultsByTestKey(loadedResults);
      } catch (error) {
        console.error("[Student] Failed to load mock exams:", error);

        if (!isActive) {
          return;
        }

        setErrorMessage("Failed to load tests.");
        setTests([]);
        setResultsByTestKey({});
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadTests();

    return () => {
      isActive = false;
    };
  }, [isAuthLoading, testType, user]);

  const emptyLabel = useMemo(() => {
    if (testType) {
      return `No ${testType} tests available yet.`;
    }

    return "No mock exams available yet.";
  }, [testType]);

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
      </header>

      <div className="flex flex-1 items-start justify-center">
        {tests.length > 0 ? (
          <div className="grid w-full max-w-6xl gap-6 md:grid-cols-2 xl:grid-cols-3">
            {tests.map((test) => {
              const Icon = testTypeIcons[test.type] || BookOpenIcon;
              const resultKey = `${test.type}:${test.id}`;
              const result = resultsByTestKey[resultKey];

              return (
                <TestCard
                  key={`${test.type}-${test.id}`}
                  title={test.title}
                  difficulty={test.difficulty}
                  icon={Icon}
                  href={`/student/mock-exams/${test.type}/${test.id}`}
                  createdAt={test.createdAt}
                  completed={!!result?.completed}
                  bandScore={result?.bandScore}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
            <p className="text-lg font-medium text-base-content/65">
              {isLoading
                ? "Loading tests..."
                : errorMessage || emptyLabel}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

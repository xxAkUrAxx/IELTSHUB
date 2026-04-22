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

export default function WritingTestCreatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthorized = useRequireRole("creator");
  const [testName, setTestName] = useState("");
  const [difficulty, setDifficulty] = useState(difficultyOptions[0]);
  const [task1, setTask1] = useState("");
  const [task2, setTask2] = useState("");
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const testId = searchParams.get("id");

  useEffect(() => {
    async function loadWritingTest() {
      if (!testId) {
        return;
      }

      setIsLoadingTest(true);

      try {
        const testSnapshot = await getDoc(doc(db, "writingTests", testId));

        if (!testSnapshot.exists()) {
          return;
        }

        const data = testSnapshot.data();
        setTestName(data.name || "");
        setDifficulty(data.difficulty || difficultyOptions[0]);
        setTask1(data.task1 || "");
        setTask2(data.task2 || "");
      } catch (error) {
        console.error("[Writing Creator] Failed to load test:", error);
      } finally {
        setIsLoadingTest(false);
      }
    }

    loadWritingTest();
  }, [testId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name: testName,
        difficulty,
        task1,
        task2,
      };

      if (testId) {
        await updateDoc(doc(db, "writingTests", testId), payload);
      } else {
        await addDoc(collection(db, "writingTests"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      router.push("/creator?type=writing");
    } catch (error) {
      console.error("[Writing Creator] Failed to save test:", error);
    } finally {
      setIsSaving(false);
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
                Mock Test
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Create Writing Test
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
                  placeholder="Enter writing test title"
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
                <label htmlFor="writing-task-1" className="label">
                  <span className="label-text font-medium">Task 1</span>
                </label>
                <textarea
                  id="writing-task-1"
                  value={task1}
                  onChange={(event) => setTask1(event.target.value)}
                  className="textarea textarea-bordered min-h-44 w-full"
                  placeholder="Enter task 1"
                />
              </div>

              <div className="form-control">
                <label htmlFor="writing-task-2" className="label">
                  <span className="label-text font-medium">Task 2</span>
                </label>
                <textarea
                  id="writing-task-2"
                  value={task2}
                  onChange={(event) => setTask2(event.target.value)}
                  className="textarea textarea-bordered min-h-44 w-full"
                  placeholder="Enter task 2"
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Writing Test"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

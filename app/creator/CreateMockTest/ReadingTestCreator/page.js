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

export default function CreatorCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthorized = useRequireRole("creator");
  const [testName, setTestName] = useState("");
  const [passage, setPassage] = useState("");
  const [difficulty, setDifficulty] = useState(difficultyOptions[0]);
  const [isLoadingTest, setIsLoadingTest] = useState(false);
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
        setPassage(data.sections?.[0]?.passage || "");
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
            questions: [],
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
      router.push("/creator");
    } catch (error) {
      console.error("[Creator Create] Failed to save item:", error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleAddQuestion() {
    console.log("Add Question Clicked");
  }

  if (!isAuthorized) {
    return null;
  }

  if (isLoadingTest) {
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

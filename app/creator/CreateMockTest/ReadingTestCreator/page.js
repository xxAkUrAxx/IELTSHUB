"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../lib/firebase/config";
import { useRequireRole } from "../../../../lib/firebase/role-guard";

const difficultyOptions = ["Easy", "Medium", "Hard"];

function getCollectionName(category) {
  return category === "practice" ? "practiceActivities" : "mockTests";
}

export default function CreatorCreatePage() {
  const searchParams = useSearchParams();
  const isAuthorized = useRequireRole("creator");
  const [testName, setTestName] = useState("");
  const [difficulty, setDifficulty] = useState(difficultyOptions[0]);
  const [isSaving, setIsSaving] = useState(false);

  const type = searchParams.get("type") || "";
  const category = searchParams.get("category") || "mock";
  const label = searchParams.get("label") || type || "Item";

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);

    const payload = {
      name: testName,
      difficulty,
      type,
      category,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, getCollectionName(category)), payload);
      console.log("[Creator Create] Saved item:", {
        ...payload,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Creator Create] Failed to save item:", error);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAuthorized) {
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
                  {isSaving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

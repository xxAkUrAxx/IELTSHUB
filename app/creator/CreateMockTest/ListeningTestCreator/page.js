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

export default function ListeningTestCreatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthorized = useRequireRole("creator");
  const [testName, setTestName] = useState("");
  const [difficulty, setDifficulty] = useState(difficultyOptions[0]);
  const [audioUrl, setAudioUrl] = useState("");
  const [passage, setPassage] = useState("");
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const testId = searchParams.get("id");

  useEffect(() => {
    async function loadListeningTest() {
      if (!testId) {
        return;
      }

      setIsLoadingTest(true);

      try {
        const testSnapshot = await getDoc(doc(db, "listeningTests", testId));

        if (!testSnapshot.exists()) {
          return;
        }

        const data = testSnapshot.data();
        setTestName(data.name || "");
        setDifficulty(data.difficulty || difficultyOptions[0]);
        setAudioUrl(data.audioUrl || "");
        setPassage(data.sections?.[0]?.passage || "");
      } catch (error) {
        console.error("[Listening Creator] Failed to load test:", error);
      } finally {
        setIsLoadingTest(false);
      }
    }

    loadListeningTest();
  }, [testId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name: testName,
        difficulty,
        audioUrl,
        sections: [
          {
            passage,
            questions: [],
          },
        ],
      };

      if (testId) {
        await updateDoc(doc(db, "listeningTests", testId), payload);
      } else {
        await addDoc(collection(db, "listeningTests"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      router.push("/creator?type=listening");
    } catch (error) {
      console.error("[Listening Creator] Failed to save test:", error);
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
                Create Listening Test
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
                  placeholder="Enter listening test title"
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
                <label htmlFor="audio-url" className="label">
                  <span className="label-text font-medium">Audio URL</span>
                </label>
                <input
                  id="audio-url"
                  type="text"
                  value={audioUrl}
                  onChange={(event) => setAudioUrl(event.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Enter audio URL"
                />
              </div>

              <div className="form-control">
                <label htmlFor="listening-passage" className="label">
                  <span className="label-text font-medium">Section 1 Passage</span>
                </label>
                <textarea
                  id="listening-passage"
                  value={passage}
                  onChange={(event) => setPassage(event.target.value)}
                  className="textarea textarea-bordered min-h-44 w-full"
                  placeholder="Enter section 1 passage"
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Listening Test"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

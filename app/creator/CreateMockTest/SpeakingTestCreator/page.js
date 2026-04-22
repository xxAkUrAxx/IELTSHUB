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

export default function SpeakingTestCreatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthorized = useRequireRole("creator");
  const [testName, setTestName] = useState("");
  const [difficulty, setDifficulty] = useState(difficultyOptions[0]);
  const [part1Questions, setPart1Questions] = useState("");
  const [part2CueCard, setPart2CueCard] = useState("");
  const [part3Questions, setPart3Questions] = useState("");
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const testId = searchParams.get("id");

  useEffect(() => {
    async function loadSpeakingTest() {
      if (!testId) {
        return;
      }

      setIsLoadingTest(true);

      try {
        const testSnapshot = await getDoc(doc(db, "speakingTests", testId));

        if (!testSnapshot.exists()) {
          return;
        }

        const data = testSnapshot.data();
        setTestName(data.name || "");
        setDifficulty(data.difficulty || difficultyOptions[0]);
        setPart1Questions(data.part1Questions || "");
        setPart2CueCard(data.part2CueCard || "");
        setPart3Questions(data.part3Questions || "");
      } catch (error) {
        console.error("[Speaking Creator] Failed to load test:", error);
      } finally {
        setIsLoadingTest(false);
      }
    }

    loadSpeakingTest();
  }, [testId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name: testName,
        difficulty,
        part1Questions,
        part2CueCard,
        part3Questions,
      };

      if (testId) {
        await updateDoc(doc(db, "speakingTests", testId), payload);
      } else {
        await addDoc(collection(db, "speakingTests"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      router.push("/creator?type=speaking");
    } catch (error) {
      console.error("[Speaking Creator] Failed to save test:", error);
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
                Create Speaking Test
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
                  placeholder="Enter speaking test title"
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
                <label htmlFor="speaking-part-1" className="label">
                  <span className="label-text font-medium">Part 1 Questions</span>
                </label>
                <textarea
                  id="speaking-part-1"
                  value={part1Questions}
                  onChange={(event) => setPart1Questions(event.target.value)}
                  className="textarea textarea-bordered min-h-36 w-full"
                  placeholder="Enter part 1 questions"
                />
              </div>

              <div className="form-control">
                <label htmlFor="speaking-part-2" className="label">
                  <span className="label-text font-medium">Part 2 Cue Card</span>
                </label>
                <textarea
                  id="speaking-part-2"
                  value={part2CueCard}
                  onChange={(event) => setPart2CueCard(event.target.value)}
                  className="textarea textarea-bordered min-h-36 w-full"
                  placeholder="Enter part 2 cue card"
                />
              </div>

              <div className="form-control">
                <label htmlFor="speaking-part-3" className="label">
                  <span className="label-text font-medium">Part 3 Questions</span>
                </label>
                <textarea
                  id="speaking-part-3"
                  value={part3Questions}
                  onChange={(event) => setPart3Questions(event.target.value)}
                  className="textarea textarea-bordered min-h-36 w-full"
                  placeholder="Enter part 3 questions"
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Speaking Test"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

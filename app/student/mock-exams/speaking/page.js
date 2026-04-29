"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import SpeakingTestMode from "../../../../components/testModes/SpeakingTestMode";
import { auth } from "../../../../lib/firebase/config";
import { listSpeakingTests } from "../../../../lib/tests/speaking-tests";

export default function StudentSpeakingMockExamPage() {
  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage("");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const speakingTests = await listSpeakingTests();

        if (speakingTests.length === 0) {
          setErrorMessage("No speaking tests are available yet.");
          setTest(null);
          setIsLoading(false);
          return;
        }

        setTest(speakingTests[0]);
      } catch (error) {
        console.error("[Student Speaking] Failed to load speaking tests:", error);
        setErrorMessage("Failed to load the speaking test.");
        setTest(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return null;
  }

  if (errorMessage || !test) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200 px-6 py-10 text-base-content">
        <div className="w-full max-w-2xl rounded-3xl border border-base-300 bg-base-100 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
            Speaking Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Unable to Load Speaking Test
          </h1>
          <p className="mt-4 text-base leading-7 text-base-content/70">
            {errorMessage || "No speaking test could be loaded."}
          </p>
        </div>
      </main>
    );
  }

  return <SpeakingTestMode testData={test} />;
}

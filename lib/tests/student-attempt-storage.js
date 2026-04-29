export function buildStudentAttemptStorageKey({ userId, testId, testType }) {
  if (!testId || !testType) {
    return "";
  }

  return `student-attempt:${userId || "anonymous"}:${testType}:${testId}`;
}

export function loadStudentAttemptDraft(storageKey) {
  if (!storageKey || typeof window === "undefined") {
    return null;
  }

  try {
    const serializedDraft = window.localStorage.getItem(storageKey);

    if (!serializedDraft) {
      return null;
    }

    return JSON.parse(serializedDraft);
  } catch (error) {
    console.error("[Student Attempt] Failed to load local draft:", error);
    return null;
  }
}

export function saveStudentAttemptDraft(storageKey, payload) {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (error) {
    console.error("[Student Attempt] Failed to save local draft:", error);
  }
}

export function clearStudentAttemptDraft(storageKey) {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch (error) {
    console.error("[Student Attempt] Failed to clear local draft:", error);
  }
}

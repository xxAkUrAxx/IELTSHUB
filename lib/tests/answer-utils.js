// Clean one answer
export function normalizeAcceptedAnswer(answer) {
  return String(answer || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Split answer choices
export function splitAcceptedAnswers(answer) {
  const rawAnswer = String(answer || "").trim();

  if (!rawAnswer) {
    return [];
  }

  const seen = new Set();

  return rawAnswer
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const normalized = normalizeAcceptedAnswer(part);

      if (!normalized || seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
}

// Build answer payload
export function buildAcceptedAnswerPayload(answer) {
  const acceptedAnswers = splitAcceptedAnswers(answer);

  return {
    correctAnswer: acceptedAnswers[0] || String(answer || "").trim(),
    acceptedAnswers,
  };
}

// Clean choice letters
export function normalizeMultipleChoiceAnswers(answers) {
  const rawAnswers = Array.isArray(answers) ? answers : splitAcceptedAnswers(answers);
  const seen = new Set();

  return rawAnswers
    .map((answer) => String(answer || "").trim().toUpperCase())
    .filter(Boolean)
    .filter((answer) => {
      if (seen.has(answer)) {
        return false;
      }

      seen.add(answer);
      return true;
    });
}

// Build choice payload
export function buildMultipleChoiceAnswerPayload(answers) {
  const correctAnswers = normalizeMultipleChoiceAnswers(answers);

  return {
    correctAnswer: correctAnswers[0] || "",
    correctAnswers,
    acceptedAnswers: correctAnswers,
    selectionCount: Math.max(1, correctAnswers.length),
    pointsAvailable: correctAnswers.length,
  };
}

// Check one answer
export function isAnswerCorrect(userAnswer, acceptedAnswers = []) {
  const normalizedUserAnswer = normalizeAcceptedAnswer(userAnswer);

  if (!normalizedUserAnswer) {
    return false;
  }

  return acceptedAnswers.some(
    (acceptedAnswer) =>
      normalizeAcceptedAnswer(acceptedAnswer) === normalizedUserAnswer
  );
}

// Score choice picks
export function calculateMultipleChoiceScore(selectedAnswers, correctAnswers) {
  const normalizedSelectedAnswers = normalizeMultipleChoiceAnswers(selectedAnswers);
  const normalizedCorrectAnswers = normalizeMultipleChoiceAnswers(correctAnswers);

  return normalizedSelectedAnswers.reduce(
    (score, answer) =>
      normalizedCorrectAnswers.includes(answer) ? score + 1 : score,
    0
  );
}

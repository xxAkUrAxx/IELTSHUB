import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { getTestCollectionName } from "./test-conventions";
import { normalizeSpeakingTest } from "./speaking-tests";

function formatCreatedAtValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return value;
}

function sanitizeReadingQuestion(question = {}) {
  if (question.type === "TABLE") {
    return {
      type: "TABLE",
      instructions: question.instructions || "",
      questionRange: question.questionRange || "",
      question: question.question || "",
      table: {
        headers: Array.isArray(question.table?.headers)
          ? question.table.headers
          : [],
        rows: Array.isArray(question.table?.rows)
          ? question.table.rows.map((row) => ({
              cells: Array.isArray(row?.cells) ? row.cells : [],
              blankIndex: typeof row?.blankIndex === "number" ? row.blankIndex : -1,
              questionNumber: row?.questionNumber || "",
            }))
          : [],
      },
    };
  }

  if (question.type === "TFNG" && Array.isArray(question.questions)) {
    return {
      type: "TFNG",
      instructions: question.instructions || "",
      questionRange: question.questionRange || "",
      questions: question.questions.map((item) => ({
        number: item.number || "",
        question: item.question || "",
        options: Array.isArray(item.options) ? item.options : [],
      })),
    };
  }

  if (question.type === "MULTIPLE_CHOICE" && Array.isArray(question.questions)) {
    return {
      type: "MULTIPLE_CHOICE",
      instructions: question.instructions || "",
      questionRange: question.questionRange || "",
      questions: question.questions.map((item) => ({
        number: item.number || "",
        question: item.question || "",
        options: Array.isArray(item.options) ? item.options : [],
        selectionCount:
          Number(item.selectionCount) > 0
            ? Number(item.selectionCount)
            : Array.isArray(item.correctAnswers) && item.correctAnswers.length > 0
              ? item.correctAnswers.length
              : Array.isArray(item.acceptedAnswers) && item.acceptedAnswers.length > 0
                ? item.acceptedAnswers.length
                : 1,
      })),
    };
  }

  if (
    question.type === "MATCHING_INFORMATION" &&
    Array.isArray(question.questions)
  ) {
    return {
      type: "MATCHING_INFORMATION",
      instructions: question.instructions || "",
      questionRange: question.questionRange || "",
      possibleAnswers: Array.isArray(question.possibleAnswers)
        ? question.possibleAnswers
        : [],
      questions: question.questions.map((item) => ({
        number: item.number || "",
        question: item.question || "",
      })),
    };
  }

  if (
    question.type === "SUMMARY_COMPLETION" &&
    Array.isArray(question.questions)
  ) {
    return {
      type: "SUMMARY_COMPLETION",
      instructions: question.instructions || "",
      questionRange: question.questionRange || "",
      summaryText: question.summaryText || "",
      questions: question.questions.map((item) => ({
        number: item.number || "",
        question: item.question || "",
      })),
    };
  }

  return {
    number: question.number || "",
    type: question.type || "FILL_BLANK",
    question: question.question || "",
  };
}

function sanitizeListeningQuestion(question = {}) {
  if (question.type === "MATCHING_INFORMATION") {
    return {
      type: "MATCHING_INFORMATION",
      title: question.title || "",
      activityType: question.activityType || "",
      questionRange: question.questionRange || "",
      instructions: question.instructions || "",
      possibleAnswers: Array.isArray(question.possibleAnswers)
        ? question.possibleAnswers
        : [],
      questions: Array.isArray(question.questions)
        ? question.questions.map((item) => ({
            id: item.id || "",
            number: item.number || "",
            question: item.question || "",
          }))
        : [],
    };
  }

  if (question.type === "MULTIPLE_CHOICE") {
    return {
      type: "MULTIPLE_CHOICE",
      title: question.title || "",
      questionRange: question.questionRange || "",
      instructions: question.instructions || "",
      sourceText: question.sourceText || "",
      questions: Array.isArray(question.questions)
        ? question.questions.map((item) => ({
            id: item.id || "",
            number: item.number || "",
            question: item.question || "",
            options: Array.isArray(item.options) ? item.options : [],
            selectionCount:
              Number(item.selectionCount) > 0
                ? Number(item.selectionCount)
                : Array.isArray(item.correctAnswers) && item.correctAnswers.length > 0
                  ? item.correctAnswers.length
                  : 1,
          }))
        : [],
    };
  }

  if (question.type === "TABLE") {
    return {
      type: "TABLE",
      title: question.title || "",
      questionRange: question.questionRange || "",
      instructions: question.instructions || "",
      question: question.question || "",
      table: {
        headers: Array.isArray(question.table?.headers)
          ? question.table.headers
          : [],
        rows: Array.isArray(question.table?.rows)
          ? question.table.rows.map((row) => ({
              cells: Array.isArray(row?.cells) ? row.cells : [],
              blankIndex: typeof row?.blankIndex === "number" ? row.blankIndex : -1,
              questionNumber: row?.questionNumber || "",
            }))
          : [],
      },
      questions: Array.isArray(question.questions)
        ? question.questions.map((item) => ({
            id: item.id || "",
            number: item.number || "",
            question: item.question || "",
            rowIndex: Number(item.rowIndex),
            cellIndex: Number(item.cellIndex),
            blankOrder: Number(item.blankOrder),
          }))
        : [],
    };
  }

  if (question.type === "TFNG") {
    return {
      type: "TFNG",
      title: question.title || "",
      questionRange: question.questionRange || "",
      instructions: question.instructions || "",
      questions: Array.isArray(question.questions)
        ? question.questions.map((item) => ({
            id: item.id || "",
            number: item.number || "",
            question: item.question || "",
            answerType: item.answerType || "TFNG",
          }))
        : [],
    };
  }

  return question;
}

function sanitizeReadingTest(snapshot) {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    type: "reading",
    name: data.name || "Reading Test",
    difficulty: data.difficulty || "Medium",
    createdAt: formatCreatedAtValue(data.createdAt || data.date || ""),
    sections: Array.isArray(data.sections)
      ? data.sections.map((section) => ({
          id: section.id || "",
          sectionNumber: section.sectionNumber || "",
          title: section.title || "",
          subtitle: section.subtitle || "",
          passage: section.passage || "",
          questions: Array.isArray(section.questions)
            ? section.questions.map(sanitizeReadingQuestion)
            : [],
        }))
      : [],
  };
}

function sanitizeListeningTest(snapshot) {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    type: "listening",
    name: data.name || "Listening Test",
    difficulty: data.difficulty || "Medium",
    createdAt: formatCreatedAtValue(data.createdAt || data.date || ""),
    sections: Array.isArray(data.sections)
      ? data.sections.map((section) => ({
          id: section.id || "",
          sectionNumber: section.sectionNumber || "",
          title: section.title || "",
          info: section.info || "",
          audioUrl: section.audioUrl || "",
          questions: Array.isArray(section.questions)
            ? section.questions.map(sanitizeListeningQuestion)
            : [],
        }))
      : [],
  };
}

function sanitizeWritingTest(snapshot) {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    type: "writing",
    name: data.name || "Writing Test",
    difficulty: data.difficulty || "Medium",
    createdAt: formatCreatedAtValue(data.createdAt || data.date || ""),
    task1: data.task1Prompt || "",
    task2: data.task2Prompt || "",
    task1ImageUrl: data.task1ImageUrl || "",
    sections: Array.isArray(data.sections)
      ? data.sections.map((section) => ({
          id: section.id || "",
          label: section.label || "",
          prompt: section.prompt || "",
          imageUrl: section.imageUrl || "",
          minimumWords: Number(section.minimumWords) || 0,
          recommendedMinutes: Number(section.recommendedMinutes) || 0,
        }))
      : [],
  };
}

function sanitizeSpeakingTest(snapshot) {
  const normalized = normalizeSpeakingTest(snapshot);

  return {
    ...normalized,
    createdAt: formatCreatedAtValue(normalized.createdAt),
  };
}

function sanitizeTestSnapshot(testType, snapshot) {
  if (testType === "reading") {
    return sanitizeReadingTest(snapshot);
  }

  if (testType === "listening") {
    return sanitizeListeningTest(snapshot);
  }

  if (testType === "writing") {
    return sanitizeWritingTest(snapshot);
  }

  if (testType === "speaking") {
    return sanitizeSpeakingTest(snapshot);
  }

  throw new Error("Unsupported test type.");
}

function buildStudentTestSummary(testType, snapshot) {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    type: testType,
    title: data.name || `${testType.charAt(0).toUpperCase()}${testType.slice(1)} Test`,
    difficulty: data.difficulty || "Medium",
    createdAt: formatCreatedAtValue(data.createdAt || data.date || ""),
  };
}

export async function listStudentTests(testType = "") {
  const supportedTypes = ["reading", "writing", "listening", "speaking"];

  if (testType) {
    if (!supportedTypes.includes(testType)) {
      throw new Error("Unsupported test type.");
    }

    const snapshot = await getDocs(collection(db, getTestCollectionName(testType)));

    return snapshot.docs
      .map((docSnapshot) => buildStudentTestSummary(testType, docSnapshot))
      .sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();

        return (Number.isNaN(rightTime) ? 0 : rightTime) -
          (Number.isNaN(leftTime) ? 0 : leftTime);
      });
  }

  const snapshots = await Promise.all(
    supportedTypes.map(async (type) => {
      const snapshot = await getDocs(collection(db, getTestCollectionName(type)));
      return snapshot.docs.map((docSnapshot) => buildStudentTestSummary(type, docSnapshot));
    })
  );

  return snapshots
    .flat()
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();

      return (Number.isNaN(rightTime) ? 0 : rightTime) -
        (Number.isNaN(leftTime) ? 0 : leftTime);
    });
}

export async function loadStudentTest({ testType, testId }) {
  const supportedTypes = ["reading", "writing", "listening", "speaking"];

  if (!supportedTypes.includes(testType)) {
    throw new Error("Unsupported test type.");
  }

  const snapshot = await getDoc(doc(db, getTestCollectionName(testType), testId));

  if (!snapshot.exists()) {
    throw new Error("Test not found.");
  }

  return sanitizeTestSnapshot(testType, snapshot);
}

function getResultTestId(data = {}) {
  return String(
    data.testId ||
    data.mockExamId ||
    data.examId ||
    data.referenceId ||
    ""
  );
}

function getResultTestType(data = {}) {
  return String(
    data.testType ||
    data.type ||
    data.examType ||
    ""
  ).toLowerCase();
}

function getResultBandScore(data = {}) {
  const scoreValue =
    data.bandScore ??
    data.overallBandScore ??
    data.score ??
    data.band;

  if (scoreValue === undefined || scoreValue === null || scoreValue === "") {
    return null;
  }

  const numericScore = Number(scoreValue);

  if (Number.isFinite(numericScore)) {
    return numericScore % 1 === 0 ? String(numericScore) : numericScore.toFixed(1);
  }

  return String(scoreValue);
}

function getResultTimestamp(data = {}) {
  return formatCreatedAtValue(
    data.updatedAt || data.completedAt || data.createdAt || ""
  );
}

export async function listStudentResults(userId) {
  if (!userId) {
    return {};
  }

  const resultsQuery = query(
    collection(db, "results"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(resultsQuery);

  return snapshot.docs.reduce((resultMap, resultSnapshot) => {
    const data = resultSnapshot.data();
    const testId = getResultTestId(data);
    const testType = getResultTestType(data);

    if (!testId || !testType) {
      return resultMap;
    }

    const resultKey = `${testType}:${testId}`;
    const nextTimestamp = new Date(getResultTimestamp(data)).getTime();
    const currentTimestamp = new Date(resultMap[resultKey]?.timestamp || "").getTime();

    if (
      resultMap[resultKey] &&
      !Number.isNaN(currentTimestamp) &&
      (Number.isNaN(nextTimestamp) || currentTimestamp > nextTimestamp)
    ) {
      return resultMap;
    }

    return {
      ...resultMap,
      [resultKey]: {
        completed: true,
        bandScore: getResultBandScore(data),
        timestamp: getResultTimestamp(data),
      },
    };
  }, {});
}

export async function recordStudentResult({
  userId,
  testId,
  testType,
  testName = "",
  bandScore,
  status = "completed",
  metadata = {},
}) {
  if (!userId || !testId || !testType) {
    throw new Error("A user id, test id, and test type are required.");
  }

  const normalizedBandScore =
    bandScore === undefined || bandScore === null || bandScore === ""
      ? null
      : Number(bandScore);

  await addDoc(collection(db, "results"), {
    userId,
    testId,
    testType: String(testType).toLowerCase(),
    testName: testName || "",
    status,
    bandScore: normalizedBandScore,
    overallBandScore: normalizedBandScore,
    completedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...metadata,
  });
}

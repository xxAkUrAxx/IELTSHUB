import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { getTestCollectionName } from "./test-conventions";

function buildTfngPrompt(sectionNumber) {
  return `Do the following statements agree with the information given in Reading Passage ${sectionNumber}?`;
}

function getAnswerTypeTitle(answerType) {
  return answerType === "YNNG"
    ? "Yes / No / Not Given"
    : "True / False / Not Given";
}

function buildTfngQuestionRange(items) {
  const numbers = items
    .map((item) => Number(item.questionNumber))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (numbers.length === 0) {
    return "";
  }

  if (numbers.length === 1) {
    return String(numbers[0]);
  }

  return `${numbers[0]}-${numbers[numbers.length - 1]}`;
}

function buildSectionQuestions(sectionNumber, questionGroups) {
  return questionGroups.flatMap((group) => {
    if (group.type !== "TFNG") {
      return [];
    }

    return [
      {
        id: group.id,
        type: "TFNG",
        title:
          group.title ||
          getAnswerTypeTitle(group.items?.[0]?.answerType || "TFNG"),
        questionRange: buildTfngQuestionRange(group.items || []),
        instructions: buildTfngPrompt(sectionNumber),
        questions: (group.items || []).map((item) => ({
          id: item.id,
          number: Number(item.questionNumber),
          question: item.prompt,
          answerType: item.answerType || "TFNG",
          correctAnswer: item.correctAnswer,
        })),
      },
    ];
  });
}

function buildAnswerKey(sections) {
  return sections.reduce((answerKey, section) => {
    const sectionAnswers = section.questions.flatMap((questionGroup) => {
      if (questionGroup.type !== "TFNG") {
        return [];
      }

      return questionGroup.questions.map((question) => [
        String(question.number),
        {
          type: "TFNG",
          answerType: question.answerType || "TFNG",
          correctAnswer: question.correctAnswer,
          sectionNumber: section.sectionNumber,
        },
      ]);
    });

    return {
      ...answerKey,
      ...Object.fromEntries(sectionAnswers),
    };
  }, {});
}

function buildReadingSections(formValues) {
  return [1, 2, 3].map((sectionNumber) => {
    const questionsField = `section${sectionNumber}Questions`;
    const sectionQuestionGroups = Array.isArray(formValues[questionsField])
      ? formValues[questionsField]
      : [];

    return {
      id: `section-${sectionNumber}`,
      sectionNumber,
      title: `Reading Passage ${sectionNumber}`,
      passage: formValues[`section${sectionNumber}Text`] || "",
      questions: buildSectionQuestions(sectionNumber, sectionQuestionGroups),
    };
  });
}

export function normalizeReadingTest(snapshot) {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: data.name || "Reading Test",
    difficulty: data.difficulty || "Medium",
    createdAt: data.createdAt || data.date || "",
    updatedAt: data.updatedAt || "",
    type: data.type || "reading",
    date: data.date || "",
    sections: Array.isArray(data.sections) ? data.sections : [],
    answerKey: data.answerKey || {},
  };
}

export async function listReadingTests() {
  const snapshot = await getDocs(collection(db, getTestCollectionName("reading")));

  return snapshot.docs
    .map(normalizeReadingTest)
    .sort((left, right) => {
      const leftTime = new Date(
        typeof left.createdAt?.toDate === "function"
          ? left.createdAt.toDate()
          : left.createdAt
      ).getTime();
      const rightTime = new Date(
        typeof right.createdAt?.toDate === "function"
          ? right.createdAt.toDate()
          : right.createdAt
      ).getTime();

      return (Number.isNaN(rightTime) ? 0 : rightTime) -
        (Number.isNaN(leftTime) ? 0 : leftTime);
    });
}

export async function saveReadingTest({
  editingTestId,
  formValues,
  difficultyLabel,
}) {
  const readingTestsCollection = collection(db, getTestCollectionName("reading"));
  const readingTestDocRef = editingTestId
    ? doc(db, getTestCollectionName("reading"), editingTestId)
    : doc(readingTestsCollection);

  const sections = buildReadingSections(formValues);
  const answerKey = buildAnswerKey(sections);
  const nextTest = {
    id: readingTestDocRef.id,
    type: "reading",
    name: formValues.testName.trim(),
    difficulty: difficultyLabel,
    date: formValues.date,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    sections,
    answerKey,
  };

  await setDoc(readingTestDocRef, nextTest);

  return {
    notice: "Reading test saved.",
    savedTest: {
      ...nextTest,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function deleteReadingTest(test) {
  if (!test?.id) {
    throw new Error("A reading test id is required.");
  }

  await deleteDoc(doc(db, getTestCollectionName("reading"), test.id));
}

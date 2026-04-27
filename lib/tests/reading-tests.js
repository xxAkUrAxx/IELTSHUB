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

function getMatchingActivityTitle(activityType) {
  return activityType === "MATCH_PARAGRAPHS_TO_INFO"
    ? "Match paragraphs to info"
    : "Match info to paragraphs";
}

function buildSummaryCompletionPrompt(sectionNumber) {
  return `Complete the summary below. Choose the correct word or phrase from Reading Passage ${sectionNumber}.`;
}

function buildMultipleChoicePrompt(sectionNumber) {
  return `Choose the correct letter, A-D, for each question from Reading Passage ${sectionNumber}.`;
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
      if (group.type === "MATCHING_INFORMATION") {
        return [
          {
            id: group.id,
            type: "MATCHING_INFORMATION",
            title:
              group.title ||
              getMatchingActivityTitle(group.activityType || "MATCH_INFO_TO_PARAGRAPHS"),
            activityType: group.activityType || "MATCH_INFO_TO_PARAGRAPHS",
            possibleAnswers: Array.isArray(group.possibleAnswers)
              ? group.possibleAnswers
              : [],
            questionRange: buildTfngQuestionRange(group.items || []),
            instructions:
              group.instructions ||
              `Look at the following statements (Questions ${buildTfngQuestionRange(
                group.items || []
              )}) and match them to the correct paragraph.`,
            questions: (group.items || []).map((item) => ({
              id: item.id,
              number: Number(item.questionNumber),
              question: item.prompt,
              correctAnswer: item.correctAnswer,
            })),
          },
        ];
      }

      if (group.type === "SUMMARY_COMPLETION") {
        return [
          {
            id: group.id,
            type: "SUMMARY_COMPLETION",
            title: group.title || "Summary Completion",
            questionRange: buildTfngQuestionRange(group.items || []),
            instructions:
              group.instructions || buildSummaryCompletionPrompt(sectionNumber),
            summaryText: group.summaryText || "",
            questions: (group.items || []).map((item) => ({
              id: item.id,
              number: Number(item.questionNumber),
              question: group.summaryText || "",
              correctAnswer: item.correctAnswer,
              caseSensitive: true,
            })),
          },
        ];
      }

      if (group.type === "MULTIPLE_CHOICE") {
        return [
          {
            id: group.id,
            type: "MULTIPLE_CHOICE",
            title: group.title || "Multiple Choice",
            questionRange: buildTfngQuestionRange(group.items || []),
            instructions:
              group.instructions || buildMultipleChoicePrompt(sectionNumber),
            sourceText: group.sourceText || "",
            questions: (group.items || []).map((item) => ({
              id: item.id,
              number: Number(item.questionNumber),
              question: item.prompt,
              options: Array.isArray(item.options) ? item.options : [],
              correctAnswer: item.correctAnswer,
            })),
          },
        ];
      }

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
        if (questionGroup.type === "MATCHING_INFORMATION") {
          return questionGroup.questions.map((question) => [
            String(question.number),
            {
              type: "MATCHING_INFORMATION",
              activityType: questionGroup.activityType || "MATCH_INFO_TO_PARAGRAPHS",
              correctAnswer: question.correctAnswer,
              sectionNumber: section.sectionNumber,
            },
          ]);
        }

        if (questionGroup.type === "SUMMARY_COMPLETION") {
          return questionGroup.questions.map((question) => [
            String(question.number),
            {
              type: "SUMMARY_COMPLETION",
              correctAnswer: question.correctAnswer,
              caseSensitive: true,
              sectionNumber: section.sectionNumber,
            },
          ]);
        }

        if (questionGroup.type === "MULTIPLE_CHOICE") {
          return questionGroup.questions.map((question) => [
            String(question.number),
            {
              type: "MULTIPLE_CHOICE",
              correctAnswer: question.correctAnswer,
              sectionNumber: section.sectionNumber,
            },
          ]);
        }

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
      title:
        String(formValues[`section${sectionNumber}Title`] || "").trim() ||
        `Reading Passage ${sectionNumber}`,
      subtitle: String(formValues[`section${sectionNumber}Subtitle`] || "").trim(),
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

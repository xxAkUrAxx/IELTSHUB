import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { db, storage } from "../firebase/config";
import {
  buildAcceptedAnswerPayload,
  buildMultipleChoiceAnswerPayload,
} from "./answer-utils";
import { buildTestAssetPath, getTestCollectionName } from "./test-conventions";

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

function buildMultipleChoicePrompt(sectionNumber) {
  return `Choose the correct letter, A-D, for each question in Listening Part ${sectionNumber}.`;
}

function buildTableCompletionPrompt(sectionNumber) {
  return `Complete the table below for Listening Part ${sectionNumber}.`;
}

function buildSectionQuestions(sectionNumber, questionGroups) {
  return questionGroups.flatMap((group) => {
    if (group.type === "MATCHING_INFORMATION") {
      return [
        {
          id: group.id,
          type: "MATCHING_INFORMATION",
          title: group.title || "All Matching Activities",
          activityType: group.activityType || "MATCH_INFO_TO_OPTIONS",
          possibleAnswers: Array.isArray(group.possibleAnswers)
            ? group.possibleAnswers
            : [],
          questionRange: buildTfngQuestionRange(group.items || []),
          instructions:
            group.instructions ||
            `Match each statement to the correct option for Listening Part ${sectionNumber}.`,
          questions: (group.items || []).map((item) => ({
            ...buildAcceptedAnswerPayload(item.correctAnswer),
            id: item.id,
            number: Number(item.questionNumber),
            question: item.prompt,
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
            ...buildMultipleChoiceAnswerPayload(
              item.correctAnswers || item.correctAnswer
            ),
            id: item.id,
            number: Number(item.questionNumber),
            question: item.prompt,
            options: Array.isArray(item.options) ? item.options : [],
          })),
        },
      ];
    }

    if (group.type === "TABLE") {
      return [
        {
          id: group.id,
          type: "TABLE",
          title: group.title || "Table Completion",
          questionRange: buildTfngQuestionRange(group.items || []),
          instructions:
            group.instructions || buildTableCompletionPrompt(sectionNumber),
          question: "",
          table: {
            headers: Array.isArray(group.tableHeaders)
              ? group.tableHeaders
              : ["", ""],
            rows: (group.tableRows || []).map((row) => {
              const cells = Array.isArray(row?.cells) ? row.cells : [""];
              const firstBlankIndex = cells.findIndex((cell) =>
                /(\d+)\s*\.{5,}/.test(String(cell || ""))
              );
              const firstBlankQuestionNumber =
                String(cells[firstBlankIndex] || "").match(/(\d+)\s*\.{5,}/)?.[1] ||
                "";

              return {
                cells,
                blankIndex: firstBlankIndex,
                questionNumber: firstBlankQuestionNumber,
              };
            }),
          },
          questions: (group.items || []).map((item) => ({
            ...buildAcceptedAnswerPayload(item.correctAnswer),
            id: item.id,
            number: Number(item.questionNumber),
            question: item.prompt || "",
            rowIndex: Number(item.rowIndex),
            cellIndex: Number(item.cellIndex),
            blankOrder: Number(item.blankOrder),
          })),
        },
      ];
    }

    if (group.type === "TFNG") {
      return [
        {
          id: group.id,
          type: "TFNG",
          title:
            group.title ||
            getAnswerTypeTitle(group.items?.[0]?.answerType || "TFNG"),
          questionRange: buildTfngQuestionRange(group.items || []),
          instructions:
            group.items?.[0]?.answerType === "YNNG"
              ? `Choose YES, NO, or NOT GIVEN for each question in Listening Part ${sectionNumber}.`
              : `Choose TRUE, FALSE, or NOT GIVEN for each question in Listening Part ${sectionNumber}.`,
          questions: (group.items || []).map((item) => ({
            ...buildAcceptedAnswerPayload(item.correctAnswer),
            id: item.id,
            number: Number(item.questionNumber),
            question: item.prompt,
            answerType: item.answerType || "TFNG",
          })),
        },
      ];
    }

    return [];
  });
}

function buildAnswerKey(sections) {
  return sections.reduce((answerKey, section) => {
    const sectionAnswers = section.questions.flatMap((questionGroup) => {
      if (questionGroup.type === "MATCHING_INFORMATION") {
        return questionGroup.questions.map((question) => [
          String(question.number),
          {
            type: "MATCHING_INFORMATION",
            activityType: questionGroup.activityType || "MATCH_INFO_TO_OPTIONS",
            ...buildAcceptedAnswerPayload(question.correctAnswer),
            sectionNumber: section.sectionNumber,
          },
        ]);
      }

      if (questionGroup.type === "MULTIPLE_CHOICE") {
        return questionGroup.questions.map((question) => [
          String(question.number),
          {
            type: "MULTIPLE_CHOICE",
            ...buildMultipleChoiceAnswerPayload(
              question.correctAnswers || question.correctAnswer
            ),
            sectionNumber: section.sectionNumber,
          },
        ]);
      }

      if (questionGroup.type === "TABLE") {
        return questionGroup.questions.map((question) => [
          String(question.number),
          {
            type: "TABLE",
            ...buildAcceptedAnswerPayload(question.correctAnswer),
            sectionNumber: section.sectionNumber,
          },
        ]);
      }

      if (questionGroup.type === "TFNG") {
        return questionGroup.questions.map((question) => [
          String(question.number),
          {
            type: "TFNG",
            answerType: question.answerType || "TFNG",
            ...buildAcceptedAnswerPayload(question.correctAnswer),
            sectionNumber: section.sectionNumber,
          },
        ]);
      }

      return [];
    });

    return {
      ...answerKey,
      ...Object.fromEntries(sectionAnswers),
    };
  }, {});
}

function buildListeningSections(formValues, audioAssetsBySection) {
  return [1, 2, 3, 4].map((sectionNumber) => {
    const questionsField = `part${sectionNumber}Questions`;
    const sectionQuestionGroups = Array.isArray(formValues[questionsField])
      ? formValues[questionsField]
      : [];
    const audioAsset = audioAssetsBySection[sectionNumber] || {};

    return {
      id: `section-${sectionNumber}`,
      sectionNumber,
      title:
        String(formValues[`part${sectionNumber}Title`] || "").trim() ||
        `Listening Part ${sectionNumber}`,
      info: String(formValues[`part${sectionNumber}Info`] || "").trim(),
      audioUrl: audioAsset.audioUrl || "",
      audioPath: audioAsset.audioPath || "",
      questions: buildSectionQuestions(sectionNumber, sectionQuestionGroups),
    };
  });
}

export function normalizeListeningTest(snapshot) {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: data.name || "Listening Test",
    difficulty: data.difficulty || "Medium",
    createdAt: data.createdAt || data.date || "",
    updatedAt: data.updatedAt || "",
    type: data.type || "listening",
    date: data.date || "",
    sections: Array.isArray(data.sections) ? data.sections : [],
    answerKey: data.answerKey || {},
  };
}

async function withTimeout(promise, timeoutMs, message) {
  let timerId;

  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timerId);
  }
}

function uploadFileResumable(storageRef, file, onProgress) {
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = snapshot.totalBytes
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;

        if (typeof onProgress === "function") {
          onProgress(progress);
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

export async function listListeningTests() {
  const snapshot = await getDocs(collection(db, getTestCollectionName("listening")));

  return snapshot.docs
    .map(normalizeListeningTest)
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

export async function saveListeningTest({
  editingTestId,
  formValues,
  difficultyLabel,
  selectedAudioFilesBySection,
  existingAudioAssetsBySection,
  onUploadProgress,
}) {
  const listeningTestsCollection = collection(
    db,
    getTestCollectionName("listening")
  );
  const listeningTestDocRef = editingTestId
    ? doc(db, getTestCollectionName("listening"), editingTestId)
    : doc(listeningTestsCollection);

  const audioAssetsBySection = { 1: {}, 2: {}, 3: {}, 4: {} };

  [1, 2, 3, 4].forEach((sectionNumber) => {
    const selectedAudioFile = selectedAudioFilesBySection?.[sectionNumber] || null;
    const existingAudio = existingAudioAssetsBySection?.[sectionNumber] || {};
    const audioPath = selectedAudioFile
      ? buildTestAssetPath({
          testType: "listening",
          testId: listeningTestDocRef.id,
          assetGroup: `part-${sectionNumber}`,
          fileName: selectedAudioFile.name,
        })
      : existingAudio.audioPath || "";

    audioAssetsBySection[sectionNumber] = {
      audioUrl: selectedAudioFile ? "" : existingAudio.audioUrl || "",
      audioPath,
    };
  });

  const sections = buildListeningSections(formValues, audioAssetsBySection);
  const answerKey = buildAnswerKey(sections);
  const nextTest = {
    id: listeningTestDocRef.id,
    type: "listening",
    name: formValues.testName.trim(),
    difficulty: difficultyLabel,
    date: formValues.date,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    sections,
    answerKey,
  };

  await setDoc(listeningTestDocRef, nextTest);

  let notice = "Listening test saved.";
  const resolvedAudioAssetsBySection = { ...audioAssetsBySection };

  for (const sectionNumber of [1, 2, 3, 4]) {
    const selectedAudioFile = selectedAudioFilesBySection?.[sectionNumber] || null;
    const audioPath = audioAssetsBySection[sectionNumber]?.audioPath || "";

    if (!selectedAudioFile || !audioPath) {
      continue;
    }

    try {
      const audioRef = ref(storage, audioPath);
      const resolvedAudioUrl = await withTimeout(
        uploadFileResumable(audioRef, selectedAudioFile, (progress) => {
          if (typeof onUploadProgress === "function") {
            onUploadProgress(sectionNumber, progress);
          }
        }),
        180000,
        `Uploading audio for Part ${sectionNumber} timed out.`
      );

      resolvedAudioAssetsBySection[sectionNumber] = {
        audioUrl: resolvedAudioUrl,
        audioPath,
      };
    } catch (uploadError) {
      console.error(
        `[Listening Tests] Audio upload failed for Part ${sectionNumber}:`,
        uploadError
      );
      notice = "The listening test was saved, but one or more audio uploads did not complete.";
    }
  }

  const resolvedSections = buildListeningSections(
    formValues,
    resolvedAudioAssetsBySection
  );

  await updateDoc(listeningTestDocRef, {
    sections: resolvedSections,
    answerKey: buildAnswerKey(resolvedSections),
    updatedAt: serverTimestamp(),
  });

  return {
    notice,
    savedTest: {
      ...nextTest,
      createdAt: new Date().toISOString(),
      sections: resolvedSections,
      answerKey: buildAnswerKey(resolvedSections),
    },
  };
}

export async function deleteListeningTest(test) {
  if (!test?.id) {
    throw new Error("A listening test id is required.");
  }

  await deleteDoc(doc(db, getTestCollectionName("listening"), test.id));

  const audioPaths = (Array.isArray(test.sections) ? test.sections : [])
    .map((section) => section?.audioPath || "")
    .filter(Boolean);

  await Promise.all(
    audioPaths.map(async (audioPath) => {
      try {
        await deleteObject(ref(storage, audioPath));
      } catch (error) {
        console.error("[Listening Tests] Failed to delete audio file:", error);
      }
    })
  );
}

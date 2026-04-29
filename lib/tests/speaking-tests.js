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

function normalizeQuestionList(questions = [], minimumLength = 4) {
  const normalizedQuestions = Array.isArray(questions)
    ? questions.map((question) => String(question || ""))
    : [];

  while (normalizedQuestions.length < minimumLength) {
    normalizedQuestions.push("");
  }

  return normalizedQuestions.slice(0, minimumLength);
}

function normalizeTopicList(topics = []) {
  const normalizedTopics = Array.isArray(topics)
    ? topics.map((topic, index) => ({
        id: topic?.id || `topic-${index + 1}`,
        title: String(topic?.title || ""),
        questions: normalizeQuestionList(topic?.questions, 4),
      }))
    : [];

  while (normalizedTopics.length < 12) {
    const topicIndex = normalizedTopics.length + 1;
    normalizedTopics.push({
      id: `topic-${topicIndex}`,
      title: "",
      questions: normalizeQuestionList([], 4),
    });
  }

  return normalizedTopics.slice(0, 12);
}

function createPart2Topic(index) {
  return {
    id: `part2-topic-${index + 1}`,
    topicTitle: "",
    cueCard: "",
    followUpQuestions: normalizeQuestionList([], 4),
  };
}

function normalizePart2TopicList(topics = [], fallbackPart2 = {}) {
  const normalizedTopics = Array.isArray(topics)
    ? topics.map((topic, index) => ({
        id: topic?.id || `part2-topic-${index + 1}`,
        topicTitle: String(topic?.topicTitle || topic?.title || ""),
        cueCard: String(topic?.cueCard || ""),
        followUpQuestions: normalizeQuestionList(topic?.followUpQuestions, 4),
      }))
    : [];

  if (normalizedTopics.length === 0) {
    normalizedTopics.push({
      id: fallbackPart2.id || "part2-topic-1",
      topicTitle: String(
        fallbackPart2.topicTitle || fallbackPart2.title || ""
      ),
      cueCard: String(fallbackPart2.cueCard || ""),
      followUpQuestions: normalizeQuestionList(
        fallbackPart2.followUpQuestions,
        4
      ),
    });
  }

  return normalizedTopics;
}

function buildSpeakingSections({
  part1Set1Title,
  part1Set1Questions,
  part1Set2aTitle,
  part1Set2aQuestions,
  part1Set2bTitle,
  part1Set2bQuestions,
  part1Topics,
  part2Topics,
}) {
  return [
    {
      id: "part-1",
      label: "Speaking Part 1",
      setDurationSeconds: 120,
      followUpDurationSeconds: 300,
      set1: {
        label: "Set 1",
        title: part1Set1Title,
        questions: part1Set1Questions,
      },
      set2: [
        {
          key: "set2a",
          label: "Set 2A",
          title: part1Set2aTitle,
          questions: part1Set2aQuestions,
        },
        {
          key: "set2b",
          label: "Set 2B",
          title: part1Set2bTitle,
          questions: part1Set2bQuestions,
        },
      ],
      topics: part1Topics,
      randomTopicCount: 2,
    },
    {
      id: "part-2",
      label: "Speaking Part 2",
      preparationSeconds: 60,
      speakingSeconds: 120,
      topics: part2Topics,
    },
  ];
}

export function normalizeSpeakingTest(snapshot) {
  const data = snapshot.data();
  const part1 = data.part1 || {};
  const part2 = data.part2 || {};
  const set1 = part1.set1 || {};
  const set2a =
    part1.set2a ||
    (Array.isArray(part1.set2)
      ? part1.set2.find((set) => set?.key === "set2a")
      : null) ||
    {};
  const set2b =
    part1.set2b ||
    (Array.isArray(part1.set2)
      ? part1.set2.find((set) => set?.key === "set2b")
      : null) ||
    {};
  const normalizedPart2Topics = normalizePart2TopicList(
    data.part2Topics || part2.topics,
    {
      id: "part2-topic-1",
      topicTitle: data.part2TopicTitle || part2.topicTitle || "",
      cueCard: data.part2CueCard || part2.cueCard || "",
      followUpQuestions: data.part3Questions || part2.followUpQuestions || [],
    }
  );
  const firstPart2Topic = normalizedPart2Topics[0] || createPart2Topic(0);

  return {
    id: snapshot.id,
    name: data.name || "Speaking Test",
    difficulty: data.difficulty || "Medium",
    createdAt: data.createdAt || data.date || "",
    type: data.type || "speaking",
    date: data.date || "",
    part1Set1Title: data.part1Set1Title || set1.title || "",
    part1Set1Questions: normalizeQuestionList(
      data.part1Set1Questions || set1.questions,
      4
    ),
    part1Set2aTitle: data.part1Set2aTitle || set2a.title || "",
    part1Set2aQuestions: normalizeQuestionList(
      data.part1Set2aQuestions || set2a.questions,
      4
    ),
    part1Set2bTitle: data.part1Set2bTitle || set2b.title || "",
    part1Set2bQuestions: normalizeQuestionList(
      data.part1Set2bQuestions || set2b.questions,
      4
    ),
    part1Topics: normalizeTopicList(data.part1Topics || part1.topics),
    part2TopicTitle: firstPart2Topic.topicTitle,
    part2CueCard: firstPart2Topic.cueCard,
    part3Questions: firstPart2Topic.followUpQuestions,
    part2Topics: normalizedPart2Topics,
    part1: {
      set1: {
        label: "Set 1",
        title: data.part1Set1Title || set1.title || "",
        questions: normalizeQuestionList(
          data.part1Set1Questions || set1.questions,
          4
        ),
      },
      set2a: {
        key: "set2a",
        label: "Set 2A",
        title: data.part1Set2aTitle || set2a.title || "",
        questions: normalizeQuestionList(
          data.part1Set2aQuestions || set2a.questions,
          4
        ),
      },
      set2b: {
        key: "set2b",
        label: "Set 2B",
        title: data.part1Set2bTitle || set2b.title || "",
        questions: normalizeQuestionList(
          data.part1Set2bQuestions || set2b.questions,
          4
        ),
      },
      topics: normalizeTopicList(data.part1Topics || part1.topics),
      randomTopicCount: Number(part1.randomTopicCount) > 0
        ? Number(part1.randomTopicCount)
        : 2,
      setDurationSeconds: Number(part1.setDurationSeconds) > 0
        ? Number(part1.setDurationSeconds)
        : 120,
      followUpDurationSeconds: Number(part1.followUpDurationSeconds) > 0
        ? Number(part1.followUpDurationSeconds)
        : 300,
    },
    part2: {
      topicTitle: firstPart2Topic.topicTitle,
      cueCard: firstPart2Topic.cueCard,
      followUpQuestions: firstPart2Topic.followUpQuestions,
      topics: normalizedPart2Topics,
      preparationSeconds: Number(part2.preparationSeconds) > 0
        ? Number(part2.preparationSeconds)
        : 60,
      speakingSeconds: Number(part2.speakingSeconds) > 0
        ? Number(part2.speakingSeconds)
        : 120,
    },
    sections: Array.isArray(data.sections)
      ? data.sections
      : buildSpeakingSections({
          part1Set1Title: data.part1Set1Title || set1.title || "",
          part1Set1Questions: normalizeQuestionList(
            data.part1Set1Questions || set1.questions,
            4
          ),
          part1Set2aTitle: data.part1Set2aTitle || set2a.title || "",
          part1Set2aQuestions: normalizeQuestionList(
            data.part1Set2aQuestions || set2a.questions,
            4
          ),
          part1Set2bTitle: data.part1Set2bTitle || set2b.title || "",
          part1Set2bQuestions: normalizeQuestionList(
            data.part1Set2bQuestions || set2b.questions,
            4
          ),
          part1Topics: normalizeTopicList(data.part1Topics || part1.topics),
          part2Topics: normalizedPart2Topics,
        }),
  };
}

export async function listSpeakingTests() {
  const snapshot = await getDocs(collection(db, getTestCollectionName("speaking")));

  return snapshot.docs
    .map(normalizeSpeakingTest)
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

export async function saveSpeakingTest({
  editingTestId,
  formValues,
  difficultyLabel,
}) {
  const speakingTestsCollection = collection(db, getTestCollectionName("speaking"));
  const speakingTestDocRef = editingTestId
    ? doc(db, getTestCollectionName("speaking"), editingTestId)
    : doc(speakingTestsCollection);

  const normalizedTopics = normalizeTopicList(formValues.part1Topics);
  const normalizedSet1Questions = normalizeQuestionList(formValues.part1Set1Questions, 4);
  const normalizedSet2aQuestions = normalizeQuestionList(formValues.part1Set2aQuestions, 4);
  const normalizedSet2bQuestions = normalizeQuestionList(formValues.part1Set2bQuestions, 4);
  const normalizedPart2Topics = normalizePart2TopicList(formValues.part2Topics);
  const firstPart2Topic = normalizedPart2Topics[0] || createPart2Topic(0);

  const nextTest = {
    id: speakingTestDocRef.id,
    type: "speaking",
    name: formValues.testName.trim(),
    difficulty: difficultyLabel,
    date: formValues.date,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    part1Set1Title: formValues.part1Set1Title.trim(),
    part1Set1Questions: normalizedSet1Questions.map((question) => question.trim()),
    part1Set2aTitle: formValues.part1Set2aTitle.trim(),
    part1Set2aQuestions: normalizedSet2aQuestions.map((question) => question.trim()),
    part1Set2bTitle: formValues.part1Set2bTitle.trim(),
    part1Set2bQuestions: normalizedSet2bQuestions.map((question) => question.trim()),
    part1Topics: normalizedTopics.map((topic) => ({
      id: topic.id,
      title: topic.title.trim(),
      questions: topic.questions.map((question) => question.trim()),
    })),
    part2TopicTitle: firstPart2Topic.topicTitle.trim(),
    part2CueCard: firstPart2Topic.cueCard,
    part3Questions: firstPart2Topic.followUpQuestions.map((question) =>
      question.trim()
    ),
    part2Topics: normalizedPart2Topics.map((topic) => ({
      id: topic.id,
      topicTitle: topic.topicTitle.trim(),
      cueCard: topic.cueCard,
      followUpQuestions: topic.followUpQuestions.map((question) =>
        question.trim()
      ),
    })),
    part1: {
      set1: {
        label: "Set 1",
        title: formValues.part1Set1Title.trim(),
        questions: normalizedSet1Questions.map((question) => question.trim()),
      },
      set2a: {
        key: "set2a",
        label: "Set 2A",
        title: formValues.part1Set2aTitle.trim(),
        questions: normalizedSet2aQuestions.map((question) => question.trim()),
      },
      set2b: {
        key: "set2b",
        label: "Set 2B",
        title: formValues.part1Set2bTitle.trim(),
        questions: normalizedSet2bQuestions.map((question) => question.trim()),
      },
      topics: normalizedTopics.map((topic) => ({
        id: topic.id,
        title: topic.title.trim(),
        questions: topic.questions.map((question) => question.trim()),
      })),
      randomTopicCount: 2,
      setDurationSeconds: 120,
      followUpDurationSeconds: 300,
    },
    part2: {
      topicTitle: firstPart2Topic.topicTitle.trim(),
      cueCard: firstPart2Topic.cueCard,
      followUpQuestions: firstPart2Topic.followUpQuestions.map((question) =>
        question.trim()
      ),
      topics: normalizedPart2Topics.map((topic) => ({
        id: topic.id,
        topicTitle: topic.topicTitle.trim(),
        cueCard: topic.cueCard,
        followUpQuestions: topic.followUpQuestions.map((question) =>
          question.trim()
        ),
      })),
      preparationSeconds: 60,
      speakingSeconds: 120,
    },
    sections: buildSpeakingSections({
      part1Set1Title: formValues.part1Set1Title.trim(),
      part1Set1Questions: normalizedSet1Questions.map((question) => question.trim()),
      part1Set2aTitle: formValues.part1Set2aTitle.trim(),
      part1Set2aQuestions: normalizedSet2aQuestions.map((question) => question.trim()),
      part1Set2bTitle: formValues.part1Set2bTitle.trim(),
      part1Set2bQuestions: normalizedSet2bQuestions.map((question) => question.trim()),
      part1Topics: normalizedTopics.map((topic) => ({
        id: topic.id,
        title: topic.title.trim(),
        questions: topic.questions.map((question) => question.trim()),
      })),
      part2Topics: normalizedPart2Topics.map((topic) => ({
        id: topic.id,
        topicTitle: topic.topicTitle.trim(),
        cueCard: topic.cueCard,
        followUpQuestions: topic.followUpQuestions.map((question) =>
          question.trim()
        ),
      })),
    }),
  };

  await setDoc(speakingTestDocRef, nextTest);

  return {
    notice: "Test saved.",
    savedTest: {
      ...nextTest,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function deleteSpeakingTest(test) {
  if (!test?.id) {
    throw new Error("A speaking test id is required.");
  }

  await deleteDoc(doc(db, getTestCollectionName("speaking"), test.id));
}

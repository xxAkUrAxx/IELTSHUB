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
import { buildTestAssetPath, getTestCollectionName } from "./test-conventions";

export function normalizeWritingTest(snapshot) {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: data.name || "Writing Test",
    difficulty: data.difficulty || "Medium",
    createdAt: data.createdAt || data.date || "",
    type: data.type || "writing",
    date: data.date || "",
    task1Prompt: data.task1Prompt || "",
    task2Prompt: data.task2Prompt || "",
    task1ImageUrl: data.task1ImageUrl || "",
    task1ImagePath: data.task1ImagePath || "",
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

function buildWritingSections({ part1Prompt, part2Prompt, task1ImageUrl, task1ImagePath }) {
  return [
    {
      id: "task-1",
      label: "Writing Task 1",
      prompt: part1Prompt,
      imageUrl: task1ImageUrl,
      imagePath: task1ImagePath,
      minimumWords: 150,
      recommendedMinutes: 20,
    },
    {
      id: "task-2",
      label: "Writing Task 2",
      prompt: part2Prompt,
      minimumWords: 250,
      recommendedMinutes: 40,
    },
  ];
}

export async function listWritingTests() {
  const snapshot = await getDocs(collection(db, getTestCollectionName("writing")));

  return snapshot.docs
    .map(normalizeWritingTest)
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

export async function saveWritingTest({
  editingTestId,
  formValues,
  difficultyLabel,
  selectedImageFile,
  existingImageUrl,
  existingImagePath,
  onUploadProgress,
}) {
  const writingTestsCollection = collection(db, getTestCollectionName("writing"));
  const writingTestDocRef = editingTestId
    ? doc(db, getTestCollectionName("writing"), editingTestId)
    : doc(writingTestsCollection);

  let task1ImagePath =
    !selectedImageFile && existingImageUrl ? existingImagePath || "" : "";

  if (selectedImageFile) {
    task1ImagePath = buildTestAssetPath({
      testType: "writing",
      testId: writingTestDocRef.id,
      assetGroup: "task1",
      fileName: selectedImageFile.name,
    });
  }

  const nextTest = {
    id: writingTestDocRef.id,
    type: "writing",
    name: formValues.testName.trim(),
    difficulty: difficultyLabel,
    date: formValues.date,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    task1Prompt: formValues.part1Prompt,
    task1ImageUrl: !selectedImageFile && existingImageUrl ? existingImageUrl : "",
    task1ImagePath,
    task2Prompt: formValues.part2Prompt,
    sections: buildWritingSections({
      part1Prompt: formValues.part1Prompt,
      part2Prompt: formValues.part2Prompt,
      task1ImageUrl: !selectedImageFile && existingImageUrl ? existingImageUrl : "",
      task1ImagePath,
    }),
  };

  await setDoc(writingTestDocRef, nextTest);

  let resolvedTask1ImageUrl = "";
  let notice = "Test saved.";

  if (selectedImageFile && task1ImagePath) {
    try {
      const imageRef = ref(storage, task1ImagePath);

      resolvedTask1ImageUrl = await withTimeout(
        uploadFileResumable(imageRef, selectedImageFile, onUploadProgress),
        180000,
        "Image upload timed out."
      );

      if (typeof onUploadProgress === "function") {
        onUploadProgress(100);
      }

      await updateDoc(writingTestDocRef, {
        task1ImageUrl: resolvedTask1ImageUrl,
        updatedAt: serverTimestamp(),
        sections: buildWritingSections({
          part1Prompt: formValues.part1Prompt,
          part2Prompt: formValues.part2Prompt,
          task1ImageUrl: resolvedTask1ImageUrl,
          task1ImagePath,
        }),
      });
    } catch (uploadError) {
      console.error("[Writing Tests] Task 1 image upload failed:", uploadError);
      notice = "The test was saved, but the image upload did not complete.";
    }
  }

  return {
    notice,
    savedTest: {
      ...nextTest,
      createdAt: new Date().toISOString(),
      task1ImageUrl: resolvedTask1ImageUrl || existingImageUrl || "",
    },
  };
}

export async function deleteWritingTest(test) {
  if (!test?.id) {
    throw new Error("A writing test id is required.");
  }

  await deleteDoc(doc(db, getTestCollectionName("writing"), test.id));

  if (test.task1ImagePath) {
    try {
      await deleteObject(ref(storage, test.task1ImagePath));
    } catch (error) {
      console.error("[Writing Tests] Failed to delete Task 1 image:", error);
    }
  }
}

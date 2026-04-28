"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  deleteWritingTest,
  listWritingTests,
  saveWritingTest,
} from "../../../../lib/tests/writing-tests";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function revokePreviewUrl(url) {
  if (typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
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

function formatCreatedAt(createdAt) {
  if (!createdAt) {
    return "Unknown date";
  }

  if (typeof createdAt.toDate === "function") {
    return createdAt.toDate().toLocaleDateString();
  }

  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date";
  }

  return parsedDate.toLocaleDateString();
}

function getDifficultyTextColor(difficulty) {
  const normalizedDifficulty = String(difficulty).toLowerCase();

  if (normalizedDifficulty === "easy") {
    return "#4CCD99";
  }

  if (normalizedDifficulty === "hard") {
    return "#AE2448";
  }

  return "#FFC700";
}

const difficultyOptions = [
  { value: "easy", label: "Easy", color: "#4CCD99" },
  { value: "medium", label: "Medium", color: "#FFC700" },
  { value: "hard", label: "Hard", color: "#AE2448" },
];

function CreatorActionButton({ onClick, children }) {
  return (
    <button
      type="button"
      className="btn gap-2 border-0 font-bold text-white"
      style={{ backgroundColor: "#007F73", color: "#ffffff" }}
      onClick={onClick}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor = "#00695f";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = "#007F73";
      }}
    >
      {children}
    </button>
  );
}

function WritingTestCard({ test, onDelete, onEdit }) {
  return (
    <article className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              {test.name}
            </h2>
            <div
              className="badge badge-outline"
              style={{ color: getDifficultyTextColor(test.difficulty) }}
            >
              {test.difficulty}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square text-error hover:bg-error/10 hover:text-error"
            aria-label={`Delete ${test.name}`}
            onClick={() => onDelete(test)}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-base-content/65">
          Created: {formatCreatedAt(test.createdAt)}
        </p>

        <div className="card-actions justify-end">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onEdit(test)}
          >
            Edit Test
          </button>
        </div>
      </div>
    </article>
  );
}

function WritingTestPanel({
  formValues,
  selectedImageName,
  selectedImagePreviewUrl,
  isSaving,
  hasNewImageUpload,
  uploadProgress,
  errorMessage,
  onClose,
  onChange,
  onImageChange,
  onSave,
}) {
  return (
    <section className="w-full max-w-5xl rounded-3xl border border-base-300 bg-base-100 shadow-xl">
      <div className="flex items-center justify-between border-b border-base-300 px-6 py-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
            IELTS Writing
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Create Writing Test
          </h2>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-square rounded-xl"
          aria-label="Close writing test creator"
          onClick={onClose}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-6 px-6 py-6">
        {isSaving ? (
          <div className="rounded-2xl border border-info/30 bg-info/10 px-5 py-4 text-sm font-medium text-info-content">
            {hasNewImageUpload
              ? `Uploading image and saving test... ${uploadProgress}%`
              : "Saving test..."}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="form-control md:col-span-1">
            <span className="label-text mb-2 font-medium">Test Name</span>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Enter test name"
              value={formValues.testName}
              onChange={(event) => onChange("testName", event.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-2 font-medium">Test Difficulty</span>
            <select
              className="select select-bordered w-full"
              style={{ color: getDifficultyTextColor(formValues.testDifficulty) }}
              value={formValues.testDifficulty}
              onChange={(event) =>
                onChange("testDifficulty", event.target.value)
              }
            >
              {difficultyOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  style={{ color: option.color }}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control">
            <span className="label-text mb-2 font-medium">Date</span>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formValues.date}
              readOnly
            />
          </label>
        </div>

        <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Section 1
            </p>
            <h3 className="text-xl font-semibold">Part 1</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-3xl font-black uppercase tracking-[0.18em] text-[#1b2ea8]">
                Writing Task 1
              </p>
              <p className="text-lg font-medium">
                You should spend about 20 minutes on this task.
              </p>
            </div>

            <label className="form-control">
              <span className="label-text mb-2 font-medium">Task Prompt</span>
              <textarea
                className="textarea textarea-bordered min-h-44 w-full leading-7"
                placeholder={
                  "Enter the Task 1 prompt here.\n\nUse blank lines, numbering, or extra instructions exactly as you want them to appear."
                }
                value={formValues.part1Prompt}
                onChange={(event) =>
                  onChange("part1Prompt", event.target.value)
                }
              />
              <span className="label-text-alt mt-2 text-base-content/60">
                Blank lines and line breaks are preserved while editing.
              </span>
            </label>

            <p className="text-lg font-medium">Write at least 150 words.</p>

            <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/40 p-4">
              <p className="mb-3 font-medium">Upload Image</p>
              <input
                type="file"
                accept="image/*"
                className="file-input file-input-bordered w-full"
                onChange={onImageChange}
              />
              <p className="mt-3 text-sm text-base-content/65">
                {selectedImageName || "No image selected"}
              </p>

              <div className="mt-4 rounded-2xl border border-base-300 bg-base-100 p-4">
                <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-base-content/45">
                  Image Preview
                </p>
                {selectedImagePreviewUrl ? (
                  <img
                    src={selectedImagePreviewUrl}
                    alt="Task 1 uploaded preview"
                    className="max-h-[32rem] w-full rounded-xl object-contain"
                  />
                ) : (
                  <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-base-300 bg-base-200/50 px-6 text-center text-base-content/55">
                    Uploaded Task 1 visual will appear here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Section 2
            </p>
            <h3 className="text-xl font-semibold">Part 2</h3>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-3xl font-black uppercase tracking-[0.18em] text-[#1b2ea8]">
                  Writing Task 2
                </p>
                <p className="text-lg font-medium">
                  You should spend about 40 minutes on this task.
                </p>
                <p className="text-lg font-medium">
                  Write about the following topic:
                </p>
              </div>

              <label className="form-control">
                <span className="label-text mb-2 font-medium">
                  Task Prompt
                </span>
                <textarea
                  className="textarea textarea-bordered min-h-52 w-full leading-7"
                  placeholder={
                    "Enter the Task 2 prompt here.\n\nUse blank lines, numbering, or extra instructions exactly as you want them to appear."
                  }
                  value={formValues.part2Prompt}
                  onChange={(event) => onChange("part2Prompt", event.target.value)}
                />
                <span className="label-text-alt mt-2 text-base-content/60">
                  Blank lines and line breaks are preserved while editing.
                </span>
              </label>

              <div className="space-y-3">
                <p className="text-lg font-medium">Write at least 250 words.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-3 border-t border-base-300 px-6 py-5">
        {errorMessage ? (
          <p className="mr-auto self-center text-sm font-medium text-error">
            {errorMessage}
          </p>
        ) : null}
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
        <CreatorActionButton onClick={onSave}>
          {isSaving ? "Saving..." : "Save Test"}
        </CreatorActionButton>
      </div>
    </section>
  );
}

const initialWritingTestForm = () => ({
  testName: "",
  testDifficulty: "medium",
  date: getTodayDate(),
  part1Prompt: "",
  part2Prompt: "",
});

const WritingTestCreator = forwardRef(function WritingTestCreator(_, ref) {
  const [isWritingTestComposerOpen, setIsWritingTestComposerOpen] = useState(false);
  const [writingTests, setWritingTests] = useState([]);
  const [isWritingTestsLoading, setIsWritingTestsLoading] = useState(true);
  const [isSavingWritingTest, setIsSavingWritingTest] = useState(false);
  const [isDeletingWritingTest, setIsDeletingWritingTest] = useState(false);
  const [writingTestUploadProgress, setWritingTestUploadProgress] = useState(0);
  const [writingTestError, setWritingTestError] = useState("");
  const [writingTestNotice, setWritingTestNotice] = useState("");
  const [editingWritingTestId, setEditingWritingTestId] = useState("");
  const [writingTestForm, setWritingTestForm] = useState(initialWritingTestForm);
  const [selectedPart1ImageName, setSelectedPart1ImageName] = useState("");
  const [selectedPart1ImageFile, setSelectedPart1ImageFile] = useState(null);
  const [selectedPart1ImagePreviewUrl, setSelectedPart1ImagePreviewUrl] =
    useState("");

  useImperativeHandle(ref, () => ({
    openCreateNew() {
      setWritingTestError("");
      setWritingTestNotice("");
      setWritingTestUploadProgress(0);
      setEditingWritingTestId("");
      setWritingTestForm(initialWritingTestForm());
      setSelectedPart1ImageName("");
      setSelectedPart1ImageFile(null);
      revokePreviewUrl(selectedPart1ImagePreviewUrl);
      setSelectedPart1ImagePreviewUrl("");
      setIsWritingTestComposerOpen(true);
    },
  }), [selectedPart1ImagePreviewUrl]);

  useEffect(() => {
    if (!writingTestNotice) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setWritingTestNotice("");
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [writingTestNotice]);

  useEffect(() => {
    async function loadWritingTests() {
      try {
        setIsWritingTestsLoading(true);
        setWritingTests(await listWritingTests());
      } catch (error) {
        console.error("[Creator] Failed to load writing tests:", error);
      } finally {
        setIsWritingTestsLoading(false);
      }
    }

    loadWritingTests();
  }, []);

  useEffect(() => {
    return () => {
      if (selectedPart1ImagePreviewUrl) {
        revokePreviewUrl(selectedPart1ImagePreviewUrl);
      }
    };
  }, [selectedPart1ImagePreviewUrl]);

  function handleWritingTestChange(field, value) {
    setWritingTestForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleWritingTestImageChange(event) {
    const nextFile = event.target.files?.[0];
    setSelectedPart1ImageFile(nextFile || null);
    setSelectedPart1ImageName(nextFile ? nextFile.name : "");
    revokePreviewUrl(selectedPart1ImagePreviewUrl);
    setSelectedPart1ImagePreviewUrl(
      nextFile ? URL.createObjectURL(nextFile) : ""
    );
  }

  function handleCloseWritingTestComposer() {
    if (isSavingWritingTest) {
      return;
    }

    setIsWritingTestComposerOpen(false);
    setWritingTestError("");
    setWritingTestNotice("");
    setWritingTestUploadProgress(0);
    setEditingWritingTestId("");
  }

  function handleEditWritingTest(test) {
    const matchingDifficulty =
      difficultyOptions.find(
        (option) => option.label.toLowerCase() === String(test.difficulty).toLowerCase()
      )?.value || "medium";

    setWritingTestError("");
    setWritingTestNotice("");
    setEditingWritingTestId(test.id);
    setWritingTestForm({
      testName: test.name || "",
      testDifficulty: matchingDifficulty,
      date: test.date || getTodayDate(),
      part1Prompt: test.task1Prompt || "",
      part2Prompt: test.task2Prompt || "",
    });
    setSelectedPart1ImageName("");
    setSelectedPart1ImageFile(null);
    revokePreviewUrl(selectedPart1ImagePreviewUrl);
    setSelectedPart1ImagePreviewUrl(test.task1ImageUrl || "");
    setIsWritingTestComposerOpen(true);
  }

  async function handleSaveWritingTest() {
    if (isSavingWritingTest) {
      return;
    }

    if (!writingTestForm.testName.trim()) {
      setWritingTestError("Test name is required.");
      return;
    }

    if (!writingTestForm.part1Prompt.trim()) {
      setWritingTestError("Task 1 prompt is required.");
      return;
    }

    if (!writingTestForm.part2Prompt.trim()) {
      setWritingTestError("Task 2 prompt is required.");
      return;
    }

    try {
      setIsSavingWritingTest(true);
      setWritingTestError("");
      setWritingTestNotice("");
      setWritingTestUploadProgress(0);

      const difficultyLabel =
        difficultyOptions.find(
          (option) => option.value === writingTestForm.testDifficulty
        )?.label || "Medium";
      const existingTest = writingTests.find(
        (test) => test.id === editingWritingTestId
      );
      const { notice, savedTest } = await withTimeout(
        saveWritingTest({
          editingTestId: editingWritingTestId,
          formValues: writingTestForm,
          difficultyLabel,
          selectedImageFile: selectedPart1ImageFile,
          existingImageUrl: selectedPart1ImagePreviewUrl,
          existingImagePath: existingTest?.task1ImagePath || "",
          onUploadProgress: setWritingTestUploadProgress,
        }),
        selectedPart1ImageFile ? 210000 : 45000,
        "Saving the writing test took too long. Please try again."
      );

      setWritingTests((currentTests) => [
        savedTest,
        ...currentTests.filter((test) => test.id !== savedTest.id),
      ]);
      setWritingTestNotice(notice === "Test saved." ? "" : notice);
      setIsWritingTestComposerOpen(false);
      setEditingWritingTestId("");
    } catch (error) {
      console.error("[Creator] Failed to save writing test:", error);
      setWritingTestError(error?.message || "Failed to save writing test.");
    } finally {
      setIsSavingWritingTest(false);
    }
  }

  async function handleDeleteWritingTest(test) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this test?"
    );

    if (!shouldDelete || isDeletingWritingTest) {
      return;
    }

    try {
      setIsDeletingWritingTest(true);
      setWritingTestError("");
      setWritingTestNotice("");
      setWritingTests((currentTests) =>
        currentTests.filter((currentTest) => currentTest.id !== test.id)
      );

      if (editingWritingTestId === test.id) {
        handleCloseWritingTestComposer();
      }

      await withTimeout(
        deleteWritingTest(test),
        30000,
        "Deleting the writing test took too long. Please try again."
      );

      setWritingTestNotice("Test deleted.");
    } catch (error) {
      console.error("[Creator] Failed to delete writing test:", error);
      setWritingTests((currentTests) => {
        const testStillMissing = !currentTests.some(
          (currentTest) => currentTest.id === test.id
        );

        if (!testStillMissing) {
          return currentTests;
        }

        const restoredTests = [...currentTests, test];
        return restoredTests.sort((left, right) => {
          const leftTime = new Date(left.createdAt).getTime();
          const rightTime = new Date(right.createdAt).getTime();

          return (Number.isNaN(rightTime) ? 0 : rightTime) -
            (Number.isNaN(leftTime) ? 0 : leftTime);
        });
      });
      setWritingTestError(error?.message || "Failed to delete writing test.");
    } finally {
      setIsDeletingWritingTest(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-start gap-6">
      {isWritingTestComposerOpen ? (
        <WritingTestPanel
          formValues={writingTestForm}
          selectedImageName={selectedPart1ImageName}
          selectedImagePreviewUrl={selectedPart1ImagePreviewUrl}
          isSaving={isSavingWritingTest}
          hasNewImageUpload={!!selectedPart1ImageFile}
          uploadProgress={writingTestUploadProgress}
          errorMessage={writingTestError}
          onClose={handleCloseWritingTestComposer}
          onChange={handleWritingTestChange}
          onImageChange={handleWritingTestImageChange}
          onSave={handleSaveWritingTest}
        />
      ) : (
        <>
          {writingTestNotice ? (
            <div className="w-full max-w-5xl rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm font-medium text-warning-content">
              {writingTestNotice}
            </div>
          ) : null}

          {writingTests.length > 0 ? (
            <div className="grid w-full max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3">
              {writingTests.map((test) => (
                <WritingTestCard
                  key={test.id}
                  test={test}
                  onDelete={handleDeleteWritingTest}
                  onEdit={handleEditWritingTest}
                />
              ))}
            </div>
          ) : isWritingTestsLoading ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
              <p className="text-lg font-medium text-base-content/65">
                Loading writing tests...
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
              <p className="text-lg font-medium text-base-content/65">
                No writing tests yet.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default WritingTestCreator;

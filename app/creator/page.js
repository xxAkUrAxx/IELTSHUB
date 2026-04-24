"use client";

import { useEffect, useState } from "react";
import {
  AcademicCapIcon,
  Bars3Icon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ComputerDesktopIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRequireRole } from "../../lib/firebase/role-guard";
import {
  deleteWritingTest,
  listWritingTests,
  saveWritingTest,
} from "../../lib/tests/writing-tests";

const mockExamItems = [
  {
    key: "reading-test",
    label: "Reading Test",
    icon: BookOpenIcon,
  },
  {
    key: "writing-test",
    label: "Writing Test",
    icon: PencilSquareIcon,
  },
  {
    key: "listening-test",
    label: "Listening Test",
    icon: MusicalNoteIcon,
  },
  {
    key: "speaking-test",
    label: "Speaking Test",
    icon: MicrophoneIcon,
  },
];

const practiceActivityItems = [
  {
    key: "grammar",
    label: "Grammar",
    icon: AcademicCapIcon,
  },
  {
    key: "reading",
    label: "Reading",
    icon: BookOpenIcon,
  },
  {
    key: "writing",
    label: "Writing",
    icon: PencilSquareIcon,
  },
  {
    key: "speed-typing",
    label: "Speed Typing",
    icon: ClockIcon,
  },
];

const sidebarSections = [
  {
    key: "mock-exams",
    label: "Mock Exams",
    icon: ComputerDesktopIcon,
    items: mockExamItems,
  },
  {
    key: "practice-activity",
    label: "Practice Activity",
    icon: ClipboardDocumentCheckIcon,
    items: practiceActivityItems,
  },
];

const allSidebarItems = sidebarSections.flatMap((section) => section.items);

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
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

function SidebarItem({
  item,
  isCollapsed,
  isActive,
  onSelect,
  nested = false,
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      title={isCollapsed ? item.label : undefined}
      className={`btn btn-ghost h-12 justify-start rounded-xl px-3 normal-case transition ${
        isActive
          ? "bg-base-100 text-primary shadow-sm"
          : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
      } ${nested ? "text-sm" : ""}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
}

function SidebarSection({
  label,
  icon: Icon,
  items,
  isCollapsed,
  isOpen,
  activeItemKey,
  onToggle,
  onSelect,
}) {
  const hasActiveItem = items.some((item) => item.key === activeItemKey);

  return (
    <div className="mt-2 flex flex-col gap-1">
      <button
        type="button"
        onClick={onToggle}
        title={isCollapsed ? label : undefined}
        className={`flex h-12 items-center rounded-xl px-3 transition ${
          hasActiveItem || isOpen
            ? "bg-base-200 text-base-content"
            : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && (
          <>
            <span className="ml-3 flex-1 truncate text-left font-medium">
              {label}
            </span>
            {isOpen ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div className={`flex flex-col gap-1 ${isCollapsed ? "" : "pl-3"}`}>
          {items.map((item) => (
            <SidebarItem
              key={item.key}
              item={item}
              isCollapsed={isCollapsed}
              isActive={activeItemKey === item.key}
              onSelect={onSelect}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
          <button type="button" className="btn btn-outline" onClick={() => onEdit(test)}>
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
            {selectedImageName
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

export default function CreatorPage() {
  const isAuthorized = useRequireRole("creator");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSectionKey, setOpenSectionKey] = useState("mock-exams");
  const [activeItemKey, setActiveItemKey] = useState("reading-test");
  const [isWritingTestComposerOpen, setIsWritingTestComposerOpen] = useState(false);
  const [writingTests, setWritingTests] = useState([]);
  const [isWritingTestsLoading, setIsWritingTestsLoading] = useState(true);
  const [isSavingWritingTest, setIsSavingWritingTest] = useState(false);
  const [isDeletingWritingTest, setIsDeletingWritingTest] = useState(false);
  const [writingTestUploadProgress, setWritingTestUploadProgress] = useState(0);
  const [writingTestError, setWritingTestError] = useState("");
  const [writingTestNotice, setWritingTestNotice] = useState("");
  const [editingWritingTestId, setEditingWritingTestId] = useState("");
  const [writingTestForm, setWritingTestForm] = useState({
    testName: "",
    testDifficulty: "medium",
    date: getTodayDate(),
    part1Prompt: "",
    part2Prompt: "",
  });
  const [selectedPart1ImageName, setSelectedPart1ImageName] = useState("");
  const [selectedPart1ImageFile, setSelectedPart1ImageFile] = useState(null);
  const [selectedPart1ImagePreviewUrl, setSelectedPart1ImagePreviewUrl] =
    useState("");
  const activeItem = allSidebarItems.find((item) => item.key === activeItemKey);

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
        URL.revokeObjectURL(selectedPart1ImagePreviewUrl);
      }
    };
  }, [selectedPart1ImagePreviewUrl]);

  function handleCreateNew() {
    if (!activeItem) {
      return;
    }

    if (activeItem.key === "writing-test") {
      setWritingTestError("");
      setWritingTestNotice("");
      setWritingTestUploadProgress(0);
      setEditingWritingTestId("");
      setWritingTestForm({
        testName: "",
        testDifficulty: "medium",
        date: getTodayDate(),
        part1Prompt: "",
        part2Prompt: "",
      });
      setSelectedPart1ImageName("");
      setSelectedPart1ImageFile(null);
      if (selectedPart1ImagePreviewUrl) {
        URL.revokeObjectURL(selectedPart1ImagePreviewUrl);
      }
      setSelectedPart1ImagePreviewUrl("");
      setIsWritingTestComposerOpen(true);
      return;
    }

    console.log(`[Creator] Create new clicked for: ${activeItem.label}`);
  }

  function handleToggleSection(sectionKey) {
    setOpenSectionKey((currentKey) =>
      currentKey === sectionKey ? "" : sectionKey
    );
  }

  function handleSelectItem(itemKey) {
    setActiveItemKey(itemKey);
  }

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
    if (selectedPart1ImagePreviewUrl) {
      URL.revokeObjectURL(selectedPart1ImagePreviewUrl);
    }
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
    setSelectedPart1ImageName(test.task1ImagePath ? "Existing uploaded image" : "");
    setSelectedPart1ImageFile(null);
    if (selectedPart1ImagePreviewUrl) {
      URL.revokeObjectURL(selectedPart1ImagePreviewUrl);
    }
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
      const { notice, savedTest } = await saveWritingTest({
        editingTestId: editingWritingTestId,
        formValues: writingTestForm,
        difficultyLabel,
        selectedImageFile: selectedPart1ImageFile,
        existingImageUrl: selectedPart1ImagePreviewUrl,
        existingImagePath: existingTest?.task1ImagePath || "",
        onUploadProgress: setWritingTestUploadProgress,
      });

      setWritingTests((currentTests) => [
        savedTest,
        ...currentTests.filter((test) => test.id !== savedTest.id),
      ]);
      setWritingTestNotice(notice);
      setIsWritingTestComposerOpen(false);
      setEditingWritingTestId("");
    } catch (error) {
      console.error("[Creator] Failed to save writing test:", error);
      setWritingTestError(
        error?.message || "Failed to save writing test."
      );
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

      await deleteWritingTest(test);
      setWritingTests((currentTests) =>
        currentTests.filter((currentTest) => currentTest.id !== test.id)
      );

      if (editingWritingTestId === test.id) {
        handleCloseWritingTestComposer();
      }

      setWritingTestNotice("Test deleted.");
    } catch (error) {
      console.error("[Creator] Failed to delete writing test:", error);
      setWritingTestError(error?.message || "Failed to delete writing test.");
    } finally {
      setIsDeletingWritingTest(false);
    }
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-base-200 text-base-content">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-base-300 bg-base-100/95 backdrop-blur ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="flex items-center justify-between border-b border-base-300 px-4 py-4">
          {!isCollapsed && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
                Creator
              </p>
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-square rounded-xl"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? (
              <Bars3Icon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {sidebarSections.map((section) => (
              <SidebarSection
                key={section.key}
                label={section.label}
                icon={section.icon}
                items={section.items}
                isCollapsed={isCollapsed}
                isOpen={openSectionKey === section.key}
                activeItemKey={activeItemKey}
                onToggle={() => handleToggleSection(section.key)}
                onSelect={(item) => handleSelectItem(item.key)}
              />
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto">
        <div className="min-h-screen p-6 md:p-8">
          <section className="flex min-h-[calc(100vh-4rem)] flex-col">
            <header className="mb-8 flex items-center justify-between gap-4">
              <h1 className="text-3xl font-semibold tracking-tight">
                {activeItem?.label || "Creator Dashboard"}
              </h1>

              <CreatorActionButton onClick={handleCreateNew}>
                <PlusIcon className="h-5 w-5" />
                <span>Create New</span>
              </CreatorActionButton>
            </header>

            {activeItemKey === "writing-test" ? (
              <div className="flex flex-1 flex-col items-start gap-6">
                {isWritingTestComposerOpen ? (
                  <WritingTestPanel
                    formValues={writingTestForm}
                    selectedImageName={selectedPart1ImageName}
                    selectedImagePreviewUrl={selectedPart1ImagePreviewUrl}
                    isSaving={isSavingWritingTest}
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
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
                  <p className="text-lg font-medium text-base-content/65">
                    {activeItem?.label || "Creator Dashboard"} section is ready.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

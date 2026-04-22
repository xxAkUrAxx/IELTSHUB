"use client";

import { useState } from "react";
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
} from "@heroicons/react/24/outline";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase/config";
import { useRequireRole } from "../../lib/firebase/role-guard";

const mockTestItems = [
  {
    key: "reading",
    label: "Reading",
    pageTitle: "Reading Tests",
    icon: BookOpenIcon,
    type: "reading",
    category: "mock",
  },
  {
    key: "writing",
    label: "Writing",
    pageTitle: "Writing Tests",
    icon: PencilSquareIcon,
    type: "writing",
    category: "mock",
  },
  {
    key: "listening",
    label: "Listening",
    pageTitle: "Listening Tests",
    icon: MusicalNoteIcon,
    type: "listening",
    category: "mock",
  },
  {
    key: "speaking",
    label: "Speaking",
    pageTitle: "Speaking Tests",
    icon: MicrophoneIcon,
    type: "speaking",
    category: "mock",
  },
];

const practiceActivityItems = [
  {
    key: "grammar",
    label: "Grammar",
    pageTitle: "Grammar Activities",
    icon: AcademicCapIcon,
    type: "grammar",
    category: "practice",
  },
  {
    key: "speed-typing",
    label: "Speed Typing",
    pageTitle: "Speed Typing Activities",
    icon: ClockIcon,
    type: "speed-typing",
    category: "practice",
  },
];

const difficultyOptions = ["Easy", "Medium", "Hard"];

const initialReadingForm = {
  name: "",
  difficulty: difficultyOptions[0],
  section1Passage: "",
  section1Questions: "",
  section2Passage: "",
  section2Questions: "",
  section3Passage: "",
  section3Questions: "",
  answers: "",
};

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

function ReadingCreateForm({
  formData,
  isSaving,
  onFieldChange,
  onDifficultySelect,
  onCancel,
  onSave,
}) {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
            Mock Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Create Reading Test
          </h1>
        </div>

        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Back to Reading
        </button>
      </header>

      <form onSubmit={onSave} className="grid gap-6">
        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-6 p-6 md:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="form-control">
                <label htmlFor="reading-test-name" className="label">
                  <span className="label-text font-medium">Test Name</span>
                </label>
                <input
                  id="reading-test-name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={onFieldChange}
                  className="input input-bordered w-full"
                  placeholder="Enter reading test name"
                />
              </div>

              <div className="form-control gap-3">
                <label className="label py-0">
                  <span className="label-text font-medium">Difficulty</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {difficultyOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onDifficultySelect(option)}
                      className={`btn rounded-xl ${
                        formData.difficulty === option
                          ? "btn-primary"
                          : "btn-outline border-base-300"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-6 p-6 md:p-8">
            <h2 className="card-title text-xl">Section 1</h2>

            <div className="form-control">
              <label htmlFor="section-1-passage" className="label">
                <span className="label-text font-medium">Passage</span>
              </label>
              <textarea
                id="section-1-passage"
                name="section1Passage"
                value={formData.section1Passage}
                onChange={onFieldChange}
                className="textarea textarea-bordered min-h-44 w-full"
                placeholder="Enter section 1 passage"
              />
            </div>

            <div className="form-control">
              <label htmlFor="section-1-questions" className="label">
                <span className="label-text font-medium">Questions</span>
              </label>
              <textarea
                id="section-1-questions"
                name="section1Questions"
                value={formData.section1Questions}
                onChange={onFieldChange}
                className="textarea textarea-bordered min-h-36 w-full"
                placeholder="Enter section 1 questions"
              />
            </div>
          </div>
        </section>

        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-6 p-6 md:p-8">
            <h2 className="card-title text-xl">Section 2</h2>

            <div className="form-control">
              <label htmlFor="section-2-passage" className="label">
                <span className="label-text font-medium">Passage</span>
              </label>
              <textarea
                id="section-2-passage"
                name="section2Passage"
                value={formData.section2Passage}
                onChange={onFieldChange}
                className="textarea textarea-bordered min-h-44 w-full"
                placeholder="Enter section 2 passage"
              />
            </div>

            <div className="form-control">
              <label htmlFor="section-2-questions" className="label">
                <span className="label-text font-medium">Questions</span>
              </label>
              <textarea
                id="section-2-questions"
                name="section2Questions"
                value={formData.section2Questions}
                onChange={onFieldChange}
                className="textarea textarea-bordered min-h-36 w-full"
                placeholder="Enter section 2 questions"
              />
            </div>
          </div>
        </section>

        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-6 p-6 md:p-8">
            <h2 className="card-title text-xl">Section 3</h2>

            <div className="form-control">
              <label htmlFor="section-3-passage" className="label">
                <span className="label-text font-medium">Passage</span>
              </label>
              <textarea
                id="section-3-passage"
                name="section3Passage"
                value={formData.section3Passage}
                onChange={onFieldChange}
                className="textarea textarea-bordered min-h-44 w-full"
                placeholder="Enter section 3 passage"
              />
            </div>

            <div className="form-control">
              <label htmlFor="section-3-questions" className="label">
                <span className="label-text font-medium">Questions</span>
              </label>
              <textarea
                id="section-3-questions"
                name="section3Questions"
                value={formData.section3Questions}
                onChange={onFieldChange}
                className="textarea textarea-bordered min-h-36 w-full"
                placeholder="Enter section 3 questions"
              />
            </div>
          </div>
        </section>

        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-6 p-6 md:p-8">
            <h2 className="card-title text-xl">Answer Sheet</h2>

            <div className="form-control">
              <label htmlFor="reading-answers" className="label">
                <span className="label-text font-medium">Answers</span>
              </label>
              <textarea
                id="reading-answers"
                name="answers"
                value={formData.answers}
                onChange={onFieldChange}
                className="textarea textarea-bordered min-h-40 w-full"
                placeholder="Enter answer sheet"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Reading Test"}
          </button>
        </div>
      </form>
    </section>
  );
}

function CreatorContent({
  selectedItem,
  currentView,
  readingForm,
  isSaving,
  onCreateNew,
  onReadingFieldChange,
  onReadingDifficultySelect,
  onCancelCreate,
  onSaveReading,
}) {
  if (!selectedItem) {
    return (
      <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
          <p className="text-lg font-medium text-base-content/65">
            Select a creator item from the sidebar.
          </p>
        </div>
      </section>
    );
  }

  if (selectedItem.type === "reading" && currentView === "create") {
    return (
      <ReadingCreateForm
        formData={readingForm}
        isSaving={isSaving}
        onFieldChange={onReadingFieldChange}
        onDifficultySelect={onReadingDifficultySelect}
        onCancel={onCancelCreate}
        onSave={onSaveReading}
      />
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col">
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          {selectedItem.pageTitle}
        </h1>

        {selectedItem.type === "reading" ? (
          <button type="button" className="btn btn-primary gap-2" onClick={onCreateNew}>
            <PlusIcon className="h-5 w-5" />
            <span>Create New</span>
          </button>
        ) : null}
      </header>

      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
          <p className="text-base-content/65">
            Content area for {selectedItem.label.toLowerCase()} will appear here.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function CreatorPage() {
  const isAuthorized = useRequireRole("creator");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMockOpen, setIsMockOpen] = useState(true);
  const [isPracticeOpen, setIsPracticeOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState(mockTestItems[0]);
  const [currentView, setCurrentView] = useState("list");
  const [isSaving, setIsSaving] = useState(false);
  const [readingForm, setReadingForm] = useState(initialReadingForm);

  function handleSelectItem(item) {
    setSelectedItem(item);
    setCurrentView("list");
  }

  function handleCreateNew() {
    if (selectedItem?.type !== "reading") {
      return;
    }

    setCurrentView("create");
  }

  function handleReadingFieldChange(event) {
    const { name, value } = event.target;

    setReadingForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleReadingDifficultySelect(difficulty) {
    setReadingForm((current) => ({
      ...current,
      difficulty,
    }));
  }

  function handleCancelCreate() {
    setCurrentView("list");
  }

  async function handleSaveReading(event) {
    event.preventDefault();
    setIsSaving(true);

    const payload = {
      name: readingForm.name,
      difficulty: readingForm.difficulty,
      type: "reading",
      sections: [
        {
          section: 1,
          passage: readingForm.section1Passage,
          questions: readingForm.section1Questions,
        },
        {
          section: 2,
          passage: readingForm.section2Passage,
          questions: readingForm.section2Questions,
        },
        {
          section: 3,
          passage: readingForm.section3Passage,
          questions: readingForm.section3Questions,
        },
      ],
      answers: readingForm.answers,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "mockTests"), payload);
      console.log("[Creator] Saved reading test:", {
        ...payload,
        createdAt: new Date().toISOString(),
      });
      setReadingForm(initialReadingForm);
      setCurrentView("list");
    } catch (error) {
      console.error("[Creator] Failed to save reading test:", error);
    } finally {
      setIsSaving(false);
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
            <SidebarSection
              label="Create Mock Test"
              icon={ComputerDesktopIcon}
              items={mockTestItems}
              isCollapsed={isCollapsed}
              isOpen={isMockOpen}
              activeItemKey={selectedItem?.key}
              onToggle={() => setIsMockOpen((current) => !current)}
              onSelect={handleSelectItem}
            />

            <SidebarSection
              label="Create Practice Activity"
              icon={ClipboardDocumentCheckIcon}
              items={practiceActivityItems}
              isCollapsed={isCollapsed}
              isOpen={isPracticeOpen}
              activeItemKey={selectedItem?.key}
              onToggle={() => setIsPracticeOpen((current) => !current)}
              onSelect={handleSelectItem}
            />
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto">
        <div className="min-h-screen p-6 md:p-8">
          <CreatorContent
            selectedItem={selectedItem}
            currentView={currentView}
            readingForm={readingForm}
            isSaving={isSaving}
            onCreateNew={handleCreateNew}
            onReadingFieldChange={handleReadingFieldChange}
            onReadingDifficultySelect={handleReadingDifficultySelect}
            onCancelCreate={handleCancelCreate}
            onSaveReading={handleSaveReading}
          />
        </div>
      </main>
    </div>
  );
}

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
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase/config";
import { useRequireRole } from "../../lib/firebase/role-guard";

const mockTestItems = [
  {
    key: "reading",
    label: "Reading",
    icon: BookOpenIcon,
    type: "reading",
    collectionName: "mockTests",
  },
  {
    key: "writing",
    label: "Writing",
    icon: PencilSquareIcon,
    type: "writing",
    collectionName: "mockTests",
  },
  {
    key: "listening",
    label: "Listening",
    icon: MusicalNoteIcon,
    type: "listening",
    collectionName: "mockTests",
  },
  {
    key: "speaking",
    label: "Speaking",
    icon: MicrophoneIcon,
    type: "speaking",
    collectionName: "mockTests",
  },
];

const practiceActivityItems = [
  {
    key: "grammar",
    label: "Grammar",
    icon: AcademicCapIcon,
    type: "grammar",
    collectionName: "practiceActivities",
  },
  {
    key: "listening-practice",
    label: "Listening",
    icon: MusicalNoteIcon,
    type: "listening",
    collectionName: "practiceActivities",
  },
  {
    key: "speed-typing",
    label: "Speed Typing",
    icon: ClockIcon,
    type: "speed-typing",
    collectionName: "practiceActivities",
  },
];

const difficultyOptions = ["Easy", "Medium", "Hard"];

function formatToday() {
  return new Date().toLocaleDateString("en-CA");
}

function SidebarItem({
  item,
  isCollapsed,
  onOpenModal,
  nested = false,
}) {
  const Icon = item.icon;

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-base-200 ${
        nested ? "" : "min-h-12"
      }`}
    >
      <button
        type="button"
        title={isCollapsed ? item.label : undefined}
        className={`btn btn-ghost h-10 flex-1 justify-start rounded-xl px-2 normal-case text-base-content/70 hover:bg-transparent hover:text-base-content ${
          nested ? "text-sm" : ""
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </button>

      {!isCollapsed && (
        <button
          type="button"
          onClick={() => onOpenModal(item)}
          className="btn btn-ghost btn-xs gap-1 rounded-lg border border-base-300 px-2 normal-case text-base-content/65 hover:border-primary/30 hover:bg-base-100 hover:text-primary"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          <span>Create New</span>
        </button>
      )}
    </div>
  );
}

function SidebarSection({
  label,
  icon: Icon,
  items,
  isCollapsed,
  isOpen,
  onToggle,
  onOpenModal,
}) {
  return (
    <div className="mt-2 flex flex-col gap-1">
      <button
        type="button"
        onClick={onToggle}
        title={isCollapsed ? label : undefined}
        className={`flex h-12 items-center rounded-xl px-3 transition ${
          isOpen
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
              onOpenModal={onOpenModal}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateItemModal({
  selectedItem,
  formData,
  isSaving,
  saveError,
  saveSuccess,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!selectedItem) {
    return null;
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md rounded-3xl border border-base-300 bg-base-100 p-0 shadow-xl">
        <div className="flex items-center justify-between border-b border-base-300 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Create New
            </p>
            <h3 className="text-xl font-semibold">{selectedItem.label}</h3>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm rounded-xl"
            onClick={onClose}
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-6 py-6">
          <div className="form-control">
            <label htmlFor="test-name" className="label">
              <span className="label-text font-medium">Test Name</span>
            </label>
            <input
              id="test-name"
              name="testName"
              type="text"
              value={formData.testName}
              onChange={onChange}
              placeholder={`Enter ${selectedItem.label.toLowerCase()} title`}
              className="input input-bordered w-full"
              required
            />
          </div>

          <div className="form-control">
            <label htmlFor="difficulty" className="label">
              <span className="label-text font-medium">Difficulty</span>
            </label>
            <select
              id="difficulty"
              name="difficulty"
              value={formData.difficulty}
              onChange={onChange}
              className="select select-bordered w-full"
              required
            >
              {difficultyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label htmlFor="date-created" className="label">
              <span className="label-text font-medium">Date</span>
            </label>
            <input
              id="date-created"
              type="text"
              value={formData.date}
              className="input input-bordered w-full"
              readOnly
            />
          </div>

          {saveError ? <p className="text-sm text-error">{saveError}</p> : null}
          {saveSuccess ? (
            <p className="text-sm text-success">{saveSuccess}</p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

export default function CreatorPage() {
  const isAuthorized = useRequireRole("creator");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMockOpen, setIsMockOpen] = useState(true);
  const [isPracticeOpen, setIsPracticeOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    testName: "",
    difficulty: difficultyOptions[0],
    date: formatToday(),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  function handleOpenModal(item) {
    setSelectedItem(item);
    setFormData({
      testName: "",
      difficulty: difficultyOptions[0],
      date: formatToday(),
    });
    setSaveError("");
    setSaveSuccess("");
  }

  function handleCloseModal() {
    if (isSaving) {
      return;
    }

    setSelectedItem(null);
    setSaveError("");
    setSaveSuccess("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedItem) {
      return;
    }

    const matchedItem = [...mockTestItems, ...practiceActivityItems].find(
      (item) => item.key === selectedItem.key
    );

    if (!matchedItem) {
      setSaveError("Selected item could not be resolved.");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      await addDoc(collection(db, matchedItem.collectionName), {
        name: formData.testName.trim(),
        difficulty: formData.difficulty,
        type: matchedItem.type,
        date: formData.date,
        createdAt: serverTimestamp(),
      });

      setSaveSuccess("Saved successfully.");
      setFormData({
        testName: "",
        difficulty: difficultyOptions[0],
        date: formatToday(),
      });

      window.setTimeout(() => {
        setSelectedItem(null);
        setSaveSuccess("");
      }, 500);
    } catch (error) {
      console.error("[Creator] Failed to save item:", error);
      setSaveError("Unable to save right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      <div className="flex min-h-screen bg-base-200 text-base-content">
        <aside
          className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-base-300 bg-base-100/95 backdrop-blur transition-all duration-300 ${
            isCollapsed ? "w-20" : "w-80"
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
                onToggle={() => setIsMockOpen((current) => !current)}
                onOpenModal={handleOpenModal}
              />

              <SidebarSection
                label="Create Practice Activity"
                icon={ClipboardDocumentCheckIcon}
                items={practiceActivityItems}
                isCollapsed={isCollapsed}
                isOpen={isPracticeOpen}
                onToggle={() => setIsPracticeOpen((current) => !current)}
                onOpenModal={handleOpenModal}
              />
            </nav>
          </div>
        </aside>

        <main className="flex-1" />
      </div>

      <CreateItemModal
        selectedItem={selectedItem}
        formData={formData}
        isSaving={isSaving}
        saveError={saveError}
        saveSuccess={saveSuccess}
        onClose={handleCloseModal}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </>
  );
}

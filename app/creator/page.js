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
import { useRequireRole } from "../../lib/firebase/role-guard";

const mockTestItems = [
  {
    key: "reading",
    label: "Reading",
    pageTitle: "Reading Tests",
    icon: BookOpenIcon,
    type: "reading",
  },
  {
    key: "writing",
    label: "Writing",
    pageTitle: "Writing Tests",
    icon: PencilSquareIcon,
    type: "writing",
  },
  {
    key: "listening",
    label: "Listening",
    pageTitle: "Listening Tests",
    icon: MusicalNoteIcon,
    type: "listening",
  },
  {
    key: "speaking",
    label: "Speaking",
    pageTitle: "Speaking Tests",
    icon: MicrophoneIcon,
    type: "speaking",
  },
];

const practiceActivityItems = [
  {
    key: "grammar",
    label: "Grammar",
    pageTitle: "Grammar Activities",
    icon: AcademicCapIcon,
    type: "grammar",
  },
  {
    key: "speed-typing",
    label: "Speed Typing",
    pageTitle: "Speed Typing Activities",
    icon: ClockIcon,
    type: "speed-typing",
  },
];

const difficultyOptions = ["Easy", "Medium", "Hard"];

function formatToday() {
  return new Date().toLocaleDateString("en-CA");
}

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

function CreateItemModal({
  selectedItem,
  formData,
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

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function CreatorContent({ selectedItem, onCreateNew }) {
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

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col">
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          {selectedItem.pageTitle}
        </h1>

        <button type="button" className="btn btn-primary gap-2" onClick={onCreateNew}>
          <PlusIcon className="h-5 w-5" />
          <span>Create New</span>
        </button>
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
  const [modalItem, setModalItem] = useState(null);
  const [formData, setFormData] = useState({
    testName: "",
    difficulty: difficultyOptions[0],
    date: formatToday(),
  });

  function handleSelectItem(item) {
    setSelectedItem(item);
  }

  function handleOpenModal() {
    if (!selectedItem) {
      return;
    }

    setModalItem(selectedItem);
    setFormData({
      testName: "",
      difficulty: difficultyOptions[0],
      date: formatToday(),
    });
  }

  function handleCloseModal() {
    setModalItem(null);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setModalItem(null);
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
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
            <CreatorContent selectedItem={selectedItem} onCreateNew={handleOpenModal} />
          </div>
        </main>
      </div>

      <CreateItemModal
        selectedItem={modalItem}
        formData={formData}
        onClose={handleCloseModal}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </>
  );
}

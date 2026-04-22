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
} from "@heroicons/react/24/outline";
import { collection, getDocs } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
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

const creatorRouteByType = {
  reading: "/creator/CreateMockTest/ReadingTestCreator",
  writing: "/creator/CreateMockTest/WritingTestCreator",
  listening: "/creator/CreateMockTest/ListeningTestCreator",
  speaking: "/creator/CreateMockTest/SpeakingTestCreator",
};

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

function CreatorContent({
  selectedItem,
  testsByType,
  onCreateNew,
  onEditTest,
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

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col">
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          {selectedItem.pageTitle}
        </h1>

        {selectedItem.category === "mock" ? (
          <button type="button" className="btn btn-primary gap-2" onClick={onCreateNew}>
            <PlusIcon className="h-5 w-5" />
            <span>Create New</span>
          </button>
        ) : null}
      </header>

      {selectedItem.category === "mock" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(testsByType[selectedItem.type] || []).map((test) => (
            <article
              key={test.id}
              className="card border border-base-300 bg-base-100 shadow-sm"
            >
              <div className="card-body gap-3 p-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  {test.name || `Untitled ${selectedItem.label} Test`}
                </h2>
                <p className="text-sm text-base-content/65">
                  Difficulty: {test.difficulty}
                </p>
                <p className="text-sm text-base-content/65">
                  Created: {formatCreatedAt(test.createdAt)}
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn btn-outline border-base-300"
                    onClick={() => onEditTest(selectedItem.type, test.id)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </article>
          ))}

          {(testsByType[selectedItem.type] || []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm md:col-span-2 xl:col-span-3">
              <p className="text-base-content/65">
                No {selectedItem.label.toLowerCase()} tests created yet.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
            <p className="text-base-content/65">
              Content area for {selectedItem.label.toLowerCase()} will appear here.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default function CreatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthorized = useRequireRole("creator");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMockOpen, setIsMockOpen] = useState(true);
  const [isPracticeOpen, setIsPracticeOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState(mockTestItems[0]);
  const [testsByType, setTestsByType] = useState({
    reading: [],
    writing: [],
    listening: [],
    speaking: [],
  });

  useEffect(() => {
    async function loadTests() {
      try {
        const [readingSnapshot, writingSnapshot, listeningSnapshot, speakingSnapshot] =
          await Promise.all([
            getDocs(collection(db, "readingTests")),
            getDocs(collection(db, "writingTests")),
            getDocs(collection(db, "listeningTests")),
            getDocs(collection(db, "speakingTests")),
          ]);

        setTestsByType({
          reading: readingSnapshot.docs.map((docSnapshot) => ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          })),
          writing: writingSnapshot.docs.map((docSnapshot) => ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          })),
          listening: listeningSnapshot.docs.map((docSnapshot) => ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          })),
          speaking: speakingSnapshot.docs.map((docSnapshot) => ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          })),
        });
      } catch (error) {
        console.error("[Creator] Failed to load tests:", error);
      }
    }

    loadTests();
  }, []);

  useEffect(() => {
    const requestedType = searchParams.get("type");

    if (!requestedType) {
      return;
    }

    const matchingItem = mockTestItems.find((item) => item.type === requestedType);
    if (matchingItem) {
      setSelectedItem(matchingItem);
    }
  }, [searchParams]);

  function handleSelectItem(item) {
    setSelectedItem(item);
  }

  function handleCreateNew() {
    if (selectedItem?.category !== "mock") {
      return;
    }

    router.push(
      `${creatorRouteByType[selectedItem.type]}?type=${selectedItem.type}&category=mock&label=${encodeURIComponent(
        `${selectedItem.label} Test`
      )}`
    );
  }

  function handleEditTest(type, testId) {
    const route = creatorRouteByType[type];
    const item = mockTestItems.find((mockTestItem) => mockTestItem.type === type);

    if (!route || !item) {
      return;
    }

    router.push(
      `${route}?id=${testId}&type=${type}&category=mock&label=${encodeURIComponent(
        `${item.label} Test`
      )}`
    );
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
            testsByType={testsByType}
            onCreateNew={handleCreateNew}
            onEditTest={handleEditTest}
          />
        </div>
      </main>
    </div>
  );
}

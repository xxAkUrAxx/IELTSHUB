"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  AcademicCapIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ComputerDesktopIcon,
  MoonIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  PencilSquareIcon,
  PlusIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import { auth } from "../../lib/firebase/config";
import { useRequireRole } from "../../lib/firebase/role-guard";
import ListeningTestCreator from "./CreateMockTest/ListeningTestCreator/page";
import ReadingTestCreator from "./CreateMockTest/ReadingTestCreator/page";
import WritingTestCreator from "./CreateMockTest/WritingTestCreator/page";

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

// Render sidebar item
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

// Render sidebar section
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

// Render primary action button
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

// Render creator dashboard shell
export default function CreatorPage() {
  const router = useRouter();
  const isAuthorized = useRequireRole("creator");
  const listeningTestCreatorRef = useRef(null);
  const readingTestCreatorRef = useRef(null);
  const writingTestCreatorRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSectionKey, setOpenSectionKey] = useState("mock-exams");
  const [activeItemKey, setActiveItemKey] = useState("reading-test");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [themeMode, setThemeMode] = useState("dark");

  const activeItem = allSidebarItems.find((item) => item.key === activeItemKey);

  useEffect(() => {
    const savedTheme =
      typeof window !== "undefined"
        ? window.localStorage.getItem("creator-theme-mode")
        : "";

    if (savedTheme === "light" || savedTheme === "dark") {
      setThemeMode(savedTheme);
    }
  }, []);

  function handleToggleSection(sectionKey) {
    setOpenSectionKey((currentKey) =>
      currentKey === sectionKey ? "" : sectionKey
    );
  }

  function handleSelectItem(itemKey) {
    setActiveItemKey(itemKey);
  }

  function handleCreateNew() {
    if (activeItemKey === "reading-test") {
      readingTestCreatorRef.current?.openCreateNew();
      return;
    }

    if (activeItemKey === "writing-test") {
      writingTestCreatorRef.current?.openCreateNew();
      return;
    }

    if (activeItemKey === "listening-test") {
      listeningTestCreatorRef.current?.openCreateNew();
    }
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("[Creator] Logout failed:", error);
      setIsLoggingOut(false);
    }
  }

  function handleToggleTheme() {
    setThemeMode((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";

      if (typeof window !== "undefined") {
        window.localStorage.setItem("creator-theme-mode", nextTheme);
      }

      return nextTheme;
    });
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div
      data-theme={themeMode}
      className="flex min-h-screen bg-base-200 text-base-content"
    >
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

          <div className="mt-auto pt-4">
            <button
              type="button"
              title={isCollapsed ? "Toggle theme" : undefined}
              className="mb-3 flex w-full items-center rounded-xl border border-base-300 bg-base-100 px-3 py-3 text-left font-semibold text-base-content transition hover:bg-base-200"
              onClick={handleToggleTheme}
            >
              {themeMode === "dark" ? (
                <SunIcon className="h-5 w-5 shrink-0" />
              ) : (
                <MoonIcon className="h-5 w-5 shrink-0" />
              )}
              {!isCollapsed && (
                <span className="ml-3">
                  {themeMode === "dark" ? "Light mode" : "Dark mode"}
                </span>
              )}
            </button>

            <button
              type="button"
              title={isCollapsed ? "Logout" : undefined}
              className="w-full rounded-xl px-3 py-3 text-left font-semibold transition"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: "0.75rem",
                border: "1px solid #b42318",
                backgroundColor: "#7a0f0f",
                color: "#ffe2e0",
              }}
              onClick={handleLogout}
              disabled={isLoggingOut}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = "#991b1b";
                event.currentTarget.style.borderColor = "#dc2626";
                event.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = "#7a0f0f";
                event.currentTarget.style.borderColor = "#b42318";
                event.currentTarget.style.color = "#ffe2e0";
              }}
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 shrink-0" />
              {!isCollapsed && (
                <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto">
        <div className="min-h-screen p-6 md:p-8">
          <section className="flex min-h-[calc(100vh-4rem)] flex-col">
            <header className="mb-8 flex items-center justify-between gap-4">
              <h1 className="text-3xl font-semibold tracking-tight">
                {activeItem?.label || "Creator Dashboard"}
              </h1>

              {activeItemKey === "reading-test" ||
              activeItemKey === "writing-test" ||
              activeItemKey === "listening-test" ? (
                <CreatorActionButton onClick={handleCreateNew}>
                  <PlusIcon className="h-5 w-5" />
                  <span>Create New</span>
                </CreatorActionButton>
              ) : null}
            </header>

            {activeItemKey === "reading-test" ? (
              <ReadingTestCreator
                ref={readingTestCreatorRef}
                isSidebarCollapsed={isCollapsed}
                themeMode={themeMode}
              />
            ) : activeItemKey === "listening-test" ? (
              <ListeningTestCreator
                ref={listeningTestCreatorRef}
                themeMode={themeMode}
              />
            ) : activeItemKey === "writing-test" ? (
              <WritingTestCreator
                ref={writingTestCreatorRef}
                themeMode={themeMode}
              />
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

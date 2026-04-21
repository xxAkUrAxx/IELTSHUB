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
} from "@heroicons/react/24/outline";
import { useRequireRole } from "../../lib/firebase/role-guard";

const mockTestItems = [
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
    key: "listening",
    label: "Listening",
    icon: MusicalNoteIcon,
  },
  {
    key: "speaking",
    label: "Speaking",
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
    key: "listening",
    label: "Listening",
    icon: MusicalNoteIcon,
  },
  {
    key: "speed-typing",
    label: "Speed Typing",
    icon: ClockIcon,
  },
];

function SidebarItem({ label, icon: Icon, isCollapsed, onClick, nested = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`btn btn-ghost h-12 justify-start rounded-xl px-3 normal-case text-base-content/70 transition hover:bg-base-200 hover:text-base-content ${
        nested ? "text-sm" : ""
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function SidebarSection({
  label,
  icon: Icon,
  items,
  isCollapsed,
  isOpen,
  onToggle,
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
              label={item.label}
              icon={item.icon}
              isCollapsed={isCollapsed}
              onClick={() => {}}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreatorPage() {
  const isAuthorized = useRequireRole("creator");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMockOpen, setIsMockOpen] = useState(true);
  const [isPracticeOpen, setIsPracticeOpen] = useState(true);

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-base-200 text-base-content">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-base-300 bg-base-100/95 backdrop-blur transition-all duration-300 ${
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
              onToggle={() => setIsMockOpen((current) => !current)}
            />

            <SidebarSection
              label="Create Practice Activity"
              icon={ClipboardDocumentCheckIcon}
              items={practiceActivityItems}
              isCollapsed={isCollapsed}
              isOpen={isPracticeOpen}
              onToggle={() => setIsPracticeOpen((current) => !current)}
            />
          </nav>
        </div>
      </aside>

      <main className="flex-1" />
    </div>
  );
}

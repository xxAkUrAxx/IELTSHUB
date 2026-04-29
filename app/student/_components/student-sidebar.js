"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AcademicCapIcon,
  ArrowLeftEndOnRectangleIcon,
  Bars3Icon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  ComputerDesktopIcon,
  HomeIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  MusicalNoteIcon,
  MoonIcon,
  PencilSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SunIcon,
} from "@heroicons/react/24/outline";

const practiceItems = [
  {
    href: "/student/practice/grammar",
    label: "Grammar Practice",
    icon: AcademicCapIcon,
    exact: true,
  },
  {
    href: "/student/practice/listening",
    label: "Listening Practice",
    icon: MusicalNoteIcon,
    exact: true,
  },
  {
    href: "/student/practice/speed",
    label: "Speed Typing",
    icon: PencilSquareIcon,
    exact: true,
  },
];

const mockExamItems = [
  {
    href: "/student/mock-exams/listening",
    label: "Listening",
    icon: SpeakerWaveIcon,
    exact: false,
  },
  {
    href: "/student/mock-exams/reading",
    label: "Reading",
    icon: BookOpenIcon,
    exact: false,
  },
  {
    href: "/student/mock-exams/writing",
    label: "Writing",
    icon: PencilSquareIcon,
    exact: false,
  },
  {
    href: "/student/mock-exams/speaking",
    label: "Speaking",
    icon: MicrophoneIcon,
    exact: false,
  },
];

const primaryItems = [
  {
    href: "/student",
    label: "Home Dashboard",
    icon: HomeIcon,
    exact: true,
  },
];

function isItemActive(pathname, href, exact = false) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ href, icon: Icon, label, isCollapsed, isActive, nested }) {
  return (
    <Link
      href={href}
      className={`btn btn-ghost h-12 justify-start rounded-xl px-3 normal-case ${
        isActive ? "bg-base-100 text-primary shadow-sm" : "text-base-content/75"
      } ${nested ? "text-sm" : ""}`}
      title={isCollapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function SidebarSection({
  label,
  icon: Icon,
  isCollapsed,
  isOpen,
  isActive,
  onToggle,
  children,
}) {
  return (
    <div className="mt-2 flex flex-col gap-1">
      <button
        type="button"
        className={`flex h-12 items-center rounded-xl px-3 ${
          isActive || isOpen ? "bg-base-200 text-base-content" : "text-base-content/75"
        }`}
        title={isCollapsed ? label : undefined}
        onClick={onToggle}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && (
          <>
            <span className="ml-3 flex-1 truncate font-medium">{label}</span>
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
          {children}
        </div>
      )}
    </div>
  );
}

export default function StudentSidebar({
  themeMode = "dark",
  onToggleTheme,
}) {
  const pathname = usePathname();
  const isPracticeRouteActive =
    pathname === "/student/practice" || pathname.startsWith("/student/practice/");
  const isMockRouteActive =
    pathname === "/student/mock-exams" || pathname.startsWith("/student/mock-exams/");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPracticeOpen, setIsPracticeOpen] = useState(isPracticeRouteActive);
  const [isMockOpen, setIsMockOpen] = useState(isMockRouteActive);

  useEffect(() => {
    if (isPracticeRouteActive) {
      setIsPracticeOpen(true);
    }

    if (isMockRouteActive) {
      setIsMockOpen(true);
    }
  }, [isMockRouteActive, isPracticeRouteActive]);

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-base-300 bg-base-100/95 backdrop-blur ${
        isCollapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="flex items-center justify-between border-b border-base-300 px-4 py-4">
        {!isCollapsed && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Student
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
          <Bars3Icon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {primaryItems.map((item) => (
            <SidebarLink
              key={item.href}
              {...item}
              isCollapsed={isCollapsed}
              isActive={isItemActive(pathname, item.href, item.exact)}
            />
          ))}

          <SidebarSection
            label="Mock Exams"
            icon={ComputerDesktopIcon}
            isCollapsed={isCollapsed}
            isOpen={isMockOpen}
            isActive={isMockRouteActive}
            onToggle={() => setIsMockOpen((current) => !current)}
          >
            {mockExamItems.map((item) => (
              <SidebarLink
                key={`${item.href}-${item.label}`}
                {...item}
                isCollapsed={isCollapsed}
                isActive={isItemActive(pathname, item.href, item.exact)}
                nested
              />
            ))}
          </SidebarSection>

          <SidebarSection
            label="Practice"
            icon={ClipboardDocumentCheckIcon}
            isCollapsed={isCollapsed}
            isOpen={isPracticeOpen}
            isActive={isPracticeRouteActive}
            onToggle={() => setIsPracticeOpen((current) => !current)}
          >
            {practiceItems.map((item) => (
              <SidebarLink
                key={item.href}
                {...item}
                isCollapsed={isCollapsed}
                isActive={isItemActive(pathname, item.href, item.exact)}
                nested
              />
            ))}
          </SidebarSection>
        </nav>

        <div className="mt-auto pt-4">
          <button
            type="button"
            title={isCollapsed ? "Toggle theme" : undefined}
            className="mb-3 flex w-full items-center rounded-xl border border-base-300 bg-base-100 px-3 py-3 text-left font-semibold text-base-content transition hover:bg-base-200"
            onClick={onToggleTheme}
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
            className="btn btn-ghost h-12 w-full justify-start rounded-xl px-3 normal-case text-base-content/75"
            title={isCollapsed ? "Logout" : undefined}
          >
            <ArrowLeftEndOnRectangleIcon className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

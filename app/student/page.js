"use client";

import { useState } from "react";
import {
  AcademicCapIcon,
  ArrowLeftEndOnRectangleIcon,
  Bars3Icon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ComputerDesktopIcon,
  HomeIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  PencilSquareIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import { useRequireRole } from "../../lib/firebase/role-guard";
import TestMode from "./_components/test-mode";

const practiceItems = [
  {
    label: "Grammar Practice",
    icon: AcademicCapIcon,
  },
  {
    label: "Listening Practice",
    icon: MusicalNoteIcon,
  },
  {
    label: "Speed Typing",
    icon: PencilSquareIcon,
  },
];

const mockItems = [
  {
    key: "listening",
    label: "Listening",
    icon: SpeakerWaveIcon,
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
    key: "speaking",
    label: "Speaking",
    icon: MicrophoneIcon,
  },
];

const mockTests = [
  {
    id: "listening-test-1",
    type: "listening",
    title: "Listening Test 1",
    difficulty: "Easy",
    icon: SpeakerWaveIcon,
    completed: false,
  },
  {
    id: "reading-test-1",
    type: "reading",
    title: "Reading Test 1",
    difficulty: "Medium",
    icon: BookOpenIcon,
    completed: false,
  },
  {
    id: "writing-test-1",
    type: "writing",
    title: "Writing Test 1",
    difficulty: "Hard",
    icon: PencilSquareIcon,
    completed: false,
  },
  {
    id: "speaking-test-1",
    type: "speaking",
    title: "Speaking Test 1",
    difficulty: "Medium",
    icon: MicrophoneIcon,
    completed: true,
    score: 6.5,
  },
];

function SidebarButton({
  label,
  icon: Icon,
  isCollapsed,
  isActive,
  onClick,
  nested,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn btn-ghost h-12 justify-start rounded-xl px-3 normal-case ${
        isActive ? "bg-base-100 text-primary shadow-sm" : "text-base-content/75"
      } ${nested ? "text-sm" : ""}`}
      title={isCollapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
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
        onClick={onToggle}
        className={`flex h-12 items-center rounded-xl px-3 ${
          isActive || isOpen ? "bg-base-200 text-base-content" : "text-base-content/75"
        }`}
        title={isCollapsed ? label : undefined}
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

function TestCard({
  title,
  difficulty,
  icon: Icon,
  completed = false,
  score,
  onStart,
}) {
  function handleReview() {
    window.alert("Review coming soon");
  }

  return (
    <div
      className={`card border bg-base-100 shadow-sm ${
        completed ? "border-success/40 shadow-success/10" : "border-base-300"
      }`}
    >
      <div className="card-body gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="card-title text-xl">{title}</h2>
            {completed ? (
              <div className="badge badge-success badge-outline">Completed</div>
            ) : (
              <div className="badge badge-outline">{difficulty}</div>
            )}
          </div>

          <div className="flex items-start gap-3">
            {completed ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-success/30 bg-success/10 text-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-success">
                    Band
                  </p>
                  <p className="text-lg font-bold text-success">{score}</p>
                </div>
              </div>
            ) : null}

            <div
              className={`rounded-2xl p-3 ${
                completed ? "bg-success/10 text-success" : "bg-base-200 text-base-content/75"
              }`}
            >
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </div>

        {completed ? (
          <div className="card-actions justify-end">
            <button type="button" className="btn btn-outline" onClick={handleReview}>
              Review
            </button>
            <button type="button" className="btn btn-success">
              Retake
            </button>
          </div>
        ) : (
          <div className="card-actions justify-end">
            <button type="button" className="btn btn-primary" onClick={onStart}>
              Start
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MockExamContent({ activeMockSection, onStartTest }) {
  if (activeMockSection) {
    const filteredTests = mockTests.filter(
      (test) => test.type === activeMockSection
    );
    const selectedSection =
      activeMockSection.charAt(0).toUpperCase() + activeMockSection.slice(1);

    return (
      <section className="flex min-h-[calc(100vh-4rem)] flex-col">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Mock Exams</h1>
        </header>

        <div className="flex flex-1 items-center justify-center">
          {filteredTests.length > 0 ? (
            <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
              {filteredTests.map((card) => (
                <TestCard
                  key={card.id}
                  {...card}
                  onStart={() =>
                    onStartTest({
                      id: card.id,
                      type: card.type,
                      title: card.title,
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
              <h1 className="mb-2 text-3xl font-semibold tracking-tight">
                {selectedSection}
              </h1>
              <p className="text-base-content/65">Coming Soon</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
        <p className="text-lg font-medium text-base-content/65">
          Select a mock exam section from the sidebar.
        </p>
      </div>
    </section>
  );
}

export default function StudentPage() {
  const isAuthorized = useRequireRole("student");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [isMockOpen, setIsMockOpen] = useState(false);
  const [activeMockSection, setActiveMockSection] = useState("");
  const [currentTest, setCurrentTest] = useState(null);
  const [isTestStarted, setIsTestStarted] = useState(false);

  function handleSelectTest(test) {
    setCurrentTest(test);
    setIsTestStarted(false);
  }

  if (!isAuthorized) {
    return null;
  }

  if (currentTest && !isTestStarted) {
    return (
      <TestMode
        testTitle={currentTest.title}
        onStartTest={() => setIsTestStarted(true)}
      />
    );
  }

  if (currentTest && isTestStarted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200 px-6 py-10">
        <div className="card w-full max-w-3xl border border-base-300 bg-base-100 shadow-lg">
          <div className="card-body items-center gap-4 p-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
              Test Mode
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {currentTest.title} Loaded
            </h1>
            <p className="max-w-xl text-base leading-7 text-base-content/70">
              {currentTest.type.charAt(0).toUpperCase() + currentTest.type.slice(1)}{" "}
              test content will appear here next.
            </p>
          </div>
        </div>
      </main>
    );
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
            <SidebarButton
              label="Home Dashboard"
              icon={HomeIcon}
              isCollapsed={isCollapsed}
              isActive={!activeMockSection}
              onClick={() => setActiveMockSection("")}
            />

            <SidebarSection
              label="Mock Exams"
              icon={ComputerDesktopIcon}
              isCollapsed={isCollapsed}
              isOpen={isMockOpen}
              isActive={!!activeMockSection}
              onToggle={() => setIsMockOpen((current) => !current)}
            >
              {mockItems.map((item) => (
                <SidebarButton
                  key={item.key}
                  label={item.label}
                  icon={item.icon}
                  isCollapsed={isCollapsed}
                  isActive={activeMockSection === item.key}
                  onClick={() => setActiveMockSection(item.key)}
                  nested
                />
              ))}
            </SidebarSection>

            <SidebarSection
              label="Practice"
              icon={ClipboardDocumentCheckIcon}
              isCollapsed={isCollapsed}
              isOpen={isPracticeOpen}
              isActive={false}
              onToggle={() => setIsPracticeOpen((current) => !current)}
            >
              {practiceItems.map((item) => (
                <SidebarButton
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  isCollapsed={isCollapsed}
                  isActive={false}
                  onClick={() => {}}
                  nested
                />
              ))}
            </SidebarSection>
          </nav>

          <div className="mt-auto pt-4">
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

      <main className="flex-1 overflow-x-auto">
        <div className="min-h-screen p-6 md:p-8">
          <MockExamContent
            activeMockSection={activeMockSection}
            onStartTest={handleSelectTest}
          />
        </div>
      </main>
    </div>
  );
}

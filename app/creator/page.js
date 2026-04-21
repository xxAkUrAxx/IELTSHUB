"use client";

import {
  AcademicCapIcon,
  BookOpenIcon,
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
    label: "Reading",
    icon: BookOpenIcon,
  },
  {
    label: "Writing",
    icon: PencilSquareIcon,
  },
  {
    label: "Listening",
    icon: MusicalNoteIcon,
  },
  {
    label: "Speaking",
    icon: MicrophoneIcon,
  },
];

const practiceActivityItems = [
  {
    label: "Grammar",
    icon: AcademicCapIcon,
  },
  {
    label: "Listening",
    icon: MusicalNoteIcon,
  },
  {
    label: "Speed Typing",
    icon: ClockIcon,
  },
];

function CreatorSectionCard({ title, description, icon: Icon, items }) {
  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-6 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
              Creator Tools
            </p>
            <h2 className="card-title text-2xl font-semibold tracking-tight">
              {title}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-base-content/65">
              {description}
            </p>
          </div>

          <div className="rounded-2xl bg-base-200 p-3 text-base-content/75">
            <Icon className="h-6 w-6" />
          </div>
        </div>

        <div className="grid gap-3">
          {items.map((item) => {
            const ItemIcon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                className="btn h-auto min-h-0 justify-between rounded-2xl border border-base-300 bg-base-100 px-4 py-4 text-left normal-case shadow-none transition hover:border-primary/30 hover:bg-base-200"
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-xl bg-base-200 p-2 text-base-content/75">
                    <ItemIcon className="h-5 w-5" />
                  </span>
                  <span className="text-base font-medium text-base-content">
                    {item.label}
                  </span>
                </span>
                <ChevronRightIcon className="h-5 w-5 text-base-content/40" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function CreatorPage() {
  const isAuthorized = useRequireRole("creator");

  if (!isAuthorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-base-200 px-6 py-8 text-base-content md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-base-300 bg-base-100 shadow-sm">
          <div className="flex flex-col gap-4 p-6 md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
                Creator
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Content Dashboard
              </h1>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-base-content/65 md:text-base">
              Choose a content type to start building new mock tests or practice
              activities. This page is UI-only for now and follows the student
              dashboard layout, spacing, colors, and card structure.
            </p>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-2">
          <CreatorSectionCard
            title="Create Mock Test"
            description="Set up IELTS-style mock test content for each core skill area."
            icon={ComputerDesktopIcon}
            items={mockTestItems}
          />

          <CreatorSectionCard
            title="Create Practice Activity"
            description="Prepare targeted practice activities for focused student improvement."
            icon={ClipboardDocumentCheckIcon}
            items={practiceActivityItems}
          />
        </div>
      </div>
    </main>
  );
}

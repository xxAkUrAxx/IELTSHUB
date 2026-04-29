import StudentShell from "./_components/student-shell";

export default function StudentPage() {
  return (
    <StudentShell>
      <section className="flex min-h-[calc(100vh-4rem)] flex-col">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Home Dashboard
          </h1>
        </header>

        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
            <p className="text-2xl font-semibold">Tracking metrics coming soon</p>
          </div>
        </div>
      </section>
    </StudentShell>
  );
}

import StudentPageHeader from "./student-page-header";

export default function StudentPagePlaceholder({ title }) {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col">
      <StudentPageHeader title={title} />

      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-10 py-12 text-center shadow-sm">
          <p className="text-2xl font-semibold">Coming Soon</p>
        </div>
      </div>
    </section>
  );
}

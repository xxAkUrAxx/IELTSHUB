import StudentSidebar from "./_components/student-sidebar";

export default function StudentLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-base-200 text-base-content">
      <StudentSidebar />
      <main className="flex-1 overflow-x-auto">
        <div className="min-h-screen p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}

import MockExamGrid from "../_components/mock-exam-grid";
import StudentShell from "../_components/student-shell";

export default function StudentMockExamsPage() {
  return (
    <StudentShell>
      <MockExamGrid heading="Mock Exams" />
    </StudentShell>
  );
}

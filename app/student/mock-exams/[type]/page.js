"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import MockExamGrid from "../../_components/mock-exam-grid";
import StudentShell from "../../_components/student-shell";

function getHeadingForType(testType) {
  if (!testType) {
    return "Mock Exams";
  }

  return `${testType.charAt(0).toUpperCase()}${testType.slice(1)} Tests`;
}

export default function StudentMockExamTypePage() {
  const params = useParams();
  const testType = useMemo(() => String(params?.type || "").toLowerCase(), [params]);

  return (
    <StudentShell>
      <MockExamGrid heading={getHeadingForType(testType)} testType={testType} />
    </StudentShell>
  );
}

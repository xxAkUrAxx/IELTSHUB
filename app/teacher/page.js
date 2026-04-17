"use client";

import { useRequireRole } from "../../lib/firebase/role-guard";

export default function TeacherPage() {
  const isAuthorized = useRequireRole("teacher");

  if (!isAuthorized) {
    return null;
  }

  return <div>Welcome to Teacher Page</div>;
}

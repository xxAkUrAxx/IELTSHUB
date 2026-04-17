"use client";

import { useRequireRole } from "../../lib/firebase/role-guard";

export default function StudentPage() {
  const isAuthorized = useRequireRole("student");

  if (!isAuthorized) {
    return null;
  }

  return <div>Welcome to Student Page</div>;
}

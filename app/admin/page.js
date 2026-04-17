"use client";

import { useRequireRole } from "../../lib/firebase/role-guard";

export default function AdminPage() {
  const isAuthorized = useRequireRole("admin");

  if (!isAuthorized) {
    return null;
  }

  return <div>Welcome to Admin Page</div>;
}

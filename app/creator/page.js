"use client";

import { useRequireRole } from "../../lib/firebase/role-guard";

export default function CreatorPage() {
  const isAuthorized = useRequireRole("creator");

  if (!isAuthorized) {
    return null;
  }

  return <div>Welcome to Creator Page</div>;
}

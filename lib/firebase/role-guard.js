"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

export function useRequireRole(expectedRole) {
  const router = useRouter();
  const { isLoading, user, role } = useAuth();

  useEffect(() => {
    if (!isLoading && (!user || role !== expectedRole)) {
      router.replace("/login");
    }
  }, [expectedRole, isLoading, role, router, user]);

  return !isLoading && !!user && role === expectedRole;
}

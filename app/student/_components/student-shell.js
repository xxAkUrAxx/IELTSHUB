"use client";

import { useEffect, useState } from "react";
import StudentSidebar from "./student-sidebar";
import { useRequireRole } from "../../../lib/firebase/role-guard";

export default function StudentShell({ children }) {
  const isAuthorized = useRequireRole("student");
  const [themeMode, setThemeMode] = useState("dark");

  useEffect(() => {
    const savedTheme =
      typeof window !== "undefined"
        ? window.localStorage.getItem("student-theme-mode")
        : "";

    if (savedTheme === "light" || savedTheme === "dark") {
      setThemeMode(savedTheme);
    }
  }, []);

  function handleToggleTheme() {
    setThemeMode((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";

      if (typeof window !== "undefined") {
        window.localStorage.setItem("student-theme-mode", nextTheme);
      }

      return nextTheme;
    });
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div
      data-theme={themeMode}
      className="flex min-h-screen bg-base-200 text-base-content"
    >
      <StudentSidebar
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
      />
      <main className="flex-1 overflow-x-auto">
        <div className="min-h-screen p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}

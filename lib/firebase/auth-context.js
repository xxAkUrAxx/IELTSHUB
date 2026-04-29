"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "./config";
import { getUserRole } from "./users";

const AuthContext = createContext({
  isLoading: true,
  user: null,
  role: null,
});

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState({
    isLoading: true,
    user: null,
    role: null,
  });

  useEffect(() => {
    let isActive = true;

    if (!auth) {
      console.error("[Auth] Firebase auth is not configured.");

      if (isActive) {
        setAuthState({
          isLoading: false,
          user: null,
          role: null,
        });
      }

      return () => {
        isActive = false;
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!isActive) {
          return;
        }

        setAuthState({
          isLoading: false,
          user: null,
          role: null,
        });

        if (pathname !== "/login") {
          router.replace("/login");
        }

        return;
      }

      try {
        console.log("[Auth] Auth state changed. UID:", user.uid);
        console.log(`[Auth] Fetching Firestore user document: users/${user.uid}`);
        const userData = await getUserRole(user.uid);

        console.log("[Auth] Firestore document data:", userData);

        if (!userData) {
          console.error(
            `[Auth] Firestore document not found for users/${user.uid}.`
          );

          if (!isActive) {
            return;
          }

          setAuthState({
            isLoading: false,
            user: null,
            role: null,
          });
          router.replace("/login");
          return;
        }

        const role =
          typeof userData.role === "string" ? userData.role.trim() : null;

        console.log("[Auth] Resolved role:", role);

        if (!isActive) {
          return;
        }

        setAuthState({
          isLoading: false,
          user,
          role,
        });

        if (!role) {
          console.error(`[Auth] Role is missing in users/${user.uid}.`, userData);
        }
      } catch (error) {
        console.error("[Auth] Failed to load Firestore role data:", error);

        if (!isActive) {
          return;
        }

        setAuthState({
          isLoading: false,
          user: null,
          role: null,
        });
        router.replace("/login");
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

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
  profile: null,
});

async function loadUserProfile(uid) {
  if (!uid) {
    return null;
  }

  console.log(`[Auth] Fetching Firestore user document: users/${uid}`);
  const userData = await getUserRole(uid);
  console.log("[Auth] Firestore document data:", userData);
  return userData;
}

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState({
    isLoading: true,
    user: null,
    role: null,
    profile: null,
  });

  useEffect(() => {
    let isActive = true;
    let refreshTimeoutId = null;

    if (!auth) {
      console.error("[Auth] Firebase auth is not configured.");

      if (isActive) {
        setAuthState({
          isLoading: false,
          user: null,
          role: null,
          profile: null,
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
          profile: null,
        });

        if (pathname !== "/login") {
          router.replace("/login");
        }

        return;
      }

      try {
        console.log("[Auth] Auth state changed. UID:", user.uid);
        const userData = await loadUserProfile(user.uid);

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
            profile: null,
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
          profile: userData,
        });

        refreshTimeoutId = window.setTimeout(async () => {
          try {
            const refreshedUserData = await loadUserProfile(user.uid);

            if (!isActive || !refreshedUserData) {
              return;
            }

            const refreshedRole =
              typeof refreshedUserData.role === "string"
                ? refreshedUserData.role.trim()
                : null;

            setAuthState({
              isLoading: false,
              user,
              role: refreshedRole,
              profile: refreshedUserData,
            });
          } catch (refreshError) {
            console.error(
              "[Auth] Delayed Firestore profile refresh failed:",
              refreshError
            );
          }
        }, 5000);

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
          profile: null,
        });
        router.replace("/login");
      }
    });

    return () => {
      isActive = false;
      if (refreshTimeoutId) {
        window.clearTimeout(refreshTimeoutId);
      }
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

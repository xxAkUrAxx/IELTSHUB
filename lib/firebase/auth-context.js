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
        const userData = await getUserRole(user.uid);
        const role = userData?.role ?? null;

        if (!isActive) {
          return;
        }

        setAuthState({
          isLoading: false,
          user,
          role,
        });
      } catch {
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

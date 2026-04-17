"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "./config";

export function useRequireRole(expectedRole) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isActive = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isActive) {
          setIsAuthorized(false);
          router.replace("/login");
        }
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userDocRef);
        const role = userSnapshot.exists() ? userSnapshot.data()?.role : null;

        if (!isActive) {
          return;
        }

        if (!role || role !== expectedRole) {
          setIsAuthorized(false);
          router.replace("/login");
          return;
        }

        setIsAuthorized(true);
      } catch {
        if (isActive) {
          setIsAuthorized(false);
          router.replace("/login");
        }
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [expectedRole, router]);

  return isAuthorized;
}

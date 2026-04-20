"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase/config";
import { getUserRole } from "../../lib/firebase/users";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState("light");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const uid = user?.uid;

      console.log("[Login] Firebase authentication succeeded.");
      console.log("[Login] Authenticated user UID:", uid);

      if (!uid) {
        throw new Error("User uid not found after login.");
      }

      console.log(`[Login] Fetching Firestore user document: users/${uid}`);
      const userData = await getUserRole(uid);

      console.log("[Login] Firestore document data:", userData);

      if (!userData) {
        console.error(
          `[Login] Firestore document not found for users/${uid}.`
        );
        throw new Error("User document not found.");
      }

      const role =
        typeof userData.role === "string" ? userData.role.trim() : undefined;

      console.log("[Login] Resolved role:", role);

      if (!role) {
        console.error(`[Login] Role is missing in users/${uid}.`, userData);
        throw new Error("User role not found.");
      }

      if (role === "admin") {
        console.log("[Login] Routing to /admin");
        router.replace("/admin");
        return;
      }

      if (role === "student") {
        console.log("[Login] Routing to /student");
        router.replace("/student");
        return;
      }

      if (role === "teacher") {
        console.log("[Login] Routing to /teacher");
        router.replace("/teacher");
        return;
      }

      if (role === "creator") {
        console.log("[Login] Routing to /creator");
        router.replace("/creator");
        return;
      }

      console.error(`[Login] Unsupported role "${role}" for users/${uid}.`);
      throw new Error("No valid role found for this user.");
    } catch (loginError) {
      console.error("[Login] Login flow failed:", loginError);

      if (
        loginError?.message === "User document not found." ||
        loginError?.message === "User role not found." ||
        loginError?.message === "No valid role found for this user."
      ) {
        setError("User role not found.");
        return;
      }

      setError("Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main data-theme={theme} className="hero min-h-screen bg-base-200">
      <div className="hero-content w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="card w-full bg-base-100 shadow-xl"
        >
          <div className="card-body gap-4 rounded-box">
            <div className="card-actions justify-end">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setTheme((currentTheme) =>
                    currentTheme === "light" ? "dark" : "light"
                  )
                }
              >
                {theme === "light" ? "Dark" : "Light"} Mode
              </button>
            </div>

            <h1 className="card-title text-3xl">Login</h1>

            <label htmlFor="email" className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input input-bordered w-full"
              required
            />

            <label htmlFor="password" className="label">
              <span className="label-text">Password</span>
            </label>
          <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input input-bordered w-full"
              required
            />

            {error ? <p className="text-error">{error}</p> : null}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

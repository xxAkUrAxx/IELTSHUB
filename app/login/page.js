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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <form onSubmit={handleSubmit} className="space-y-4 rounded border p-6">
        <h1 className="text-2xl font-semibold">Login</h1>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          className="rounded border px-4 py-2"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}

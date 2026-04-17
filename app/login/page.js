"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase/config";

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

      console.log("Login success");
      console.log("UID:", user.uid);

      const currentUser = auth.currentUser;
      const uid = currentUser?.uid;

      if (!uid) {
        throw new Error("User uid not found after login.");
      }

      console.log("Fetching user doc...");

      const userDocRef = doc(db, "users", uid);
      const docSnap = await getDoc(userDocRef);
      const documentExists = docSnap.exists();
      const role = documentExists ? docSnap.data()?.role : undefined;

      console.log("Doc exists:", docSnap.exists());
      console.log("Data:", docSnap.data());

      if (!documentExists) {
        console.error("User document does not exist for uid:", uid);
        throw new Error("User document not found.");
      }

      if (!role) {
        console.error("Role is missing for uid:", uid);
        throw new Error("User role not found.");
      }

      if (role === "admin") {
        router.push("/admin");
        return;
      }

      if (role === "student") {
        router.push("/student");
        return;
      }

      if (role === "teacher") {
        router.push("/teacher");
        return;
      }

      if (role === "creator") {
        router.push("/creator");
        return;
      }

      throw new Error("No valid role found for this user.");
    } catch (loginError) {
      console.log("ERROR:", loginError);
      setError("Invalid email or password.");

      if (
        loginError?.message === "User document not found." ||
        loginError?.message === "User role not found." ||
        loginError?.message === "No valid role found for this user."
      ) {
        setError("User role not found.");
      }
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

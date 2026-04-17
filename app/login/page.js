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

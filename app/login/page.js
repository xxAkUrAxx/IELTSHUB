import { auth } from "../../lib/firebase/config";

export default function LoginPage() {
  void auth;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="space-y-4 rounded border p-6">
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
            className="w-full rounded border px-3 py-2"
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
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <button type="button" className="rounded border px-4 py-2">
          Login
        </button>
      </div>
    </main>
  );
}

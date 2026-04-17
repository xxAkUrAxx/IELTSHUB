import "./globals.css";
import { AuthProvider } from "../lib/firebase/auth-context";

export const metadata = {
  title: "IELTSHUB",
  description: "Next.js app for IELTSHUB",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

import "./globals.css";

export const metadata = {
  title: "IELTSHUB",
  description: "Next.js app for IELTSHUB",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

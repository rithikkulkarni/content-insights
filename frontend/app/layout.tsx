import type { Metadata } from "next";
import "../styles/index.css";

export const metadata: Metadata = {
  title: "Content Insights",
  description: "AI-powered creator analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

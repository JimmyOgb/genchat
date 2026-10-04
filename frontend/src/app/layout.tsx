import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenChat — Fast AI Conversations with GenLayer Verification",
  description:
    "Ask anything. Get a fast answer. Verify important decisions with independent GenLayer AI consensus.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}

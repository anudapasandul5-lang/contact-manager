import "@/env";
import type { Metadata } from "next";
import "./globals.css";
import { FloatingAddButton } from "@/components/shared/FloatingAddButton";
import { QueryProvider } from "@/lib/query/QueryProvider";

export const metadata: Metadata = {
  title: "Contact Manager",
  description: "Mind map network visualizer for your contacts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
      style={{ fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" }}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <QueryProvider>
          {children}
          <FloatingAddButton />
        </QueryProvider>
      </body>
    </html>
  );
}

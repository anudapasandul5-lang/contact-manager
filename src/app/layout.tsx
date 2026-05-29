import "@/env";
import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { FloatingAddButton } from "@/components/shared/FloatingAddButton";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { CommandPaletteProvider } from "@/components/command-palette/CommandPaletteProvider";
import { ServiceWorkerRegistrar } from "@/components/shared/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Contact Manager",
  description: "Mind map network visualizer for your contacts",
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Contacts',
  },
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
          <CommandPaletteProvider>
            {children}
            <FloatingAddButton />
          </CommandPaletteProvider>
        </QueryProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}

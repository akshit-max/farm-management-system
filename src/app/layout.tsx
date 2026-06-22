import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Farm ERP",
  description: "Premium Farm Management System",
  manifest: "/manifest.json",
};

import AuthProvider from "@/providers/SessionProvider";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  let theme = "light";

  if (session?.user?.id) {
    try {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { farm: { select: { settings: true } } }
      });
      if (user?.farm?.settings?.theme) {
        theme = user.farm.settings.theme;
      }
    } catch (e) {
      // Ignore DB error during build or startup
    }
  }

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      data-theme={theme}
    >
      <body className="min-h-full flex flex-col bg-page-bg text-text-body">
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}

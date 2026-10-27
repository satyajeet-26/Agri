import React, { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { LanguageProvider } from "@/components/LanguageContext";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col bg-slate-100">
        <Navbar userRole="ADMIN" userName="Kendra Admin" />
        <div className="flex-1 flex flex-col lg:flex-row">
          <Suspense fallback={<div className="w-72 bg-slate-900" />}>
            <Sidebar />
          </Suspense>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
              }
            >
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </LanguageProvider>
  );
}

import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageContext";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bharathi Krushi Seva Kendra - Agriculture Consultancy System",
  description: "Comprehensive Agriculture Consultancy & Schedule Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        <LanguageProvider>
          {children}
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}

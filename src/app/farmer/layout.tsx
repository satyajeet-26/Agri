import React from "react";
import { LanguageProvider } from "@/components/LanguageContext";

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

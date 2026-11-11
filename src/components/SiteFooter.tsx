"use client";

import { Phone } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

const CONTACT_NUMBERS = ["9359257265", "8010736862"];

export function SiteFooter() {
  const { lang } = useLanguage();

  return (
    <footer className="border-t border-emerald-900 bg-emerald-950 px-4 py-6 text-center text-white">
      <p className="text-sm font-bold">
        {lang === "mr"
          ? "मदत हवी आहे? भारती कृषी सेवा केंद्राशी संपर्क साधा"
          : "Need Help? Contact Bharathi Krushi Seva Kendra"}
      </p>
      <p className="mt-1 text-xs text-emerald-100">
        {lang === "mr"
          ? "आमच्या कृषी सल्लागाराशी संपर्क साधा."
          : "Contact our agricultural advisor."}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {CONTACT_NUMBERS.map((number) => (
          <a
            key={number}
            href={`tel:${number}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-900 px-3 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-800"
          >
            <Phone className="h-4 w-4" />
            {number}
          </a>
        ))}
      </div>
    </footer>
  );
}

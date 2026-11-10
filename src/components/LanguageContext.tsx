"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { Language, translations } from "@/lib/translations";

const LANGUAGE_STORAGE_KEY = "agri_lang";
const languageListeners = new Set<() => void>();

function getLanguageSnapshot(): Language {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return saved === "mr" ? "mr" : "en";
}

function getServerLanguageSnapshot(): Language {
  return "en";
}

function subscribeToLanguage(listener: () => void) {
  languageListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    languageListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations["en"]) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  );

  useEffect(() => {
    document.documentElement.lang = lang === "mr" ? "mr" : "en";
  }, [lang]);

  const setLang = (newLang: Language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    languageListeners.forEach((listener) => listener());
  };

  const t = (key: keyof typeof translations["en"]) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

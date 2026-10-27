"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sprout, Globe, LogOut, User, Phone } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { ShopProfile } from "@/types";

interface NavbarProps {
  userRole?: "ADMIN" | "FARMER";
  userName?: string;
}

export function Navbar({ userRole = "ADMIN", userName }: NavbarProps) {
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();
  const [shop, setShop] = useState<ShopProfile | null>(null);

  useEffect(() => {
    fetch("/api/masters/general")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.shop) {
          setShop(res.data.shop);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("agri_user");
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-40 bg-emerald-800 text-white shadow-md border-b border-emerald-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Krushi Seva Kendra Logo */}
          <div className="flex items-center space-x-3">
            <Link
              href={userRole === "ADMIN" ? "/admin" : "/farmer"}
              className="flex items-center space-x-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <Sprout className="w-6 h-6 text-emerald-950" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight text-white group-hover:text-amber-200 transition-colors">
                  {shop?.name || "Shree Krushi Seva Kendra"}
                </span>
                <span className="text-xs text-emerald-200 font-medium hidden sm:inline">
                  {shop?.tagline || t("consultancySystem")}
                </span>
              </div>
            </Link>
          </div>

          {/* Right side controls: Language toggle, User role badge, Logout */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Language Switcher */}
            <div className="flex items-center bg-emerald-900/80 rounded-lg p-0.5 border border-emerald-700">
              <button
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  lang === "en"
                    ? "bg-amber-400 text-emerald-950 shadow-sm"
                    : "text-emerald-200 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("mr")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  lang === "mr"
                    ? "bg-amber-400 text-emerald-950 shadow-sm"
                    : "text-emerald-200 hover:text-white"
                }`}
              >
                मराठी
              </button>
            </div>

            {/* User Badge */}
            <div className="hidden md:flex items-center space-x-2 bg-emerald-700/60 px-3 py-1.5 rounded-lg border border-emerald-600/50">
              <User className="w-4 h-4 text-emerald-200" />
              <div className="text-left text-xs">
                <p className="font-semibold text-white leading-none">
                  {userName || (userRole === "ADMIN" ? "Admin" : "Farmer")}
                </p>
                <p className="text-[10px] text-amber-300 font-medium">
                  {userRole === "ADMIN" ? "Krushi Kendra Admin" : "Registered Farmer"}
                </p>
              </div>
            </div>

            {/* Contact / Help info */}
            {shop?.mobile && (
              <a
                href={`tel:${shop.mobile}`}
                className="hidden lg:flex items-center space-x-1 text-xs text-emerald-200 hover:text-white bg-emerald-900/50 px-2.5 py-1 rounded-md"
                title="Kendra Helpline"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>{shop.mobile}</span>
              </a>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm"
              title={t("logout")}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}


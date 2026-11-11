"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sprout, LogOut, User, Phone } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { ShopProfile } from "@/types";

interface NavbarProps {
  userRole?: "ADMIN" | "FARMER";
  userName?: string;
}

export function Navbar({ userRole = "ADMIN", userName }: NavbarProps) {
  const { lang, setLang, t } = useLanguage();
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    fetch("/api/masters/general")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.shop) {
          setShop(res.data.shop);
          setLogoError(false);
        }
      })
      .catch(() => {});
  }, []);

  const brandLogoSrc = shop?.logoUrl || "/logo.png";
  const brandName = shop?.name || "Bharathi Krushi Seva Kendra";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error: unknown) {
      console.error("Admin logout request failed:", error);
    } finally {
      localStorage.removeItem("agri_user");
      window.location.href = "/login";
    }
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
              <div className="w-12 h-12 rounded-full overflow-hidden bg-transparent ring-1 ring-white/20 shadow-inner group-hover:scale-105 transition-transform">
                {logoError ? (
                  <div className="w-full h-full bg-linear-to-br from-amber-400 to-emerald-500 flex items-center justify-center">
                    <Sprout className="w-5 h-5 text-emerald-950" />
                  </div>
                ) : (
                  <img
                    src={brandLogoSrc}
                    alt={`${brandName} logo`}
                    className="w-full h-full object-cover"
                    onError={() => setLogoError(true)}
                  />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight text-white group-hover:text-amber-200 transition-colors">
                  {brandName}
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
                  {userName || (userRole === "ADMIN" ? t("loginAdmin") : t("loginFarmer"))}
                </p>
                <p className="text-[10px] text-amber-300 font-medium">
                  {userRole === "ADMIN" ? t("kendraAdmin") : t("registeredFarmer")}
                </p>
              </div>
            </div>

            {/* Contact / Help info */}
            {shop?.mobile && (
              <a
                href={`tel:${shop.mobile}`}
                className="hidden lg:flex items-center space-x-1 text-xs text-emerald-200 hover:text-white bg-emerald-900/50 px-2.5 py-1 rounded-md"
                title={t("kendraHelpline")}
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

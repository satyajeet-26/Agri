"use client";

import React, { useState, useEffect } from "react";
import { User, Lock, ArrowRight } from "lucide-react";
import { ShopProfile } from "@/types";
import { useLanguage } from "@/components/LanguageContext";

export default function LoginPage() {
  const { lang, setLang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"farmer" | "admin">("farmer");
  const [username, setUsername] = useState("ramesh");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleTabSwitch = (tab: "farmer" | "admin") => {
    setActiveTab(tab);
    setError(null);
    if (tab === "farmer") {
      setUsername("ramesh");
      setPassword("");
    } else {
      setUsername("admin@krushi.com");
      setPassword("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          role: activeTab === "admin" ? "ADMIN" : "FARMER",
        }),
      });

      const json = await res.json();
      if (json.success) {
        localStorage.setItem(
          "agri_user",
          JSON.stringify({
            role: json.role,
            ...json.user,
          })
        );

        if (json.role === "ADMIN") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/farmer";
        }
      } else {
        setError(
          json.message ||
            json.error ||
            `Login failed (HTTP ${res.status}). Please try again or contact the administrator.`
        );
      }
    } catch {
      setError(t("loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-end">
          <div className="flex items-center rounded-lg border border-emerald-700 bg-emerald-900/80 p-0.5">
            <button
              type="button"
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                lang === "en" ? "bg-amber-400 text-emerald-950" : "text-emerald-200"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("mr")}
              aria-pressed={lang === "mr"}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                lang === "mr" ? "bg-amber-400 text-emerald-950" : "text-emerald-200"
              }`}
            >
              मराठी
            </button>
          </div>
        </div>
        {/* Brand & Krushi Seva Kendra Logo */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-transparent ring-1 ring-white/10 flex items-center justify-center mx-auto shadow-xl">
            {logoError ? (
              <span className="text-3xl" aria-label="Agriculture logo">🌾</span>
            ) : (
              <img
                src={shop?.logoUrl || "/logo.png"}
                alt={`${shop?.name || "Bharathi Krushi Seva Kendra"} logo`}
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
              />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {shop?.name || "Bharathi Krushi Seva Kendra"}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 font-medium">
            {shop?.tagline || (lang === "mr" ? "कृषी सल्लागार व पीक मार्गदर्शन प्रणाली" : "Agriculture Consultancy & Crop Advisory System")}
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 backdrop-blur-sm space-y-5">
          {/* Tab Switcher: Farmer vs Admin */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleTabSwitch("farmer")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "farmer"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              👨‍🌾 {t("loginFarmer")}
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch("admin")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "admin"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🏢 {t("loginAdmin")}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {activeTab === "farmer" ? t("usernameOrMobile") : t("adminEmail")}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={activeTab === "admin" ? "email" : "text"}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={activeTab === "farmer" ? "e.g. ramesh or 9822114455" : "admin@krushi.com"}
                  className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {lang === "mr" ? "पासवर्ड" : "Password"}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-sm shadow-lg shadow-emerald-700/30 transition-all hover:scale-[1.01] flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>
                    {activeTab === "farmer" ? t("signInFarmer") : t("signInAdmin")}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-emerald-300 space-y-1">
          {shop?.address && <p>{shop.address}</p>}
          <p>© 2026 {shop?.name || t("appName")}. {t("allRightsReserved")}</p>
        </div>
      </div>
    </div>
  );
}

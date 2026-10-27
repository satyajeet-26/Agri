"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sprout, User, Lock, ArrowRight, ShieldCheck, Phone, CheckCircle2 } from "lucide-react";
import { ShopProfile } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"farmer" | "admin">("farmer");
  const [username, setUsername] = useState("ramesh");
  const [password, setPassword] = useState("1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleTabSwitch = (tab: "farmer" | "admin") => {
    setActiveTab(tab);
    setError(null);
    if (tab === "farmer") {
      setUsername("ramesh");
      setPassword("1234");
    } else {
      setUsername("admin@krushi.com");
      setPassword("admin123");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
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
        setError(json.message || "Invalid credentials");
      }
    } catch (err: any) {
      setError("Network error while logging in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand & Krushi Seva Kendra Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-400 flex items-center justify-center mx-auto shadow-xl text-3xl">
            🌾
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {shop?.name || "Shree Krushi Seva Kendra"}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 font-medium">
            {shop?.tagline || "Agriculture Consultancy & Crop Advisory System"}
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
              👨‍🌾 Farmer Login (शेतकरी)
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
              🏢 Admin (केंद्र चालक)
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
                {activeTab === "farmer"
                  ? "Username or Mobile (युझरनेम किंवा मोबाईल)"
                  : "Admin Email ID"}
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
                Password (पासवर्ड)
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
                    {activeTab === "farmer" ? "Sign In to Farmer Panel" : "Login to Admin Dashboard"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Box */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1.5 text-slate-700">
            <p className="font-bold text-emerald-950 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant Demo Credentials:</span>
            </p>
            {activeTab === "farmer" ? (
              <p className="text-[11px] text-slate-600">
                Farmer 1: <code className="font-bold bg-white px-1.5 py-0.5 rounded border">ramesh</code> / Pass: <code className="font-bold bg-white px-1.5 py-0.5 rounded border">1234</code>
                <br />
                Farmer 2: <code className="font-bold bg-white px-1.5 py-0.5 rounded border">suresh</code> / Pass: <code className="font-bold bg-white px-1.5 py-0.5 rounded border">1234</code>
              </p>
            ) : (
              <p className="text-[11px] text-slate-600">
                Admin: <code className="font-bold bg-white px-1.5 py-0.5 rounded border">admin@krushi.com</code> / Pass: <code className="font-bold bg-white px-1.5 py-0.5 rounded border">admin123</code>
              </p>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-emerald-300 space-y-1">
          {shop?.address && <p>{shop.address}</p>}
          <p>© 2026 {shop?.name || "Krushi Seva Kendra"}. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}


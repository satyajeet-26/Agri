"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Pill,
  SprayCan,
  Wheat,
  Users,
  ChevronRight,
  Menu,
  X,
  Building2,
  Calendar,
  Ruler,
  MapPin,
  Tag,
  Flame,
} from "lucide-react";
import { useLanguage } from "./LanguageContext";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    {
      title: t("menuDashboard"),
      icon: LayoutDashboard,
      href: "/admin",
      exact: true,
      badge: "Overview",
    },
    {
      title: `1. ${t("menuGeneralMaster")}`,
      icon: Settings,
      href: "/admin/masters/general",
      badge: "Shop & Location",
    },
    {
      title: `2. ${t("menuMedicineMaster")}`,
      icon: Pill,
      href: "/admin/masters/medicines",
      badge: "Medicines & Fert",
    },
    {
      title: `3. ${t("menuSprayMaster")}`,
      icon: SprayCan,
      href: "/admin/schedules/spray",
      badge: "Master Spray",
    },
    {
      title: `4. ${t("menuFertilizerMaster")}`,
      icon: Wheat,
      href: "/admin/schedules/fertilizer",
      badge: "Master Fert",
    },
    {
      title: `5. ${t("menuFarmerMaster")}`,
      icon: Users,
      href: "/admin/farmers",
      badge: "Plots & Custom",
    },
  ];

  const isActive = (item: (typeof menuItems)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden p-3 bg-emerald-900 text-white flex items-center justify-between shadow-sm">
        <span className="font-semibold text-sm">Krushi Admin Menu</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg bg-emerald-800 text-amber-300 hover:text-white"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-slate-900 text-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col border-r border-slate-800 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-wider uppercase text-emerald-400">
                Krushi Admin Panel
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Consultancy Management</p>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {menuItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40 font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-5 h-5 ${
                      active ? "text-amber-300" : "text-emerald-400/80"
                    }`}
                  />
                  <span>{item.title}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      active
                        ? "bg-emerald-800/80 text-amber-200"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 ${
                      active ? "text-amber-300" : "text-slate-600"
                    }`}
                  />
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Quick Rule Reminder in Sidebar Footer */}
        <div className="p-4 m-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
          <p className="font-semibold text-emerald-300 flex items-center space-x-1">
            <span>🌾 Customization Rule</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Farmer schedule edits apply <span className="text-amber-300 font-medium">only to that farmer&apos;s plot</span>. The Master Schedule remains permanently safe.
          </p>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}
    </>
  );
}


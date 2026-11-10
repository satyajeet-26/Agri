"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Grid,
  Map,
  Sprout,
  PlusCircle,
  SprayCan,
  Wheat,
  Clock,
  ArrowUpRight,
  Send,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";
import { formatArea } from "@/lib/area";
import { formatScheduleDate } from "@/lib/schedule-date";
import { WhatsAppModal } from "@/components/WhatsAppModal";
import { generateSprayWhatsAppMessage, generateFertilizerWhatsAppMessage } from "@/lib/whatsapp";
import {
  DatabaseSchema,
  Farmer,
  PersonalizedSprayItem,
  Plot,
} from "@/types";

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);

  // WhatsApp Modal state
  const [waModal, setWaModal] = useState<{
    isOpen: boolean;
    farmerName: string;
    whatsappNumber: string;
    message: string;
  }>({
    isOpen: false,
    farmerName: "",
    whatsappNumber: "",
    message: "",
  });

  const loadData = async () => {
    try {
      const res = await fetch("/api/db");
      const json = await res.json();
      if (json.success) {
        setDb(json.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !db) {
    return (
      <div className="flex items-center justify-center min-h-125">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Dashboard Stats Calculations
  const activeFarmers = (db.farmers || []).filter((f) => f.isActive);
  const activePlots = (db.farmers || []).flatMap((f) => (f.isActive ? f.plots || [] : []));
  const totalGunthaAll = activePlots.reduce((sum, p) => sum + (p.totalGuntha || 0), 0);
  const totalAreaFormatted = formatArea(totalGunthaAll).formatted;
  const completedSchedules = (db.scheduleProgress || []).filter(
    (progress) => progress.status === "COMPLETED"
  );

  const scheduledSprays: {
    farmer: Farmer;
    plot: Plot;
    spray: PersonalizedSprayItem;
  }[] = [];

  (db.farmers || []).forEach((farmer) => {
    if (!farmer.isActive) return;
    (farmer.plots || []).forEach((plot) => {
      const progress = (db.scheduleProgress || []).find(
        (entry) =>
          entry.farmerId === farmer.id &&
          entry.plotId === plot.id &&
          entry.cropId === plot.cropName
      );
      const latestRelease = (db.scheduleExtensionHistory || [])
        .filter(
          (entry) =>
            entry.farmerId === farmer.id &&
            entry.plotId === plot.id &&
            entry.cropId === plot.cropName
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
      if (!progress || !latestRelease) return;

      (plot.spraySchedule || []).forEach((spray) => {
        if (
          spray.day < latestRelease.releasedStartDay ||
          spray.day > latestRelease.releasedEndDay ||
          spray.day > progress.totalDaysReleased
        ) {
          return;
        }
        scheduledSprays.push({ farmer, plot, spray });
      });
    });
  });

  scheduledSprays.sort((a, b) => (a.spray.day || 0) - (b.spray.day || 0));

  // Trigger WhatsApp Modal for spray
  const handleOpenWhatsApp = (farmer: Farmer, plot: any, spray: any) => {
    const msg = generateSprayWhatsAppMessage({
      shopName: db.shop.name,
      shopContact: db.shop.mobile,
      farmerName: farmer.name,
      farmerMobile: farmer.whatsapp || farmer.mobile,
      cropName: plot.cropName,
      plotName: plot.plotName,
      totalGuntha: plot.totalGuntha,
      day: spray.day,
      time: spray.time,
      medicineName: spray.medicineName,
      quantity: spray.quantity,
      unit: spray.unit,
      waterQuantity: spray.waterQuantity,
      note: spray.note,
    });

    setWaModal({
      isOpen: true,
      farmerName: farmer.name,
      whatsappNumber: farmer.whatsapp || farmer.mobile,
      message: msg,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Shop Logo & Name */}
      <div className="bg-linear-to-r from-emerald-800 via-emerald-700 to-green-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-400 to-emerald-400 flex items-center justify-center shadow-lg text-emerald-950 font-black text-2xl">
              🌾
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-900/60 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-1">
                {t("consultancySystem")}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {db.shop.name}
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm mt-0.5 max-w-xl">
                {db.shop.tagline || (t("consultancySystem"))}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/admin/farmers"
              className="inline-flex items-center space-x-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold px-4 py-2.5 rounded-xl shadow-md transition-all text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t("addFarmer")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Metrics Cards (Active Farmers, Active Plots, Total Area Acre/Guntha) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Active Farmers */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("activeFarmers")}
            </p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">
              {activeFarmers.length}
            </h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {t("registeredConsultancyFarmers")}
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Users className="w-7 h-7" />
          </div>
        </div>

        {/* Active Plots */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("activePlots")}
            </p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">
              {activePlots.length}
            </h3>
            <p className="text-xs text-blue-600 font-medium mt-1">
              {t("activePlotsUnderSupervision")}
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Grid className="w-7 h-7" />
          </div>
        </div>

        {/* Total Area Under Consultancy (Acre / Guntha) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-200/80 flex items-center justify-between hover:shadow-md transition-shadow bg-linear-to-br from-white to-emerald-50/50">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("totalAreaUnderConsultancy")}
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
              {totalAreaFormatted}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {t("totalAreaLabel")}: {totalGunthaAll} {t("gunthas")} ({t("acreConversion")})
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
            <Map className="w-7 h-7" />
          </div>
        </div>
      </div>

      {completedSchedules.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-bold">{t("completedExtensionNeeded")}</h2>
              <p className="mt-1 text-xs">
                {t("completedExtensionDescription")}
              </p>
            </div>
            <Link
              href="/admin/schedules/release"
              className="w-fit rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white hover:bg-amber-800"
            >
              {t("openSetDays")}
            </Link>
          </div>
          <ul className="mt-3 space-y-1 text-xs">
            {completedSchedules.map((progress) => {
              const farmer = db.farmers.find((entry) => entry.id === progress.farmerId);
              const plot = farmer?.plots.find((entry) => entry.id === progress.plotId);
              return (
                <li key={progress.id}>
                  <Link
                    href="/admin/schedules/release"
                    className="font-semibold underline"
                  >
                    {farmer?.name || "Farmer"} — {plot?.cropName || progress.cropId}
                    {" · "}{t("lastCompletedDay")}: {progress.lastDeliveredDay}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">{t("plotScheduleProgress")}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {t("releasedScheduleStatus")}
            </p>
          </div>
          <Link
            href="/admin/schedules/release"
            className="w-fit rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
          >
            {t("manageSetDays")}
          </Link>
        </div>

        {(db.scheduleProgress || []).length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
            {t("noSchedulesReleased")}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {db.scheduleProgress.map((progress) => {
              const farmer = db.farmers.find((entry) => entry.id === progress.farmerId);
              const plot = farmer?.plots.find((entry) => entry.id === progress.plotId);
              if (!farmer || !plot) return null;

              const currentDay = Math.min(
                Math.max(progress.currentDay, 0),
                progress.totalDaysReleased
              );
              const percent = progress.totalDaysReleased
                ? (currentDay / progress.totalDaysReleased) * 100
                : 0;

              return (
                <article
                  key={progress.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{farmer.name}</p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {plot.cropName} · {plot.plotName} · {formatArea(plot.totalGuntha).formatted}
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        progress.status === "COMPLETED"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-emerald-100 text-emerald-900"
                      }`}
                    >
                      {progress.status === "COMPLETED" ? "Completed" : "Active"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <strong className="text-slate-800">
                      Day {currentDay} / {progress.totalDaysReleased}
                    </strong>
                    <span className="text-slate-500">
                      Started {formatScheduleDate(progress.scheduleStartDate, "en")}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <Link
                    href={`/admin/farmers/${encodeURIComponent(farmer.id)}?plotId=${encodeURIComponent(plot.id)}`}
                    className="mt-3 inline-flex rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                  >
                    Open farmer plots and timeline
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Spray Schedule Overview with 1-Click WhatsApp Button */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <SprayCan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {t("todaysSchedules")}
              </h2>
              <p className="text-xs text-slate-500">
                Latest released spray days for all active plots
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
            {scheduledSprays.length} Spray Entries
          </span>
        </div>

        {scheduledSprays.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No spray schedule entries found!</p>
            <p className="text-slate-400 mt-0.5">Add a crop plan or reset the schedule template.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduledSprays.map(({ farmer, plot, spray }, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 transition-colors flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Day {spray.day} • {spray.time}
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm mt-1">
                      {farmer.name}
                    </h4>
                    <p className="text-xs text-slate-600">
                      {plot.cropName} ({plot.plotName}) • {formatArea(plot.totalGuntha).formatted}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200">
                    {farmer.village}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200/80 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Medicine:</span>
                    <span className="font-semibold text-slate-800">{spray.medicineName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dosage:</span>
                    <span className="font-semibold text-slate-800">
                      {spray.quantity} {spray.unit} / {spray.waterQuantity}
                    </span>
                  </div>
                  {spray.note && (
                    <p className="text-[11px] text-amber-800 pt-1 border-t border-slate-100 italic">
                      "{spray.note}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Link
                    href={`/admin/farmers/${farmer.id}`}
                    className="text-xs font-medium text-emerald-700 hover:underline flex items-center space-x-1"
                  >
                    <span>View Profile</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => handleOpenWhatsApp(farmer, plot, spray)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to WhatsApp</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Registered Farmers Quick Summary Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-800">
              Active Registered Farmers
            </h2>
          </div>
          <Link
            href="/admin/farmers"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
          >
            <span>View All Farmers ({db.farmers.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Farmer Name</th>
                <th className="py-2.5 px-3">Mobile / WhatsApp</th>
                <th className="py-2.5 px-3">Village</th>
                <th className="py-2.5 px-3">Plots</th>
                <th className="py-2.5 px-3">Total Area</th>
                <th className="py-2.5 px-3">Balance (₹)</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(db.farmers || []).slice(0, 5).map((farmer) => {
                const totalPlotGuntha = (farmer.plots || []).reduce(
                  (sum, p) => sum + (p.totalGuntha || 0),
                  0
                );
                return (
                  <tr key={farmer.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {farmer.name}
                    </td>
                    <td className="py-3 px-3 font-mono">{farmer.mobile}</td>
                    <td className="py-3 px-3">{farmer.village}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700">
                        {(farmer.plots || []).length} {(farmer.plots || []).length === 1 ? "Plot" : "Plots"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-emerald-700">
                      {formatArea(totalPlotGuntha).formatted}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          farmer.openingBalanceType === "Debit"
                            ? "text-red-600"
                            : "text-emerald-600"
                        }`}
                      >
                        ₹{farmer.openingBalance} ({farmer.openingBalanceType})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/admin/farmers/${farmer.id}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px]"
                      >
                        <span>Manage & Customize</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp Modal Trigger */}
      <WhatsAppModal
        isOpen={waModal.isOpen}
        onClose={() => setWaModal({ ...waModal, isOpen: false })}
        farmerName={waModal.farmerName}
        whatsappNumber={waModal.whatsappNumber}
        initialMessage={waModal.message}
      />
    </div>
  );
}

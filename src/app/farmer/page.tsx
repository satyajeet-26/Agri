"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sprout,
  Calendar,
  Clock,
  Droplets,
  SprayCan,
  Wheat,
  MapPin,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Phone,
  ShieldCheck,
  User,
  ChevronRight,
  Filter,
} from "lucide-react";
import { formatArea } from "@/lib/area";
import {
  formatScheduleDate,
  getDateInIndia,
  getFertilizerScheduledDate,
  getSprayScheduledDate,
} from "@/lib/schedule-date";
import { useLanguage } from "@/components/LanguageContext";
import {
  Farmer,
  Plot,
  PersonalizedSprayItem,
  PersonalizedFertilizerItem,
  ScheduleProgress,
  ShopProfile,
} from "@/types";

export default function FarmerPanelPage() {
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [scheduleProgress, setScheduleProgress] = useState<ScheduleProgress[]>([]);
  const [plotCurrentDays, setPlotCurrentDays] = useState<Record<string, number>>({});
  const [selectedPlotId, setSelectedPlotId] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"today" | "all" | "spray" | "fertilizer">("today");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("agri_user");
    if (!stored) {
      router.replace("/login");
      return;
    }

    let user: { id?: string; role?: string };
    try {
      user = JSON.parse(stored) as { id?: string; role?: string };
      if (user.role !== "FARMER" || !user.id) {
        router.replace("/login");
        return;
      }
    } catch {
      localStorage.removeItem("agri_user");
      router.replace("/login");
      return;
    }

    const farmerId = user.id;
    let cancelled = false;
    let requestPending = false;
    let timeoutId: number | undefined;

    const refreshFarmerData = async () => {
      if (requestPending || cancelled) return;
      requestPending = true;
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), 15000);

      try {
        const [farmerResponse, generalResponse] = await Promise.all([
          fetch(`/api/farmers/${encodeURIComponent(farmerId)}`, {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/masters/general", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);
        const [farmerResult, generalResult] = await Promise.all([
          farmerResponse.json(),
          generalResponse.json(),
        ]);

        if (farmerResponse.status === 401) {
          localStorage.removeItem("agri_user");
          router.replace("/login");
          return;
        }
        if (!farmerResponse.ok || !farmerResult.success || !farmerResult.farmer) {
          throw new Error(
            farmerResult.message || farmerResult.error || "Unable to load farmer details."
          );
        }
        if (cancelled) return;

        setFarmer(farmerResult.farmer);
        setScheduleProgress(farmerResult.scheduleProgress || []);
        setPlotCurrentDays(farmerResult.plotCurrentDays || {});
        setSelectedPlotId((current) =>
          farmerResult.farmer.plots.some((plot: Plot) => plot.id === current)
            ? current
            : farmerResult.farmer.plots[0]?.id || ""
        );
        setLoadError("");

        if (generalResponse.ok && generalResult.success && generalResult.data?.shop) {
          setShop(generalResult.data.shop);
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Unable to load the latest farmer information.";
        setLoadError(message);
        console.error("Farmer panel refresh failed:", error);
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        requestPending = false;
        if (!cancelled) setLoading(false);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshFarmerData();
    };

    void refreshFarmerData();
    const intervalId = window.setInterval(refreshWhenVisible, 30000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshKey, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error: unknown) {
      console.error("Farmer logout request failed:", error);
    } finally {
      localStorage.removeItem("agri_user");
      window.location.href = "/login";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          <p className="text-xs text-slate-500 font-medium">Loading your crop advisory...</p>
        </div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div role="alert" className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-600" />
          <p className="text-sm text-slate-800">{loadError || "Unable to load your farmer account."}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setRefreshKey((current) => current + 1);
            }}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }
  const selectedPlot = (farmer.plots || []).find((p) => p.id === selectedPlotId) || (farmer.plots || [])[0];
  const selectedProgress = scheduleProgress.find(
    (progress) =>
      progress.plotId === selectedPlot?.id &&
      progress.cropId === selectedPlot?.cropName
  );

  const todayDate = getDateInIndia();
  const allSprays = selectedPlot?.spraySchedule || [];
  const allFertilizers = selectedPlot?.fertilizerSchedule || [];
  const todaysSprays = selectedPlot
    ? allSprays.filter((item) => getSprayScheduledDate(selectedPlot, item) === todayDate)
    : [];
  const todaysFertilizers = selectedPlot
    ? allFertilizers.filter((item) => getFertilizerScheduledDate(selectedPlot, item) === todayDate)
    : [];
  const visibleSprays =
    activeFilter === "today"
      ? todaysSprays
      : activeFilter === "fertilizer"
        ? []
        : allSprays;
  const visibleFertilizers =
    activeFilter === "today"
      ? todaysFertilizers
      : activeFilter === "spray"
        ? []
        : allFertilizers;
  const hasScheduleToday = todaysSprays.length > 0 || todaysFertilizers.length > 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 pb-12">
      {/* Mobile-First Header */}
      <header className="sticky top-0 z-40 bg-emerald-800 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shadow-xs text-emerald-950 font-bold text-lg">
              🌾
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base leading-tight">
                {shop?.name || "Krushi Seva Kendra"}
              </h1>
              <p className="text-[11px] text-emerald-200">
                {lang === "mr" ? "शेतकरी सल्लागार पॅनल" : "Farmer Consultancy Portal"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language toggle */}
            <div className="flex items-center bg-emerald-900/80 rounded-lg p-0.5 border border-emerald-700">
              <button
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                  lang === "en" ? "bg-amber-400 text-emerald-950" : "text-emerald-200"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("mr")}
                className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                  lang === "mr" ? "bg-amber-400 text-emerald-950" : "text-emerald-200"
                }`}
              >
                मराठी
              </button>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full px-4 pt-4 space-y-4">
        {loadError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950"
          >
            <span>Could not refresh the latest farmer information: {loadError}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setRefreshKey((current) => current + 1);
              }}
              className="shrink-0 rounded-lg bg-amber-200 px-3 py-1.5 font-bold"
            >
              Retry
            </button>
          </div>
        )}
        {/* Welcome Card & Farmer Info */}
        <div className="bg-linear-to-r from-emerald-800 to-green-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-900/60 text-amber-300">
                {lang === "mr" ? "नोंदणीकृत शेतकरी" : "Registered Farmer"}
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-1">
                {farmer.name}
              </h2>
              <p className="text-xs text-emerald-100 flex items-center space-x-2 mt-0.5">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {farmer.village}, {farmer.taluka}
                  </span>
                </span>
                <span>•</span>
                <span>📞 {farmer.mobile}</span>
              </p>
            </div>

            {shop?.mobile && (
              <a
                href={`tel:${shop.mobile}`}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-amber-300 w-fit"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>
                  {lang === "mr" ? "केंद्र संपर्क:" : "Helpline:"} {shop.mobile}
                </span>
              </a>
            )}
          </div>
        </div>

        {/* Read-Only Safety Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center space-x-2 text-xs text-blue-800">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            {lang === "mr"
              ? "हे वेळापत्रक कृषी तज्ज्ञांनी तुमच्या शेतासाठी खास तयार केले आहे. यात बदल केवळ केंद्राकडून केला जाऊ शकतो."
              : "This schedule is personalized for your plot by your Krushi Seva Kendra expert. (Read-Only access)"}
          </span>
        </div>

        {selectedPlot && selectedProgress && (
          <div
            className={`rounded-xl border p-4 text-sm ${
              selectedProgress.status === "COMPLETED"
                ? "border-amber-300 bg-amber-50 text-amber-950"
                : "border-emerald-200 bg-emerald-50 text-emerald-950"
            }`}
            role={selectedProgress.status === "COMPLETED" ? "status" : undefined}
          >
            <p className="font-bold">
              {selectedProgress.status === "COMPLETED"
                ? "Your current spray schedule has been completed."
                : `Released schedule: Day 1–${selectedProgress.totalDaysReleased}`}
            </p>
            {selectedProgress.status === "COMPLETED" ? (
              <p className="mt-1 text-xs">
                Please contact your Agri-Ten consultant to receive your next schedule.
                {shop?.mobile && (
                  <>
                    {" "}
                    <a className="font-bold underline" href={`tel:${shop.mobile}`}>
                      Contact consultant
                    </a>
                  </>
                )}
              </p>
            ) : (
              <p className="mt-1 text-xs">
                Day {selectedProgress.currentDay} of {selectedProgress.totalDaysReleased}
              </p>
            )}
          </div>
        )}

        <section className="space-y-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              {lang === "mr" ? "माझे प्लॉट" : "My Plots"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {lang === "mr"
                ? "दिवसनिहाय वेळापत्रक पाहण्यासाठी प्लॉट निवडा."
                : "Open a plot to view its day-by-day schedule."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {farmer.plots.map((plot) => {
              const progress = scheduleProgress.find(
                (entry) => entry.plotId === plot.id && entry.cropId === plot.cropName
              );
              const currentDay = plotCurrentDays[plot.id] || 0;
              return (
                <Link
                  key={plot.id}
                  href={`/farmer/plots/${encodeURIComponent(plot.id)}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-emerald-700"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <span className="block text-sm font-extrabold text-slate-900">{plot.plotName}</span>
                      <span className="mt-0.5 block text-sm font-bold text-emerald-800">{plot.cropName}</span>
                    </span>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />
                  </span>
                  <span className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">
                      {lang === "mr" ? "क्षेत्र" : "Area"}
                      <strong className="mt-0.5 block text-slate-800">{formatArea(plot.totalGuntha).formatted}</strong>
                    </span>
                    <span className="text-slate-500">
                      {lang === "mr" ? "सुरुवात" : "Started"}
                      <strong className="mt-0.5 block text-slate-800">{formatScheduleDate(plot.sowingDate, lang)}</strong>
                    </span>
                    <span className="text-slate-500">
                      {lang === "mr" ? "सध्याचा दिवस" : "Current day"}
                      <strong className="mt-0.5 block text-slate-800">
                        {currentDay > 0 ? `Day ${currentDay}` : "Not started"}
                      </strong>
                    </span>
                    <span className="text-slate-500">
                      {lang === "mr" ? "जारी" : "Released"}
                      <strong className="mt-0.5 block text-slate-800">
                        {progress ? `Day 1–${progress.totalDaysReleased}` : "Not released"}
                      </strong>
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 1. TODAY'S SCHEDULE HIGHLIGHT CARD */}
        {selectedPlot && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">
                    {lang === "mr" ? "आजचे वेळापत्रक (Today's Schedule)" : "Today's Active Schedule"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedPlot.plotName} • {selectedPlot.cropName} ({formatArea(selectedPlot.totalGuntha).formatted})
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {formatScheduleDate(todayDate, lang)}
              </span>
            </div>

            {!hasScheduleToday ? (
              <div className="text-center py-6 text-slate-500 text-xs space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">
                  {lang === "mr"
                    ? "आज कोणतीही फवारणी किंवा खत देण्याची गरज नाही!"
                    : "No spray or fertilizer application scheduled for today!"}
                </p>
                <p className="text-slate-400">
                  {lang === "mr"
                    ? "पुढील दिवसांचे वेळापत्रक पाहण्यासाठी खाली तपासा."
                    : "Check the timeline below for your upcoming schedule."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Today's Spray Items */}
                {todaysSprays.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-700 text-white">
                        {lang === "mr" ? "आजची फवारणी" : "Today's Spray"} • {formatScheduleDate(todayDate, lang)}
                      </span>
                      <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                        {item.time === "Morning" ? "सकाळ (Morning)" : "संध्याकाळ (Evening)"}
                      </span>
                    </div>

                    <div className="text-sm font-black text-slate-900">
                      💊 {lang === "mr" ? "औषध:" : "Medicine:"} {item.medicineName}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-amber-200">
                      <div>
                        <span className="text-slate-500 block">
                          {lang === "mr" ? "प्रमाण (Quantity):" : "Quantity:"}
                        </span>
                        <span className="font-bold text-emerald-800">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">
                          {lang === "mr" ? "पाणी प्रमाण:" : "Water Required:"}
                        </span>
                        <span className="font-bold text-slate-800">
                          {item.waterQuantity}
                        </span>
                      </div>
                    </div>

                    {item.note && (
                      <p className="text-xs text-amber-900 italic font-medium pt-1">
                        📝 {item.note}
                      </p>
                    )}
                  </div>
                ))}

                {/* Today's Fertilizer Items */}
                {todaysFertilizers.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-800 text-white">
                        {lang === "mr" ? "आजचे खत व्यवस्थापन" : "Today's Fertilizer"} • {formatScheduleDate(todayDate, lang)}
                      </span>
                      <span className="text-xs font-bold text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded">
                        {item.stage}
                      </span>
                    </div>

                    <div className="text-sm font-black text-slate-900">
                      🧪 {lang === "mr" ? "खताचे नाव:" : "Fertilizer:"} {item.fertilizerName}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-emerald-200">
                      <div>
                        <span className="text-slate-500 block">
                          {lang === "mr" ? "प्रमाण (Quantity):" : "Dosage:"}
                        </span>
                        <span className="font-bold text-emerald-800">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">
                          {lang === "mr" ? "वापर पद्धत:" : "Method:"}
                        </span>
                        <span className="font-bold text-slate-800">
                          {item.applicationMethod}
                        </span>
                      </div>
                    </div>

                    {item.note && (
                      <p className="text-xs text-emerald-900 italic font-medium pt-1">
                        📝 {item.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. TIMELINE / ALL SCHEDULES FOR THIS PLOT */}
        {selectedPlot && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {lang === "mr" ? "संपूर्ण पीक वेळापत्रक" : "Complete Crop Schedule"}
              </h3>

              {/* Filter Tabs */}
              <div className="flex gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setActiveFilter("today")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    activeFilter === "today"
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lang === "mr" ? "आजचे" : "Today"}
                </button>
                <button
                  onClick={() => setActiveFilter("spray")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    activeFilter === "spray"
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lang === "mr" ? "फवारणी" : "All Sprays"}
                </button>
                <button
                  onClick={() => setActiveFilter("fertilizer")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    activeFilter === "fertilizer"
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lang === "mr" ? "खते" : "Fertilizers"}
                </button>
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    activeFilter === "all"
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lang === "mr" ? "सर्व" : "All"}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {/* Sprays */}
              {visibleSprays.map((spray) => (
                  <div
                    key={spray.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                          {lang === "mr" ? `${spray.day} वा दिवस` : `Day ${spray.day}`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold">
                          {formatScheduleDate(
                            getSprayScheduledDate(selectedPlot, spray) || todayDate,
                            lang
                          )}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {spray.time}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {spray.medicineName}
                      </h4>
                      <p className="text-xs text-emerald-700 font-semibold">
                        {lang === "mr" ? "प्रमाण:" : "Dose:"} {spray.quantity} {spray.unit} • {spray.waterQuantity}
                      </p>
                      {spray.note && (
                        <p className="text-[11px] text-slate-500 italic">
                          "{spray.note}"
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                        Schedule
                      </span>
                    </div>
                  </div>
                ))}

              {/* Fertilizers */}
              {visibleFertilizers.map((fert) => (
                  <div
                    key={fert.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                          {lang === "mr" ? `${fert.day} वा दिवस` : `Day ${fert.day}`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold">
                          {formatScheduleDate(
                            getFertilizerScheduledDate(selectedPlot, fert) || todayDate,
                            lang
                          )}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {fert.stage}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {fert.fertilizerName}
                      </h4>
                      <p className="text-xs text-emerald-700 font-semibold">
                        {lang === "mr" ? "प्रमाण:" : "Dose:"} {fert.quantity} {fert.unit} • {fert.applicationMethod}
                      </p>
                      {fert.note && (
                        <p className="text-[11px] text-slate-500 italic">
                          "{fert.note}"
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                        Schedule
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

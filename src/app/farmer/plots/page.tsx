"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, LogOut } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";
import { formatArea } from "@/lib/area";
import { formatScheduleDate } from "@/lib/schedule-date";
import { Farmer, ScheduleProgress } from "@/types";

export default function FarmerPlotsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [scheduleProgress, setScheduleProgress] = useState<ScheduleProgress[]>([]);
  const [plotCurrentDays, setPlotCurrentDays] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    const loadPlots = async () => {
      const stored = localStorage.getItem("agri_user");
      if (!stored) {
        router.replace("/login");
        return;
      }

      let user: { id?: string; role?: string };
      try {
        user = JSON.parse(stored) as { id?: string; role?: string };
      } catch {
        localStorage.removeItem("agri_user");
        router.replace("/login");
        return;
      }

      if (user.role !== "FARMER" || !user.id) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`/api/farmers/${encodeURIComponent(user.id)}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        const result = await response.json();

        if (response.status === 401) {
          localStorage.removeItem("agri_user");
          router.replace("/login");
          return;
        }
        if (!response.ok || !result.success || !result.farmer) {
          throw new Error(result.message || result.error || "Unable to load your plots.");
        }
        if (cancelled) return;

        setFarmer(result.farmer);
        setScheduleProgress(result.scheduleProgress || []);
        setPlotCurrentDays(result.plotCurrentDays || {});
        setError("");
      } catch (loadError: unknown) {
        if (cancelled || controller.signal.aborted) return;
        const message = loadError instanceof Error ? loadError.message : "Unable to load your plots.";
        setError(message);
        console.error("Farmer plots load failed:", loadError);
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    };

    void loadPlots();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [refreshKey, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (logoutError: unknown) {
      console.error("Farmer logout request failed:", logoutError);
    } finally {
      localStorage.removeItem("agri_user");
      router.replace("/login");
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-10 text-slate-900">
      <header className="sticky top-0 z-30 bg-emerald-800 text-white shadow-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/farmer" className="inline-flex items-center gap-2 text-sm font-bold">
            <ArrowLeft className="h-4 w-4" />
            {lang === "mr" ? "मुख्य पान" : "Dashboard"}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg bg-emerald-900/70 p-2 text-white"
            aria-label={lang === "mr" ? "लॉग आउट" : "Log out"}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-4 px-4 pt-5">
        <section>
          <h1 className="text-xl font-black text-slate-900">
            {lang === "mr" ? "माझे प्लॉट" : "My Plots"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {lang === "mr"
              ? "तपशीलवार वेळापत्रक पाहण्यासाठी प्लॉट निवडा."
              : "Select a plot to open its detailed schedule."}
          </p>
        </section>

        {loading && (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-600">
            {lang === "mr" ? "तुमचे प्लॉट लोड होत आहेत..." : "Loading your plots..."}
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setRefreshKey((current) => current + 1);
              }}
              className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-xs font-bold"
            >
              {lang === "mr" ? "पुन्हा प्रयत्न करा" : "Try again"}
            </button>
          </div>
        )}

        {!loading && !error && farmer?.plots.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            {lang === "mr" ? "तुमच्या खात्यात प्लॉट जोडलेले नाहीत." : "There are no plots in your account yet."}
          </div>
        )}

        {!loading && !error && farmer && farmer.plots.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {farmer.plots.map((plot) => {
              const progress = scheduleProgress.find(
                (entry) => entry.plotId === plot.id && entry.cropId === plot.cropName
              );
              const currentDay = plotCurrentDays[plot.id] || 0;

              const cardContent = (
                <>
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <span
                        className={`block text-sm font-extrabold ${
                          plot.isActive === false ? "text-rose-900" : "text-slate-900"
                        }`}
                      >
                        {plot.plotName}
                      </span>
                      <span
                        className={`mt-0.5 block text-sm font-bold ${
                          plot.isActive === false ? "text-rose-700" : "text-emerald-800"
                        }`}
                      >
                        {plot.cropName}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                          plot.isActive === false
                            ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {plot.isActive === false
                          ? lang === "mr" ? "निष्क्रिय" : "Inactive"
                          : lang === "mr" ? "सक्रिय" : "Active"}
                      </span>
                      {plot.isActive !== false && (
                        <ChevronRight className="h-5 w-5 text-emerald-700" />
                      )}
                    </span>
                  </span>
                  <span className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">
                      {lang === "mr" ? "क्षेत्र" : "Area"}
                      <strong className="mt-0.5 block text-slate-800">
                        {formatArea(plot.totalGuntha).formatted}
                      </strong>
                    </span>
                    <span className="text-slate-500">
                      {lang === "mr" ? "पेरणीची तारीख" : "Sowing date"}
                      <strong className="mt-0.5 block text-slate-800">
                        {formatScheduleDate(plot.sowingDate, lang)}
                      </strong>
                    </span>
                    {plot.isActive === false ? (
                      <span className="col-span-2 rounded-lg border border-rose-200 bg-rose-100 p-2 text-rose-900">
                        {lang === "mr"
                          ? "हा प्लॉट निष्क्रिय आहे. वेळापत्रक उपलब्ध नाही."
                          : "This plot is inactive. Its schedule is unavailable."}
                      </span>
                    ) : (
                      <>
                        <span className="text-slate-500">
                          {lang === "mr" ? "सध्याचा दिवस" : "Current day"}
                          <strong className="mt-0.5 block text-slate-800">
                            {currentDay > 0
                              ? `${lang === "mr" ? "दिवस" : "Day"} ${currentDay}`
                              : lang === "mr" ? "सुरू नाही" : "Not started"}
                          </strong>
                        </span>
                        <span className="text-slate-500">
                          {lang === "mr" ? "जारी वेळापत्रक" : "Released schedule"}
                          <strong className="mt-0.5 block text-slate-800">
                            {progress
                              ? `Day 1–${progress.totalDaysReleased}`
                              : lang === "mr" ? "जारी नाही" : "Not released"}
                          </strong>
                        </span>
                      </>
                    )}
                  </span>
                </>
              );
              const cardClassName = `block rounded-2xl border p-4 shadow-sm ${
                plot.isActive === false
                  ? "border-rose-300 bg-rose-50"
                  : "border-slate-200 bg-white transition hover:border-emerald-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-emerald-700"
              }`;

              return plot.isActive === false ? (
                <div key={plot.id} className={cardClassName} aria-disabled="true">
                  {cardContent}
                </div>
              ) : (
                <Link
                  key={plot.id}
                  href={`/farmer/plots/${encodeURIComponent(plot.id)}`}
                  className={cardClassName}
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

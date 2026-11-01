"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, LogOut, Sprout } from "lucide-react";
import { PlotScheduleTimeline } from "@/components/PlotScheduleTimeline";
import { useLanguage } from "@/components/LanguageContext";
import { formatArea } from "@/lib/area";
import { formatScheduleDate } from "@/lib/schedule-date";
import { PlotScheduleTimeline as PlotScheduleTimelineData } from "@/types";

export default function FarmerPlotSchedulePage() {
  const { plotId } = useParams<{ plotId: string }>();
  const router = useRouter();
  const { lang } = useLanguage();
  const [farmerName, setFarmerName] = useState("");
  const [timeline, setTimeline] = useState<PlotScheduleTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadTimeline = async () => {
      await Promise.resolve();
      if (cancelled) return;

      const stored = localStorage.getItem("agri_user");
      if (!stored) {
        router.replace("/login");
        setLoading(false);
        return;
      }

      try {
        const user = JSON.parse(stored) as { id?: string; role?: string };
        if (user.role !== "FARMER" || !user.id) {
          router.replace("/login");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/farmers/${encodeURIComponent(user.id)}/plots/${encodeURIComponent(plotId)}/schedule`
        );
        const result = await response.json();
        if (response.status === 401) {
          localStorage.removeItem("agri_user");
          router.replace("/login");
          return;
        }
        if (!response.ok || !result.success || !result.timeline) {
          throw new Error(result.message || "Unable to load this plot schedule.");
        }
        if (!cancelled) {
          setTimeline(result.timeline);
          setFarmerName(result.farmerName || "");
        }
      } catch (loadError: unknown) {
        if (cancelled) return;
        if (loadError instanceof Error) {
          setError(loadError.message);
        } else {
          setError("Unable to load this plot schedule.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadTimeline();

    return () => {
      cancelled = true;
    };
  }, [plotId, router]);

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

  const completionDay = timeline
    ? Math.min(timeline.currentDay, timeline.totalDaysReleased)
    : 0;

  return (
    <main className="min-h-screen bg-slate-100 pb-10 text-slate-900">
      <header className="sticky top-0 z-30 bg-emerald-800 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/farmer" className="inline-flex items-center gap-2 text-sm font-bold">
            <ArrowLeft className="h-4 w-4" />
            {lang === "mr" ? "माझे प्लॉट" : "My Plots"}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg bg-emerald-900/70 p-2 text-white"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-4 pt-4">
        {loading && (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-600">
            Loading plot schedule…
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && timeline && (
          <>
            <section className="rounded-2xl bg-linear-to-br from-emerald-800 to-green-700 p-5 text-white shadow-md">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-white/15 p-2.5">
                  <Sprout className="h-6 w-6 text-amber-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-emerald-100">
                    {farmerName || (lang === "mr" ? "शेतकरी" : "Farmer")}
                  </p>
                  <h1 className="mt-0.5 text-xl font-black">
                    {timeline.plot.cropName}
                  </h1>
                  <p className="text-sm text-emerald-100">
                    {timeline.plot.plotName} · {formatArea(timeline.plot.totalGuntha).formatted}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-white/15 bg-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-emerald-100">
                      {lang === "mr" ? "वेळापत्रक प्रगती" : "Schedule Progress"}
                    </p>
                    <p className="mt-0.5 text-lg font-black">
                      {timeline.totalDaysReleased
                        ? `Day ${completionDay} / ${timeline.totalDaysReleased}`
                        : lang === "mr" ? "जारी नाही" : "Not released"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      timeline.status === "COMPLETED"
                        ? "bg-amber-300 text-amber-950"
                        : timeline.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-white/20 text-white"
                    }`}
                  >
                    {timeline.status === "COMPLETED"
                      ? "Schedule Completed"
                      : timeline.status === "ACTIVE"
                        ? "Active"
                        : "Waiting for Admin"}
                  </span>
                </div>
                {timeline.totalDaysReleased > 0 && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-950/40">
                    <div
                      className="h-full rounded-full bg-amber-300"
                      style={{
                        width: `${Math.min(
                          100,
                          (completionDay / timeline.totalDaysReleased) * 100
                        )}%`,
                      }}
                    />
                  </div>
                )}
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-emerald-50 sm:grid-cols-3">
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Started: {formatScheduleDate(timeline.progress?.scheduleStartDate || timeline.plot.sowingDate, lang)}
                  </p>
                  <p>Current: Day {timeline.currentDay}</p>
                  <p>Remaining: {timeline.remainingDays} {timeline.remainingDays === 1 ? "day" : "days"}</p>
                </div>
              </div>
            </section>

            {timeline.status === "COMPLETED" && (
              <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-bold">Your current crop schedule is completed.</p>
                <p className="mt-1 text-xs">
                  Next schedule: Waiting for Admin. Please contact your Agri-Ten consultant to receive it.
                </p>
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4">
                <h2 className="text-base font-extrabold text-slate-900">
                  {lang === "mr" ? "दिवसनिहाय वेळापत्रक" : "Day-by-Day Schedule"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {lang === "mr"
                    ? `प्रशासकाने जारी केलेले दिवस: 1–${timeline.totalDaysReleased}`
                    : `Only admin-released days are shown (Day 1–${timeline.totalDaysReleased}).`}
                </p>
              </div>
              <PlotScheduleTimeline
                key={timeline.plot.id}
                timeline={timeline}
                language={lang}
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}

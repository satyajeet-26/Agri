"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";
import {
  Farmer,
  MasterCropSchedule,
  ScheduleExtensionHistory,
  ScheduleProgress,
} from "@/types";

const localize = (language: "en" | "mr", en: string, mr: string) =>
  language === "mr" ? mr : en;

export default function ScheduleReleasePage() {
  const { lang } = useLanguage();
  const tr = (en: string, mr: string) => localize(lang, en, mr);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [schedules, setSchedules] = useState<Record<string, MasterCropSchedule>>({});
  const [scheduleProgress, setScheduleProgress] = useState<ScheduleProgress[]>([]);
  const [scheduleHistory, setScheduleHistory] = useState<ScheduleExtensionHistory[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState("");
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [setTotalDays, setSetTotalDays] = useState("");
  const [releaseSaving, setReleaseSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [scheduleResponse, farmerResponse, releaseResponse] = await Promise.all([
        fetch("/api/schedules/master"),
        fetch("/api/farmers"),
        fetch("/api/schedules/release"),
      ]);
      const [scheduleResult, farmerResult, releaseResult] = await Promise.all([
        scheduleResponse.json(),
        farmerResponse.json(),
        releaseResponse.json(),
      ]);

      if (!scheduleResponse.ok || !scheduleResult.success) {
        throw new Error(scheduleResult.message || scheduleResult.error || localize(lang, "Unable to load master schedules.", "मास्टर वेळापत्रके लोड करता आली नाहीत."));
      }
      if (!farmerResponse.ok || !farmerResult.success) {
        throw new Error(farmerResult.message || farmerResult.error || localize(lang, "Unable to load farmers.", "शेतकरी लोड करता आले नाहीत."));
      }
      if (!releaseResponse.ok || !releaseResult.success) {
        throw new Error(releaseResult.message || releaseResult.error || localize(lang, "Unable to load schedule progress.", "वेळापत्रकाची प्रगती लोड करता आली नाही."));
      }

      const loadedFarmers = (farmerResult.farmers || []) as Farmer[];
      setFarmers(loadedFarmers);
      setSchedules(scheduleResult.masterSchedules || {});
      setScheduleProgress(releaseResult.progress || []);
      setScheduleHistory(releaseResult.history || []);

      const firstFarmer = loadedFarmers[0];
      if (firstFarmer) {
        setSelectedFarmerId((current) => current || firstFarmer.id);
        setSelectedPlotId((current) => current || firstFarmer.plots[0]?.id || "");
      }
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : localize(lang, "Unable to load schedule release data.", "वेळापत्रक सोडण्याची माहिती लोड करता आली नाही.")
      );
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const selectedFarmer = farmers.find((farmer) => farmer.id === selectedFarmerId);
  const selectedPlot = selectedFarmer?.plots.find((plot) => plot.id === selectedPlotId);
  const selectedProgress = scheduleProgress.find(
    (progress) =>
      progress.farmerId === selectedFarmerId &&
      progress.plotId === selectedPlotId &&
      progress.cropId === selectedPlot?.cropName
  );
  const selectedHistory = scheduleHistory
    .filter(
      (entry) => entry.farmerId === selectedFarmerId && entry.plotId === selectedPlotId
    )
    .slice()
    .reverse();
  const completedSchedules = scheduleProgress.filter(
    (progress) => progress.status === "COMPLETED"
  );
  const selectedMaster = selectedPlot ? schedules[selectedPlot.cropName] : undefined;
  const maxReleaseDay = selectedMaster
    ? Math.max(
        0,
        ...selectedMaster.spraySchedules.map((item) => item.day),
        ...selectedMaster.fertilizerSchedules.map((item) => item.day)
      )
    : 0;

  const handleReleaseSchedule = async () => {
    if (!selectedFarmer || !selectedPlot) return;

    const alreadyReleased = selectedProgress?.totalDaysReleased || 0;
    const requestedDays = Number(setTotalDays);
    if (!Number.isInteger(requestedDays) || requestedDays < 1) {
      showNotification("error", tr("Set Days must be a positive whole number.", "दिवसांची संख्या शून्यापेक्षा मोठी पूर्णांक असावी."));
      return;
    }
    if (requestedDays <= alreadyReleased) {
      showNotification(
        "error",
        tr(
          `Set Days must be greater than the ${alreadyReleased} days already released.`,
          `दिवसांची संख्या आधीच सोडलेल्या ${alreadyReleased} दिवसांपेक्षा जास्त असावी.`
        )
      );
      return;
    }

    const firstNewDay = alreadyReleased + 1;
    const currentRange = alreadyReleased
      ? tr(`Day 1–${alreadyReleased}`, `दिवस १–${alreadyReleased}`)
      : tr("None", "नाही");
    if (
      !window.confirm(
        tr(
          `Current released schedule: ${currentRange}\nNew total schedule: Day 1–${requestedDays}\nNew days to be released: Day ${firstNewDay}–${requestedDays}\n\nContinue?`,
          `सध्या सोडलेले वेळापत्रक: ${currentRange}\nनवीन एकूण वेळापत्रक: दिवस १–${requestedDays}\nनवीन सोडले जाणारे दिवस: दिवस ${firstNewDay}–${requestedDays}\n\nपुढे सुरू ठेवायचे?`
        )
      )
    ) {
      return;
    }

    setReleaseSaving(true);
    try {
      const response = await fetch("/api/schedules/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: selectedFarmer.id,
          plotId: selectedPlot.id,
          totalDays: requestedDays,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        showNotification("error", result.message || tr("Unable to release schedule days.", "वेळापत्रकाचे दिवस सोडता आले नाहीत."));
        return;
      }

      setScheduleProgress((current) => [
        ...current.filter((entry) => entry.id !== result.progress.id),
        result.progress as ScheduleProgress,
      ]);
      setScheduleHistory((current) => [
        ...current.filter(
          (entry) =>
            entry.farmerId !== selectedFarmer.id || entry.plotId !== selectedPlot.id
        ),
        ...(result.history as ScheduleExtensionHistory[]),
      ]);
      setSetTotalDays("");
      showNotification("success", result.message || tr("Schedule days released.", "वेळापत्रकाचे दिवस सोडले."));
    } catch {
      showNotification("error", tr("Network error while releasing schedule days.", "वेळापत्रकाचे दिवस सोडताना नेटवर्क त्रुटी आली."));
    } finally {
      setReleaseSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            {tr("6. Set Days — Progressive Schedule Release", "६. दिवस निश्चित करा — टप्प्याटप्प्याने वेळापत्रक सोडणे")}
          </h1>
          <p className="text-xs text-slate-500">
            {tr(
              "Release a total crop-day limit for one farmer and plot. Previous days remain released and are never sent again.",
              "एका शेतकरी आणि शेतजमिनीसाठी पिकाच्या दिवसांची एकूण मर्यादा सोडा. आधी सोडलेले दिवस कायम राहतात आणि पुन्हा पाठवले जात नाहीत."
            )}
          </p>
        </div>
        {message && (
          <div
            role="status"
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              message.type === "success"
                ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                : "border-red-300 bg-red-100 text-red-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        {completedSchedules.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-950">
              <Clock className="h-4 w-4" />
              {tr("Schedule completed — ready for the next extension", "वेळापत्रक पूर्ण — पुढील वाढीसाठी तयार")}
            </p>
            <div className="space-y-1">
              {completedSchedules.map((progress) => {
                const farmer = farmers.find((entry) => entry.id === progress.farmerId);
                const plot = farmer?.plots.find((entry) => entry.id === progress.plotId);
                return (
                  <button
                    key={progress.id}
                    type="button"
                    onClick={() => {
                      setSelectedFarmerId(progress.farmerId);
                      setSelectedPlotId(progress.plotId);
                      setSetTotalDays("");
                    }}
                    className="block text-left text-xs text-amber-950 underline"
                  >
                    {farmer?.name || tr("Farmer", "शेतकरी")} — {plot?.cropName || progress.cropId},{" "}
                    {tr("Day", "दिवस")} {progress.lastDeliveredDay} {tr("completed", "पूर्ण")}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold text-slate-700">
            {tr("Farmer", "शेतकरी")}
            <select
              value={selectedFarmerId}
              onChange={(event) => {
                const farmer = farmers.find((entry) => entry.id === event.target.value);
                setSelectedFarmerId(event.target.value);
                setSelectedPlotId(farmer?.plots[0]?.id || "");
                setSetTotalDays("");
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
            >
              <option value="">{tr("Select farmer", "शेतकरी निवडा")}</option>
              {farmers.map((farmer) => (
                <option key={farmer.id} value={farmer.id}>
                  {farmer.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-700">
            {tr("Plot and crop", "शेतजमीन आणि पीक")}
            <select
              value={selectedPlotId}
              onChange={(event) => {
                setSelectedPlotId(event.target.value);
                setSetTotalDays("");
              }}
              disabled={!selectedFarmer?.plots.length}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
            >
              <option value="">{tr("Select plot", "शेतजमीन निवडा")}</option>
              {selectedFarmer?.plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.plotName} — {plot.cropName}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-700">
            {tr("Set total days", "एकूण दिवस निश्चित करा")}
            <input
              type="number"
              min={(selectedProgress?.totalDaysReleased || 0) + 1}
              max={maxReleaseDay || undefined}
              step={1}
              value={setTotalDays}
              onChange={(event) => setSetTotalDays(event.target.value)}
              placeholder={
                selectedPlot
                  ? maxReleaseDay > 0
                    ? tr(
                        `Enter ${((selectedProgress?.totalDaysReleased || 0) + 1)}–${maxReleaseDay}`,
                        `${((selectedProgress?.totalDaysReleased || 0) + 1)}–${maxReleaseDay} प्रविष्ट करा`
                      )
                    : tr("Enter total days", "एकूण दिवस प्रविष्ट करा")
                  : tr("Select a plot first", "आधी शेतजमीन निवडा")
              }
              disabled={!selectedPlot || releaseSaving}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
            />
          </label>
        </div>

        {selectedPlot && maxReleaseDay === 0 && (
          <p className="text-xs text-amber-800">
            {tr(
              "This crop has no days in its master schedule yet. Add spray or fertilizer days to the master schedule before releasing days.",
              "या पिकाच्या मास्टर वेळापत्रकात अद्याप दिवस नाहीत. दिवस सोडण्यापूर्वी मास्टर वेळापत्रकात फवारणी किंवा खताचे दिवस जोडा."
            )}
          </p>
        )}
        {selectedPlot &&
          maxReleaseDay > 0 &&
          maxReleaseDay <= (selectedProgress?.totalDaysReleased || 0) && (
            <p className="text-xs text-emerald-800">
              {tr(
                `All ${maxReleaseDay} master schedule days have already been released for this plot.`,
                `या शेतजमिनीसाठी मास्टर वेळापत्रकातील सर्व ${maxReleaseDay} दिवस आधीच सोडले आहेत.`
              )}
            </p>
          )}

        {selectedPlot && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p>
              <strong>{tr("Farmer:", "शेतकरी:")}</strong> {selectedFarmer?.name}
              {" · "}<strong>{tr("Crop:", "पीक:")}</strong> {selectedPlot.cropName}
              {" · "}<strong>{tr("Plot:", "शेतजमीन:")}</strong> {selectedPlot.plotName}
            </p>
            <p className="mt-1">
              <strong>{tr("Already released:", "आधीच सोडलेले:")}</strong> {selectedProgress?.totalDaysReleased || 0} {tr("days", "दिवस")}
              {" · "}<strong>{tr("Last delivered day:", "शेवटचा पाठवलेला दिवस:")}</strong> {selectedProgress?.lastDeliveredDay || 0}
              {" · "}<strong>{tr("Current day:", "सध्याचा दिवस:")}</strong> {selectedProgress?.currentDay || 0}
              {" · "}<strong>{tr("Status:", "स्थिती:")}</strong>{" "}
              {selectedProgress?.status === "COMPLETED"
                ? tr("Completed", "पूर्ण")
                : selectedProgress?.status === "ACTIVE"
                  ? tr("Active", "सक्रिय")
                  : tr("Not started", "सुरू झालेले नाही")}
            </p>
            <p className="mt-1">
              {selectedProgress
                ? tr(
                    `Released range: Day 1–${selectedProgress.totalDaysReleased}`,
                    `सोडलेली मर्यादा: दिवस १–${selectedProgress.totalDaysReleased}`
                  )
                : tr("No schedule days have been released.", "वेळापत्रकाचे दिवस सोडलेले नाहीत.")}
              {maxReleaseDay > 0 &&
                tr(
                  ` · Master schedule maximum: Day ${maxReleaseDay}`,
                  ` · मास्टर वेळापत्रकाची कमाल मर्यादा: दिवस ${maxReleaseDay}`
                )}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleReleaseSchedule}
          disabled={
            !selectedPlot ||
            !setTotalDays ||
            releaseSaving ||
            Number(setTotalDays) <= (selectedProgress?.totalDaysReleased || 0) ||
            Number(setTotalDays) > maxReleaseDay
          }
          className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {releaseSaving ? tr("Releasing...", "सोडत आहे...") : tr("Extend Schedule", "वेळापत्रक वाढवा")}
        </button>
      </section>

      {selectedHistory.length > 0 && (
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-bold text-slate-800">{tr("Schedule history", "वेळापत्रकाचा इतिहास")}</h2>
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="p-2">{tr("Action", "कृती")}</th>
                <th className="p-2">{tr("Previous total", "मागील एकूण")}</th>
                <th className="p-2">{tr("New total", "नवीन एकूण")}</th>
                <th className="p-2">{tr("Newly released", "नव्याने सोडलेले")}</th>
                <th className="p-2">{tr("Date", "तारीख")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedHistory.map((entry) => (
                <tr key={entry.id}>
                  <td className="p-2">
                    {entry.actionType === "INITIAL"
                      ? tr("Initial release", "प्रारंभिक सोडणे")
                      : tr("Extension", "वाढ")}
                  </td>
                  <td className="p-2">{entry.previousTotalDays}</td>
                  <td className="p-2">{entry.newTotalDays}</td>
                  <td className="p-2">
                    {tr("Day", "दिवस")} {entry.releasedStartDay}–{entry.releasedEndDay}
                  </td>
                  <td className="p-2">
                    {new Date(entry.createdAt).toLocaleString(lang === "mr" ? "mr-IN" : undefined)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

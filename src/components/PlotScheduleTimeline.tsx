"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Droplets,
  Plus,
  Send,
  SprayCan,
  Wheat,
} from "lucide-react";
import {
  formatScheduleDate,
  getFertilizerScheduledDate,
  getSprayScheduledDate,
} from "@/lib/schedule-date";
import {
  PersonalizedFertilizerItem,
  PersonalizedSprayItem,
  Plot,
  PlotScheduleTimeline as PlotScheduleTimelineData,
} from "@/types";

interface PlotScheduleTimelineProps {
  timeline: PlotScheduleTimelineData;
  language?: "en" | "mr";
  admin?: boolean;
  onEditSpray?: (item: PersonalizedSprayItem) => void;
  onDeleteSpray?: (itemId: string) => void;
  onEditFertilizer?: (item: PersonalizedFertilizerItem) => void;
  onDeleteFertilizer?: (itemId: string) => void;
  onToggleCompleted?: (type: "spray" | "fertilizer", itemId: string) => void;
  onAddSpray?: (day: number) => void;
  onAddFertilizer?: (day: number) => void;
  onSendWhatsApp?: (day: number) => void;
}

function statusLabel(status: string, language: "en" | "mr"): string {
  if (language === "mr") {
    if (status === "COMPLETED") return "पूर्ण";
    if (status === "TODAY") return "आज";
    return "येणार";
  }
  if (status === "COMPLETED") return "Completed";
  if (status === "TODAY") return "Today";
  return "Upcoming";
}

function scheduledItemDate(
  timeline: PlotScheduleTimelineData,
  item: PersonalizedSprayItem | PersonalizedFertilizerItem,
  language: "en" | "mr"
): string | null {
  const plot: Pick<Plot, "sowingDate"> = {
    sowingDate: timeline.progress?.scheduleStartDate || timeline.plot.sowingDate,
  };
  const date =
    "time" in item
      ? getSprayScheduledDate(plot, item)
      : getFertilizerScheduledDate(plot, item);
  return date ? formatScheduleDate(date, language) : null;
}

export function PlotScheduleTimeline({
  timeline,
  language = "en",
  admin = false,
  onEditSpray,
  onDeleteSpray,
  onEditFertilizer,
  onDeleteFertilizer,
  onToggleCompleted,
  onAddSpray,
  onAddFertilizer,
  onSendWhatsApp,
}: PlotScheduleTimelineProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(
    timeline.days.find((entry) => entry.status === "TODAY")?.day ??
      timeline.days[timeline.days.length - 1]?.day ??
      null
  );

  return (
    <section aria-label="Day-wise plot schedule" className="space-y-4">
      {timeline.days.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
          <p className="font-bold text-slate-700">
            {language === "mr" ? "अद्याप वेळापत्रक जारी केलेले नाही" : "No schedule days released yet"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {language === "mr"
              ? "वेळापत्रक जारी झाल्यावर ते येथे दिसेल."
              : "Released schedule days will appear here."}
          </p>
        </div>
      ) : (
        <ol className="space-y-3 border-l-2 border-emerald-100 pl-4 sm:pl-5">
          {timeline.days.map((entry) => {
            const expanded = selectedDay === entry.day;
            const isToday = entry.status === "TODAY";
            const hasItems = entry.sprays.length > 0 || entry.fertilizers.length > 0;
            const cardStyle = isToday
              ? "border-amber-300 bg-amber-50 shadow-sm"
              : entry.status === "COMPLETED"
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-slate-200 bg-white";

            return (
              <li key={entry.day} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute left-[-1.57rem] top-4 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${
                    isToday
                      ? "bg-amber-400 text-amber-950"
                      : entry.status === "COMPLETED"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-300 text-slate-700"
                  }`}
                >
                  {entry.status === "COMPLETED" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-current" />
                  )}
                </span>

                <div className={`overflow-hidden rounded-xl border ${cardStyle}`}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setSelectedDay(expanded ? null : entry.day)}
                    className="flex min-h-16 w-full items-center justify-between gap-3 p-3 text-left sm:p-4"
                  >
                    <span>
                      <span className="block text-sm font-extrabold text-slate-900">
                        {language === "mr" ? `दिवस ${entry.day}` : `Day ${entry.day}`}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        {formatScheduleDate(entry.date, language)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          isToday
                            ? "bg-amber-200 text-amber-950"
                            : entry.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {statusLabel(entry.status, language)}
                      </span>
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                    </span>
                  </button>

                  {expanded && (
                    <div className="space-y-3 border-t border-slate-200/80 bg-white p-3 sm:p-4">
                      {!hasItems && (
                        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                          {language === "mr"
                            ? "या दिवशी फवारणी किंवा खत देण्याचे नियोजन नाही."
                            : "No spray or fertilizer application is scheduled for this day."}
                        </p>
                      )}

                      {entry.sprays.map((item) => (
                        <article
                          key={item.id}
                          className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                              <SprayCan className="h-4 w-4 text-emerald-700" />
                              {item.medicineName}
                            </h4>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                              <Clock3 className="h-3.5 w-3.5" />
                              {item.time}
                            </span>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
                              item.isCompleted
                                ? "bg-emerald-100 text-emerald-800"
                                : isToday
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.isCompleted
                              ? "Marked completed"
                              : isToday
                                ? "Pending today"
                                : entry.status === "COMPLETED"
                                  ? "Not marked completed"
                                  : "Upcoming"}
                          </span>
                          <p className="text-xs text-slate-600">
                            {language === "mr" ? "पीक:" : "Crop:"} {timeline.plot.cropName}
                          </p>
                          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                            <p>
                              <span className="text-slate-500">
                                {language === "mr" ? "प्रमाण:" : "Quantity:"}
                              </span>{" "}
                              <strong>{item.quantity} {item.unit}</strong>
                            </p>
                            <p className="flex items-start gap-1">
                              <Droplets className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-700" />
                              <span>
                                <span className="text-slate-500">
                                  {language === "mr" ? "पाणी:" : "Water:"}
                                </span>{" "}
                                <strong>{item.waterQuantity}</strong>
                              </span>
                            </p>
                            {scheduledItemDate(timeline, item, language) && (
                              <p className="sm:col-span-2 text-slate-600">
                                {scheduledItemDate(timeline, item, language)}
                              </p>
                            )}
                          </div>
                          {item.note && (
                            <p className="border-t border-amber-200 pt-2 text-xs text-slate-700">
                              <strong>{language === "mr" ? "सूचना:" : "Note:"}</strong> {item.note}
                            </p>
                          )}
                          {admin && (
                            <div className="flex flex-wrap gap-2 border-t border-amber-200 pt-2">
                              <button
                                type="button"
                                onClick={() => onEditSpray?.(item)}
                                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                              >
                                Edit spray
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteSpray?.(item.id)}
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggleCompleted?.("spray", item.id)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
                              >
                                {item.isCompleted ? "Mark pending" : "Mark completed"}
                              </button>
                            </div>
                          )}
                        </article>
                      ))}

                      {entry.fertilizers.map((item) => (
                        <article
                          key={item.id}
                          className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3"
                        >
                          <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                            <Wheat className="h-4 w-4 text-emerald-700" />
                            {item.fertilizerName}
                          </h4>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
                              item.isCompleted
                                ? "bg-emerald-100 text-emerald-800"
                                : isToday
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.isCompleted
                              ? "Marked completed"
                              : isToday
                                ? "Pending today"
                                : entry.status === "COMPLETED"
                                  ? "Not marked completed"
                                  : "Upcoming"}
                          </span>
                          <p className="text-xs text-slate-600">
                            {language === "mr" ? "पीक:" : "Crop:"} {timeline.plot.cropName}
                            {" · "}{item.stage}
                          </p>
                          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                            <p>
                              <span className="text-slate-500">
                                {language === "mr" ? "प्रमाण:" : "Quantity:"}
                              </span>{" "}
                              <strong>{item.quantity} {item.unit}</strong>
                            </p>
                            <p>
                              <span className="text-slate-500">
                                {language === "mr" ? "पद्धत:" : "Method:"}
                              </span>{" "}
                              <strong>{item.applicationMethod}</strong>
                            </p>
                            {item.waterQuantity && (
                              <p>
                                <span className="text-slate-500">
                                  {language === "mr" ? "पाणी:" : "Water:"}
                                </span>{" "}
                                <strong>{item.waterQuantity}</strong>
                              </p>
                            )}
                            {scheduledItemDate(timeline, item, language) && (
                              <p className="text-slate-600">
                                {scheduledItemDate(timeline, item, language)}
                              </p>
                            )}
                          </div>
                          {item.note && (
                            <p className="border-t border-emerald-200 pt-2 text-xs text-slate-700">
                              <strong>{language === "mr" ? "सूचना:" : "Note:"}</strong> {item.note}
                            </p>
                          )}
                          {admin && (
                            <div className="flex flex-wrap gap-2 border-t border-emerald-200 pt-2">
                              <button
                                type="button"
                                onClick={() => onEditFertilizer?.(item)}
                                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                              >
                                Edit fertilizer
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteFertilizer?.(item.id)}
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggleCompleted?.("fertilizer", item.id)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
                              >
                                {item.isCompleted ? "Mark pending" : "Mark completed"}
                              </button>
                            </div>
                          )}
                        </article>
                      ))}

                      {admin && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onAddSpray?.(entry.day)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add spray
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddFertilizer?.(entry.day)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add fertilizer
                          </button>
                          {isToday && hasItems && onSendWhatsApp && (
                            <button
                              type="button"
                              onClick={() => onSendWhatsApp(entry.day)}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-xs font-bold text-white"
                            >
                              <Send className="h-3.5 w-3.5" /> Send today&apos;s schedule
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Camera,
  Download,
  FilePlus2,
  IndianRupee,
  Pencil,
  Printer,
  Search,
  Sprout,
  Trash2,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";
import { formatScheduleDate, getDateInIndia } from "@/lib/schedule-date";
import { FarmDiaryActivityType, FarmDiaryEntry, Farmer } from "@/types";

const ACTIVITY_TYPES: FarmDiaryActivityType[] = [
  "Spraying",
  "Fertilizer Application",
  "Pesticide Application",
  "Irrigation",
  "Labour",
  "Seeds",
  "Machinery",
  "Harvesting",
  "Other",
];
const UNITS = ["kg", "gm", "ltr", "ml", "bag", "ton", "piece", "hours"];
const MAX_PHOTO_BYTES = 1024 * 1024;
const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

type FarmerDiaryProfile = Pick<Farmer, "id" | "name" | "plots">;
type DiaryForm = {
  date: string;
  plotId: string;
  season: string;
  activityType: FarmDiaryActivityType;
  description: string;
  productName: string;
  quantity: string;
  unit: string;
  labourCost: string;
  productCost: string;
  otherExpenses: string;
  notes: string;
  photoDataUrl: string;
  removePhoto: boolean;
};

function seasonForDate(date: string): string {
  const [yearText, monthText] = date.split("-");
  const year = Number(yearText) || new Date().getFullYear();
  const month = Number(monthText) || new Date().getMonth() + 1;
  if (month >= 6 && month <= 9) return `Kharif ${year}`;
  if (month === 10 || month === 11 || month === 12) return `Rabi ${year}`;
  if (month <= 2) return `Rabi ${year}`;
  return `Summer ${year}`;
}

function emptyForm(plotId: string): DiaryForm {
  const date = getDateInIndia();
  return {
    date,
    plotId,
    season: seasonForDate(date),
    activityType: "Spraying",
    description: "",
    productName: "",
    quantity: "",
    unit: "kg",
    labourCost: "0",
    productCost: "0",
    otherExpenses: "0",
    notes: "",
    photoDataUrl: "",
    removePhoto: false,
  };
}

function expenseValue(value: string): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function labelActivity(type: FarmDiaryActivityType, lang: "en" | "mr"): string {
  if (lang === "en") return type;
  const labels: Record<FarmDiaryActivityType, string> = {
    Spraying: "फवारणी",
    "Fertilizer Application": "खत वापर",
    "Pesticide Application": "कीटकनाशक वापर",
    Irrigation: "सिंचन",
    Labour: "मजुरी",
    Seeds: "बियाणे",
    Machinery: "यंत्रसामग्री",
    Harvesting: "काढणी",
    Other: "इतर",
  };
  return labels[type];
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      reject(new Error("Choose a JPG, PNG, or WebP image."));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      reject(new Error("Photo must be smaller than 1 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the selected photo."));
    };
    reader.onerror = () => reject(new Error("Could not read the selected photo."));
    reader.readAsDataURL(file);
  });
}

export default function FarmerDiaryPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [farmer, setFarmer] = useState<FarmerDiaryProfile | null>(null);
  const [entries, setEntries] = useState<FarmDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [form, setForm] = useState<DiaryForm>(emptyForm(""));
  const [photoError, setPhotoError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterPlotId, setFilterPlotId] = useState("");
  const [filterCrop, setFilterCrop] = useState("");
  const [filterActivityType, setFilterActivityType] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [reportSeason, setReportSeason] = useState(seasonForDate(getDateInIndia()));
  const [reportPlotId, setReportPlotId] = useState("");
  const [reportVisible, setReportVisible] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    const loadDiary = async () => {
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
        const [farmerResponse, diaryResponse] = await Promise.all([
          fetch(`/api/farmers/${encodeURIComponent(user.id)}`, {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          }),
          fetch(`/api/farmers/${encodeURIComponent(user.id)}/diary`, {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          }),
        ]);
        if (farmerResponse.status === 401 || diaryResponse.status === 401) {
          localStorage.removeItem("agri_user");
          router.replace("/login");
          return;
        }
        const [farmerResult, diaryResult] = await Promise.all([
          farmerResponse.json(),
          diaryResponse.json(),
        ]);
        if (!farmerResponse.ok || !farmerResult.success || !farmerResult.farmer) {
          throw new Error(farmerResult.message || "Unable to load your farmer profile.");
        }
        if (!diaryResponse.ok || !diaryResult.success || !Array.isArray(diaryResult.entries)) {
          throw new Error(diaryResult.message || "Unable to load your farm diary.");
        }
        if (cancelled) return;
        setFarmer(farmerResult.farmer);
        setEntries(diaryResult.entries);
        setLoadError("");
        setForm((current) =>
          current.plotId || !farmerResult.farmer.plots[0]
            ? current
            : { ...current, plotId: farmerResult.farmer.plots[0].id }
        );
      } catch (error: unknown) {
        if (cancelled || controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Unable to load farm diary.";
        setLoadError(message);
        console.error("Farm diary load failed:", error);
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    };

    void loadDiary();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [refreshKey, router]);

  const plots = useMemo(() => farmer?.plots || [], [farmer?.plots]);
  const plotById = useMemo(() => new Map(plots.map((plot) => [plot.id, plot])), [plots]);
  const cropOptions = useMemo(
    () => [...new Set(plots.map((plot) => plot.cropName))].sort((a, b) => a.localeCompare(b)),
    [plots]
  );
  const selectedFormPlot = plotById.get(form.plotId);
  const calculatedExpense =
    expenseValue(form.productCost) + expenseValue(form.labourCost) + expenseValue(form.otherExpenses);

  const filteredEntries = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase();
    return entries
      .filter((entry) => !dateFrom || entry.date >= dateFrom)
      .filter((entry) => !dateTo || entry.date <= dateTo)
      .filter((entry) => !filterPlotId || entry.plotId === filterPlotId)
      .filter((entry) => !filterCrop || entry.cropName === filterCrop)
      .filter((entry) => !filterActivityType || entry.activityType === filterActivityType)
      .filter((entry) => {
        if (!query) return true;
        const plotName = plotById.get(entry.plotId)?.plotName || "";
        return [
          entry.description,
          entry.productName,
          entry.cropName,
          plotName,
          entry.activityType,
          entry.notes,
        ].some((value) => value.toLocaleLowerCase().includes(query));
      })
      .sort((a, b) =>
        sortOrder === "newest"
          ? b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
          : a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
      );
  }, [dateFrom, dateTo, entries, filterActivityType, filterCrop, filterPlotId, plotById, searchText, sortOrder]);

  const summaryEntries = filteredEntries;
  const totalExpenses = summaryEntries.reduce((sum, entry) => sum + entry.totalExpense, 0);
  const sprayingExpenses = summaryEntries
    .filter((entry) => entry.activityType === "Spraying" || entry.activityType === "Pesticide Application")
    .reduce((sum, entry) => sum + entry.totalExpense, 0);
  const fertilizerExpenses = summaryEntries
    .filter((entry) => entry.activityType === "Fertilizer Application")
    .reduce((sum, entry) => sum + entry.totalExpense, 0);
  const labourExpenses = summaryEntries.reduce((sum, entry) => sum + entry.labourCost, 0);
  const otherExpenses = summaryEntries.reduce((sum, entry) => sum + entry.otherExpenses, 0);
  const selectedPlotExpenses = entries
    .filter((entry) => filterPlotId && entry.plotId === filterPlotId)
    .reduce((sum, entry) => sum + entry.totalExpense, 0);
  const selectedCropExpenses = entries
    .filter((entry) => filterCrop && entry.cropName === filterCrop)
    .reduce((sum, entry) => sum + entry.totalExpense, 0);
  const todayExpenses = entries
    .filter((entry) => entry.date === getDateInIndia())
    .reduce((sum, entry) => sum + entry.totalExpense, 0);
  const currentMonth = getDateInIndia().slice(0, 7);
  const monthExpenses = entries
    .filter((entry) => entry.date.startsWith(currentMonth))
    .reduce((sum, entry) => sum + entry.totalExpense, 0);
  const filteredSeasonExpenses = summaryEntries
    .filter((entry) => entry.season === reportSeason)
    .reduce((sum, entry) => sum + entry.totalExpense, 0);

  const monthlyChart = useMemo(() => {
    const now = new Date(`${getDateInIndia()}T12:00:00`);
    return Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
      const key = monthDate.toISOString().slice(0, 7);
      const total = entries
        .filter((entry) => entry.date.startsWith(key))
        .reduce((sum, entry) => sum + entry.totalExpense, 0);
      return {
        key,
        label: new Intl.DateTimeFormat(lang === "mr" ? "mr-IN" : "en-IN", {
          month: "short",
          year: "2-digit",
          timeZone: "UTC",
        }).format(monthDate),
        total,
      };
    });
  }, [entries, lang]);
  const chartMax = Math.max(...monthlyChart.map((month) => month.total), 1);

  const availableSeasons = [...new Set(entries.map((entry) => entry.season).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const reportEntries = entries
    .filter((entry) => entry.season === reportSeason)
    .filter((entry) => !reportPlotId || entry.plotId === reportPlotId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const reportSpraying = reportEntries
    .filter((entry) => entry.activityType === "Spraying" || entry.activityType === "Pesticide Application")
    .reduce((sum, entry) => sum + entry.totalExpense, 0);
  const reportFertilizer = reportEntries
    .filter((entry) => entry.activityType === "Fertilizer Application")
    .reduce((sum, entry) => sum + entry.totalExpense, 0);
  const reportLabour = reportEntries.reduce((sum, entry) => sum + entry.labourCost, 0);
  const reportOther = reportEntries.reduce((sum, entry) => sum + entry.otherExpenses, 0);
  const reportTotal = reportEntries.reduce((sum, entry) => sum + entry.totalExpense, 0);

  const openNewEntry = () => {
    setEditingEntryId(null);
    setForm(emptyForm(filterPlotId || plots[0]?.id || ""));
    setFormError("");
    setPhotoError("");
    setFormOpen(true);
  };

  const openEditEntry = (entry: FarmDiaryEntry) => {
    setEditingEntryId(entry.id);
    setForm({
      date: entry.date,
      plotId: entry.plotId,
      season: entry.season,
      activityType: entry.activityType,
      description: entry.description,
      productName: entry.productName,
      quantity: entry.quantity === null ? "" : String(entry.quantity),
      unit: entry.unit || "kg",
      labourCost: String(entry.labourCost),
      productCost: String(entry.productCost),
      otherExpenses: String(entry.otherExpenses),
      notes: entry.notes,
      photoDataUrl: entry.photoDataUrl || "",
      removePhoto: false,
    });
    setFormError("");
    setPhotoError("");
    setFormOpen(true);
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const photoDataUrl = await readImage(file);
      setForm((current) => ({ ...current, photoDataUrl, removePhoto: false }));
      setPhotoError("");
    } catch (error: unknown) {
      setPhotoError(error instanceof Error ? error.message : "Could not read the selected photo.");
      event.target.value = "";
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!farmer) return;
    if (!selectedFormPlot) {
      setFormError(lang === "mr" ? "कृपया तुमचा प्लॉट निवडा." : "Select one of your plots.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const response = await fetch(
        editingEntryId
          ? `/api/farmers/${encodeURIComponent(farmer.id)}/diary/${encodeURIComponent(editingEntryId)}`
          : `/api/farmers/${encodeURIComponent(farmer.id)}/diary`,
        {
          method: editingEntryId ? "PUT" : "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: form.date,
            plotId: form.plotId,
            season: form.season,
            activityType: form.activityType,
            description: form.description,
            productName: form.productName,
            quantity: form.quantity === "" ? null : Number(form.quantity),
            unit: form.unit,
            labourCost: Number(form.labourCost),
            productCost: Number(form.productCost),
            otherExpenses: Number(form.otherExpenses),
            notes: form.notes,
            photoDataUrl: form.photoDataUrl || undefined,
            removePhoto: form.removePhoto,
          }),
        }
      );
      const result = await response.json();
      if (response.status === 401) {
        localStorage.removeItem("agri_user");
        router.replace("/login");
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save this diary entry.");
      }
      setFormOpen(false);
      setRefreshKey((current) => current + 1);
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "Unable to save this diary entry.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: FarmDiaryEntry) => {
    if (!farmer) return;
    const confirmed = window.confirm(
      lang === "mr"
        ? "ही नोंद कायमची हटवायची आहे का?"
        : "Are you sure you want to permanently delete this entry?"
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/farmers/${encodeURIComponent(farmer.id)}/diary/${encodeURIComponent(entry.id)}`,
        { method: "DELETE", credentials: "same-origin" }
      );
      const result = await response.json();
      if (response.status === 401) {
        localStorage.removeItem("agri_user");
        router.replace("/login");
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to delete this diary entry.");
      }
      setRefreshKey((current) => current + 1);
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "Unable to delete this diary entry.");
    }
  };

  const updateForm = (field: keyof DiaryForm, value: string | boolean) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "date" && typeof value === "string" && !editingEntryId) {
        next.season = seasonForDate(value);
      }
      return next;
    });
  };

  const cardLabels = lang === "mr"
    ? ["एकूण शेती खर्च", "फवारणी खर्च", "खत खर्च", "मजुरी खर्च", "इतर खर्च", "नोंदवलेल्या क्रिया"]
    : ["Total Farming Expenses", "Spraying Expenses", "Fertilizer Expenses", "Labour Expenses", "Other Expenses", "Activities Recorded"];
  const summaryCards = [
    { label: cardLabels[0], value: INR.format(totalExpenses), icon: IndianRupee, accent: "bg-emerald-100 text-emerald-800" },
    { label: cardLabels[1], value: INR.format(sprayingExpenses), icon: Sprout, accent: "bg-sky-100 text-sky-800" },
    { label: cardLabels[2], value: INR.format(fertilizerExpenses), icon: Sprout, accent: "bg-lime-100 text-lime-800" },
    { label: cardLabels[3], value: INR.format(labourExpenses), icon: IndianRupee, accent: "bg-amber-100 text-amber-800" },
    { label: cardLabels[4], value: INR.format(otherExpenses), icon: IndianRupee, accent: "bg-violet-100 text-violet-800" },
    { label: cardLabels[5], value: String(summaryEntries.length), icon: BookOpen, accent: "bg-slate-100 text-slate-800" },
  ];

  return (
    <main className="min-h-screen bg-slate-100 pb-10 text-slate-900">
      <header className="sticky top-0 z-30 bg-emerald-800 text-white shadow-md print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/farmer" className="inline-flex items-center gap-2 text-sm font-bold">
            <ArrowLeft className="h-4 w-4" />
            {lang === "mr" ? "मुख्य पान" : "Dashboard"}
          </Link>
          <span className="flex items-center gap-2 text-sm font-extrabold">
            <BookOpen className="h-4 w-4 text-amber-300" />
            {lang === "mr" ? "शेती डायरी" : "Farm Diary"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 pt-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center print:hidden">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {lang === "mr" ? "माझी शेती डायरी" : "My Farm Diary"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {lang === "mr"
                ? "तुमच्या शेतीच्या कामांची आणि खर्चाची नोंद ठेवा."
                : "Keep a record of farm activities and every expense."}
            </p>
          </div>
          <button
            type="button"
            onClick={openNewEntry}
            disabled={!farmer?.plots.length}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FilePlus2 className="h-5 w-5" />
            {lang === "mr" ? "+ नवीन नोंद जोडा" : "+ Add New Entry"}
          </button>
        </div>

        {loadError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 print:hidden">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setLoadError("");
                setRefreshKey((current) => current + 1);
              }}
              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold"
            >
              {lang === "mr" ? "पुन्हा प्रयत्न करा" : "Retry"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-600">
            {lang === "mr" ? "शेती डायरी लोड होत आहे..." : "Loading your farm diary..."}
          </div>
        ) : (
          <>
            <section aria-label={lang === "mr" ? "खर्च सारांश" : "Expense summary"} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 print:hidden">
              {summaryCards.map(({ label, value, icon: Icon, accent }) => (
                <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-xs font-semibold leading-4 text-slate-500">{label}</p>
                  <p className="mt-1 break-words text-base font-black text-slate-900">{value}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr] print:hidden">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-extrabold text-slate-900">
                      {lang === "mr" ? "मासिक खर्च" : "Monthly Expenses"}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {lang === "mr" ? "मागील ६ महिन्यांचा एकूण खर्च" : "Total expenses over the last 6 months"}
                    </p>
                  </div>
                  <CalendarDays className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="grid h-40 grid-cols-6 items-end gap-2 border-b border-slate-200 pb-2">
                  {monthlyChart.map((month) => (
                    <div key={month.key} className="flex h-full flex-col items-center justify-end gap-2">
                      <span className="max-w-full truncate text-[9px] font-semibold text-slate-500" title={INR.format(month.total)}>
                        {month.total ? INR.format(month.total) : "—"}
                      </span>
                      <div
                        className="w-full max-w-10 rounded-t-md bg-emerald-500 transition-all"
                        style={{ height: `${month.total ? Math.max(8, (month.total / chartMax) * 90) : 3}%` }}
                        role="img"
                        aria-label={`${month.label}: ${INR.format(month.total)}`}
                      />
                      <span className="text-[10px] font-bold text-slate-600">{month.label}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="font-extrabold text-slate-900">
                  {lang === "mr" ? "खर्चाचा आढावा" : "Expense Overview"}
                </h2>
                <div className="mt-4 space-y-3">
                  {[
                    [lang === "mr" ? "आजचा खर्च" : "Daily total", todayExpenses],
                    [lang === "mr" ? "या महिन्याचा खर्च" : "Monthly total", monthExpenses],
                    [lang === "mr" ? "निवडलेल्या प्लॉटचा खर्च" : "Selected plot total", selectedPlotExpenses],
                    [lang === "mr" ? "निवडलेल्या पिकाचा खर्च" : "Selected crop total", selectedCropExpenses],
                    [lang === "mr" ? "निवडलेल्या हंगामाचा खर्च" : "Selected season total", filteredSeasonExpenses],
                  ].map(([label, amount]) => (
                    <div key={String(label)} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-0">
                      <span className="text-slate-600">{label}</span>
                      <strong className="shrink-0 text-slate-900">{INR.format(Number(amount))}</strong>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  {lang === "mr"
                    ? "प्लॉट व पिकाचा खर्च नोंदींच्या वरील फिल्टरनुसार मोजला जातो."
                    : "Plot and crop totals follow the filters above the activity list."}
                </p>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 print:hidden">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {lang === "mr" ? "हंगामनिहाय अहवाल" : "Season-wise Report"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {lang === "mr" ? "हंगाम निवडा आणि तुमचा खर्च अहवाल तयार करा." : "Choose a season to prepare its farming expense report."}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    list="farm-diary-seasons"
                    value={reportSeason}
                    onChange={(event) => {
                      setReportSeason(event.target.value);
                      setReportVisible(false);
                    }}
                    aria-label={lang === "mr" ? "हंगाम" : "Report season"}
                    placeholder="Kharif 2026"
                    className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                  />
                  <datalist id="farm-diary-seasons">
                    {availableSeasons.map((season) => <option key={season} value={season} />)}
                  </datalist>
                  <select
                    value={reportPlotId}
                    onChange={(event) => {
                      setReportPlotId(event.target.value);
                      setReportVisible(false);
                    }}
                    aria-label={lang === "mr" ? "अहवालासाठी प्लॉट" : "Report plot"}
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="">{lang === "mr" ? "सर्व प्लॉट" : "All plots"}</option>
                    {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.plotName}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={!reportSeason.trim()}
                    onClick={() => setReportVisible(true)}
                    className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {lang === "mr" ? "अहवाल पहा" : "View Report"}
                  </button>
                </div>
              </div>
            </section>

            {reportVisible && (
              <section id="season-report" className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-6 print:border-0 print:p-0 print:shadow-none">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      {lang === "mr" ? "शेती खर्च अहवाल" : "Farm Expense Report"}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-900">{reportSeason}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {farmer?.name}
                      {reportPlotId && plotById.get(reportPlotId)
                        ? ` · ${plotById.get(reportPlotId)?.plotName} · ${plotById.get(reportPlotId)?.cropName}`
                        : lang === "mr" ? " · सर्व प्लॉट" : " · All plots"}
                    </p>
                  </div>
                  <div className="flex gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700"
                    >
                      <Download className="h-4 w-4" />
                      {lang === "mr" ? "PDF डाउनलोड" : "Download PDF"}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700"
                    >
                      <Printer className="h-4 w-4" />
                      {lang === "mr" ? "प्रिंट" : "Print"}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {[
                    [lang === "mr" ? "फवारणी" : "Spraying", reportSpraying],
                    [lang === "mr" ? "खत" : "Fertilizer", reportFertilizer],
                    [lang === "mr" ? "मजुरी" : "Labour", reportLabour],
                    [lang === "mr" ? "इतर" : "Other", reportOther],
                    [lang === "mr" ? "एकूण खर्च" : "Total expense", reportTotal],
                  ].map(([label, amount]) => (
                    <div key={String(label)} className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-800">{label}</p>
                      <p className="mt-1 text-sm font-black text-emerald-950">{INR.format(Number(amount))}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="mb-2 font-extrabold text-slate-900">
                    {lang === "mr" ? "संपूर्ण कामाचा इतिहास" : "Complete Activity History"}
                  </h3>
                  {reportEntries.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                      {lang === "mr" ? "या हंगामासाठी नोंदी नाहीत." : "No activities recorded for this season."}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left text-xs">
                        <thead className="border-b border-slate-200 text-slate-500">
                          <tr>
                            <th className="py-2 pr-3">{lang === "mr" ? "तारीख" : "Date"}</th>
                            <th className="py-2 pr-3">{lang === "mr" ? "प्लॉट / पीक" : "Plot / Crop"}</th>
                            <th className="py-2 pr-3">{lang === "mr" ? "क्रिया" : "Activity"}</th>
                            <th className="py-2 pr-3">{lang === "mr" ? "तपशील" : "Description"}</th>
                            <th className="py-2 text-right">{lang === "mr" ? "खर्च" : "Expense"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportEntries.map((entry) => (
                            <tr key={entry.id} className="border-b border-slate-100">
                              <td className="py-2 pr-3">{formatScheduleDate(entry.date, lang)}</td>
                              <td className="py-2 pr-3">{plotById.get(entry.plotId)?.plotName || "—"} · {entry.cropName}</td>
                              <td className="py-2 pr-3">{labelActivity(entry.activityType, lang)}</td>
                              <td className="py-2 pr-3">{entry.description}</td>
                              <td className="py-2 text-right font-bold">{INR.format(entry.totalExpense)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="space-y-3 print:hidden">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {lang === "mr" ? "कामाचा इतिहास" : "Farming Activity History"}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {lang === "mr" ? `${filteredEntries.length} नोंदी` : `${filteredEntries.length} records`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryOpen((open) => !open)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                >
                  {historyOpen
                    ? lang === "mr" ? "फिल्टर लपवा" : "Hide filters"
                    : lang === "mr" ? "फिल्टर दाखवा" : "Show filters"}
                </button>
              </div>

              {historyOpen && (
                <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-xs font-semibold text-slate-600">
                    {lang === "mr" ? "पासून तारीख" : "From date"}
                    <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-sm" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    {lang === "mr" ? "पर्यंत तारीख" : "To date"}
                    <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-sm" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    {lang === "mr" ? "प्लॉट" : "Plot"}
                    <select value={filterPlotId} onChange={(event) => setFilterPlotId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
                      <option value="">{lang === "mr" ? "सर्व प्लॉट" : "All plots"}</option>
                      {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.plotName}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    {lang === "mr" ? "पीक" : "Crop"}
                    <select value={filterCrop} onChange={(event) => setFilterCrop(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
                      <option value="">{lang === "mr" ? "सर्व पिके" : "All crops"}</option>
                      {cropOptions.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    {lang === "mr" ? "क्रियेचा प्रकार" : "Activity type"}
                    <select value={filterActivityType} onChange={(event) => setFilterActivityType(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
                      <option value="">{lang === "mr" ? "सर्व क्रिया" : "All activities"}</option>
                      {ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{labelActivity(type, lang)}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    {lang === "mr" ? "क्रम" : "Sort"}
                    <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
                      <option value="newest">{lang === "mr" ? "नवीन ते जुने" : "Newest first"}</option>
                      <option value="oldest">{lang === "mr" ? "जुने ते नवीन" : "Oldest first"}</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                    {lang === "mr" ? "शोधा" : "Search records"}
                    <span className="relative mt-1 block">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder={lang === "mr" ? "तपशील, उत्पादन, पीक..." : "Description, product, crop..."} className="min-h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm" />
                    </span>
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                        setFilterPlotId("");
                        setFilterCrop("");
                        setFilterActivityType("");
                        setSearchText("");
                        setSortOrder("newest");
                      }}
                      className="min-h-10 rounded-lg px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                    >
                      {lang === "mr" ? "फिल्टर साफ करा" : "Clear filters"}
                    </button>
                  </div>
                </div>
              )}

              {filteredEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    {entries.length === 0
                      ? lang === "mr" ? "अजून नोंदी नाहीत" : "No activities recorded yet"
                      : lang === "mr" ? "या फिल्टरसाठी नोंदी आढळल्या नाहीत" : "No records match these filters"}
                  </p>
                  {entries.length === 0 && (
                    <button type="button" onClick={openNewEntry} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white">
                      {lang === "mr" ? "पहिली नोंद जोडा" : "Add your first entry"}
                    </button>
                  )}
                </div>
              ) : (
                <ol className="space-y-3">
                  {filteredEntries.map((entry) => (
                    <li key={entry.id} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-900">
                              {labelActivity(entry.activityType, lang)}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              {formatScheduleDate(entry.date, lang)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{entry.season}</span>
                          </div>
                          <h3 className="mt-2 text-base font-extrabold text-slate-900">{entry.description}</h3>
                          <p className="mt-1 text-xs text-slate-600">
                            {plotById.get(entry.plotId)?.plotName || "—"} · {entry.cropName}
                            {entry.productName ? ` · ${entry.productName}` : ""}
                            {entry.quantity !== null ? ` · ${entry.quantity} ${entry.unit}` : ""}
                          </p>
                          {entry.notes && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{entry.notes}</p>}
                          {entry.photoDataUrl && (
                            <a href={entry.photoDataUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={entry.photoDataUrl} alt={lang === "mr" ? "क्रियेचा फोटो" : "Activity photo"} className="h-24 w-24 rounded-xl border border-slate-200 object-cover" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                          <strong className="text-lg font-black text-emerald-800">{INR.format(entry.totalExpense)}</strong>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => openEditEntry(entry)} aria-label={lang === "mr" ? "नोंद संपादित करा" : "Edit entry"} className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => void deleteEntry(entry)} aria-label={lang === "mr" ? "नोंद हटवा" : "Delete entry"} className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                        <span>{lang === "mr" ? "उत्पादन" : "Product"}: {INR.format(entry.productCost)}</span>
                        <span>{lang === "mr" ? "मजुरी" : "Labour"}: {INR.format(entry.labourCost)}</span>
                        <span>{lang === "mr" ? "इतर" : "Other"}: {INR.format(entry.otherExpenses)}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4 print:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setFormOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="farm-diary-entry-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="farm-diary-entry-title" className="text-lg font-black text-slate-900">
                  {editingEntryId
                    ? lang === "mr" ? "नोंद संपादित करा" : "Edit Diary Entry"
                    : lang === "mr" ? "नवीन नोंद जोडा" : "Add New Entry"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {lang === "mr" ? "तुमच्या शेतीच्या कामाचा तपशील भरा." : "Enter the details of your farming activity."}
                </p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} disabled={saving} aria-label="Close form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-800">{formError}</p>}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">
                  {lang === "mr" ? "तारीख" : "Date"} *
                  <input required type="date" value={form.date} onChange={(event) => updateForm("date", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  {lang === "mr" ? "प्लॉट निवडा" : "Select Plot"} *
                  <select required value={form.plotId} onChange={(event) => updateForm("plotId", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
                    <option value="">{lang === "mr" ? "प्लॉट निवडा" : "Choose a plot"}</option>
                    {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.plotName} · {plot.cropName}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">
                  {lang === "mr" ? "पीक" : "Crop Name"}
                  <input readOnly value={selectedFormPlot?.cropName || ""} placeholder={lang === "mr" ? "प्लॉट निवडल्यानंतर दिसेल" : "Selected plot crop"} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600" />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  {lang === "mr" ? "हंगाम" : "Season"} *
                  <input required maxLength={80} list="farm-diary-entry-seasons" value={form.season} onChange={(event) => updateForm("season", event.target.value)} placeholder="Kharif 2026" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </label>
                <datalist id="farm-diary-entry-seasons">
                  {availableSeasons.map((season) => <option key={season} value={season} />)}
                </datalist>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  {lang === "mr" ? "क्रियेचा प्रकार" : "Activity Type"} *
                  <select required value={form.activityType} onChange={(event) => updateForm("activityType", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
                    {ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{labelActivity(type, lang)}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  {lang === "mr" ? "कामाचा तपशील" : "Activity Description"} *
                  <input required maxLength={1000} value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder={lang === "mr" ? "उदा. उसावर कीटकनाशक फवारणी" : "e.g. Sprayed pesticide on sugarcane"} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  {lang === "mr" ? "उत्पादन / औषध / खताचे नाव" : "Product / Medicine / Fertilizer Name"}
                  <input maxLength={200} value={form.productName} onChange={(event) => updateForm("productName", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  {lang === "mr" ? "प्रमाण" : "Quantity"}
                  <input type="number" min="0" step="any" value={form.quantity} onChange={(event) => updateForm("quantity", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  {lang === "mr" ? "एकक" : "Unit"}
                  <select value={form.unit} onChange={(event) => updateForm("unit", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
                    {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">
                  {lang === "mr" ? "उत्पादन खर्च (₹)" : "Product Cost (₹)"}
                  <input required type="number" min="0" max="100000000" step="0.01" value={form.productCost} onChange={(event) => updateForm("productCost", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  {lang === "mr" ? "मजुरी खर्च (₹)" : "Labour Cost (₹)"}
                  <input required type="number" min="0" max="100000000" step="0.01" value={form.labourCost} onChange={(event) => updateForm("labourCost", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  {lang === "mr" ? "इतर खर्च (₹)" : "Other Expenses (₹)"}
                  <input required type="number" min="0" max="100000000" step="0.01" value={form.otherExpenses} onChange={(event) => updateForm("otherExpenses", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </label>
                <div className="flex min-h-11 items-center justify-between rounded-lg bg-emerald-50 px-3 text-sm">
                  <span className="font-bold text-emerald-900">{lang === "mr" ? "एकूण खर्च" : "Total Expense"}</span>
                  <strong className="text-base text-emerald-900">{INR.format(calculatedExpense)}</strong>
                </div>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  {lang === "mr" ? "टिप्पणी" : "Notes"}
                  <textarea rows={3} maxLength={2000} value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <div className="sm:col-span-2">
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Camera className="h-4 w-4" />
                    {lang === "mr" ? "फोटो जोडा (ऐच्छिक)" : "Upload Photo (optional)"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handlePhotoChange(event)} className="sr-only" />
                  </label>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {lang === "mr" ? "JPG, PNG किंवा WebP · कमाल 1 MB" : "JPG, PNG, or WebP · max 1 MB"}
                  </p>
                  {photoError && <p role="alert" className="mt-1 text-xs text-red-700">{photoError}</p>}
                  {form.photoDataUrl && (
                    <div className="mt-2 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.photoDataUrl} alt={lang === "mr" ? "निवडलेला फोटो" : "Selected activity photo"} className="h-16 w-16 rounded-lg object-cover" />
                      <button type="button" onClick={() => setForm((current) => ({ ...current, photoDataUrl: "", removePhoto: true }))} className="text-xs font-bold text-red-700">
                        {lang === "mr" ? "फोटो काढा" : "Remove photo"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="min-h-11 rounded-lg border border-slate-300 px-5 text-sm font-bold text-slate-700 disabled:opacity-50">
                  {lang === "mr" ? "रद्द करा" : "Cancel"}
                </button>
                <button type="submit" disabled={saving || !plots.length} className="min-h-11 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white disabled:opacity-50">
                  {saving
                    ? lang === "mr" ? "जतन होत आहे..." : "Saving..."
                    : lang === "mr" ? "नोंद जतन करा" : "Save Entry"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

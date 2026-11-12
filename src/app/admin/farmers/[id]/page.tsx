"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Users,
  ArrowLeft,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Grid,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle,
  AlertCircle,
  SprayCan,
  Wheat,
  Send,
  RotateCcw,
  Clock,
  Sparkles,
  Droplets,
  Lock,
} from "lucide-react";
import { formatArea, calculateTotalGuntha } from "@/lib/area";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  dateFromCropDay,
  formatScheduleDate,
  getDateInIndia,
} from "@/lib/schedule-date";
import { WhatsAppModal } from "@/components/WhatsAppModal";
import { PlotScheduleTimeline } from "@/components/PlotScheduleTimeline";
import { useLanguage } from "@/components/LanguageContext";
import {
  generateSprayWhatsAppMessage,
  generateFertilizerWhatsAppMessage,
} from "@/lib/whatsapp";
import {
  Farmer,
  Plot,
  PersonalizedSprayItem,
  PersonalizedFertilizerItem,
  Medicine,
  Fertilizer,
  ScheduleTime,
  ScheduleProgress,
  ScheduleExtensionHistory,
  PlotScheduleTimeline as PlotScheduleTimelineData,
  FarmDiaryEntry,
  ShopProfile,
  MasterCropSchedule,
} from "@/types";

const formatRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const localize = (language: "en" | "mr", en: string, mr: string) =>
  language === "mr" ? mr : en;

export default function FarmerDetailsPage() {
  const { lang } = useLanguage();
  const tr = (en: string, mr: string) => localize(lang, en, mr);
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([]);
  const [crops, setCrops] = useState<string[]>([]);
  const [scheduleProgress, setScheduleProgress] = useState<ScheduleProgress[]>([]);
  const [scheduleHistory, setScheduleHistory] = useState<ScheduleExtensionHistory[]>([]);
  const [farmDiaryEntries, setFarmDiaryEntries] = useState<FarmDiaryEntry[]>([]);
  const [masterSchedules, setMasterSchedules] = useState<Record<string, MasterCropSchedule>>({});
  const [plotTimeline, setPlotTimeline] = useState<PlotScheduleTimelineData | null>(null);
  const [plotTimelineLoading, setPlotTimelineLoading] = useState(false);
  const [plotTimelineError, setPlotTimelineError] = useState("");
  const [plotTimelineRefresh, setPlotTimelineRefresh] = useState(0);
  const [setTotalDays, setSetTotalDays] = useState("");
  const [releaseSaving, setReleaseSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [credentialsForm, setCredentialsForm] = useState({ username: "", password: "" });

  // Selected plot for viewing & customization
  const [selectedPlotId, setSelectedPlotId] = useState<string>("");
  const [scheduleViewTab, setScheduleViewTab] = useState<"spray" | "fertilizer">("spray");

  // Edit / Add Spray Item Modal or Form
  const [showSprayForm, setShowSprayForm] = useState(false);
  const [editingSprayId, setEditingSprayId] = useState<string | null>(null);
  const [sprayForm, setSprayForm] = useState<{
    day: number;
    scheduledDate: string;
    time: ScheduleTime;
    medicineId: string;
    medicineName: string;
    quantity: string;
    unit: string;
    waterQuantity: string;
    note: string;
  }>({
    day: 10,
    scheduledDate: getDateInIndia(),
    time: "Morning",
    medicineId: "",
    medicineName: "",
    quantity: "20",
    unit: "ml",
    waterQuantity: "15 Litres",
    note: "",
  });

  // Edit / Add Fertilizer Item Modal or Form
  const [showFertForm, setShowFertForm] = useState(false);
  const [editingFertId, setEditingFertId] = useState<string | null>(null);
  const [fertForm, setFertForm] = useState<{
    day: number;
    scheduledDate: string;
    stage: string;
    fertilizerId: string;
    fertilizerName: string;
    quantity: string;
    unit: string;
    applicationMethod: string;
    waterQuantity: string;
    note: string;
  }>({
    day: 15,
    scheduledDate: getDateInIndia(),
    stage: "Vegetative Stage",
    fertilizerId: "",
    fertilizerName: "",
    quantity: "5",
    unit: "kg",
    applicationMethod: "Drip Irrigation",
    waterQuantity: "",
    note: "",
  });

  // Add Plot Modal
  const [showAddPlotModal, setShowAddPlotModal] = useState(false);
  const [newPlotForm, setNewPlotForm] = useState({
    plotName: "Plot 2",
    cropName: "Tomato",
    sowingDate: "",
    areaAcre: 1,
    areaGuntha: 0,
  });

  // WhatsApp Modal
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
      const [resFarmer, resGen, resMed, resSched, resRelease, resDiary] = await Promise.all([
        fetchWithTimeout(`/api/farmers/${encodeURIComponent(id)}`),
        fetchWithTimeout("/api/masters/general"),
        fetchWithTimeout("/api/masters/medicines"),
        fetchWithTimeout("/api/schedules/master"),
        fetchWithTimeout("/api/schedules/release"),
        fetchWithTimeout(`/api/farmers/${encodeURIComponent(id)}/diary`),
      ]);

      if (
        [resFarmer, resGen, resMed, resSched, resRelease, resDiary].some(
          (response) => response.status === 401
        )
      ) {
        setSessionExpired(true);
        setLoadError(tr("Your session has expired. Please log in again.", "तुमचे सत्र कालबाह्य झाले आहे. कृपया पुन्हा लॉग इन करा."));
        router.replace("/login");
        return;
      }

      const jsonFarmer = await resFarmer.json();
      const jsonGen = await resGen.json();
      const jsonMed = await resMed.json();
      const jsonSched = await resSched.json();
      const jsonRelease = await resRelease.json();
      const jsonDiary = await resDiary.json();

      if (!resFarmer.ok || !jsonFarmer.success || !jsonFarmer.farmer) {
        throw new Error(jsonFarmer.message || jsonFarmer.error || tr("Unable to load farmer details.", "शेतकऱ्याची माहिती लोड करता आली नाही."));
      }
      setFarmer(jsonFarmer.farmer);
      setCredentialsForm({ username: jsonFarmer.farmer.username, password: "" });
      setScheduleProgress(jsonFarmer.scheduleProgress || []);
      if (!resDiary.ok || !jsonDiary.success || !Array.isArray(jsonDiary.entries)) {
        throw new Error(jsonDiary.message || tr("Unable to load farmer diary records.", "शेतकऱ्याच्या डायरीतील नोंदी लोड करता आल्या नाहीत."));
      }
      setFarmDiaryEntries(jsonDiary.entries);
      if (jsonFarmer.farmer.plots.length > 0 && !selectedPlotId) {
        const requestedPlotId = new URLSearchParams(window.location.search).get("plotId");
        const requestedPlot = jsonFarmer.farmer.plots.find(
          (plot: Plot) => plot.id === requestedPlotId
        );
        setSelectedPlotId(requestedPlot?.id || jsonFarmer.farmer.plots[0].id);
      }

      if (jsonGen.success && jsonGen.data?.shop) {
        setShop(jsonGen.data.shop);
      }

      if (jsonMed.success) {
        setMedicines(jsonMed.data.medicines || []);
        setFertilizers(jsonMed.data.fertilizers || []);
        if (jsonMed.data.medicines?.[0]) {
          setSprayForm((prev) => ({
            ...prev,
            medicineId: jsonMed.data.medicines[0].id,
            medicineName: jsonMed.data.medicines[0].name,
            unit: jsonMed.data.medicines[0].unitShortName,
          }));
        }
        if (jsonMed.data.fertilizers?.[0]) {
          setFertForm((prev) => ({
            ...prev,
            fertilizerId: jsonMed.data.fertilizers[0].id,
            fertilizerName: jsonMed.data.fertilizers[0].name,
            unit: jsonMed.data.fertilizers[0].unit,
          }));
        }
      }

      if (jsonSched.success && jsonSched.masterSchedules) {
        setMasterSchedules(jsonSched.masterSchedules);
        setCrops(Object.keys(jsonSched.masterSchedules));
      }

      if (jsonRelease.success) {
        setScheduleHistory(jsonRelease.history || []);
      }
      setLoadError("");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : tr("Unable to load farmer details.", "शेतकऱ्याची माहिती लोड करता आली नाही.");
      setLoadError(errorMessage);
      console.error("Farmer details load failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (!selectedPlotId || !farmer) {
      return;
    }

    let cancelled = false;
    setPlotTimeline(null);
    setPlotTimelineLoading(true);
    setPlotTimelineError("");
    fetchWithTimeout(`/api/farmers/${encodeURIComponent(id)}/plots/${encodeURIComponent(selectedPlotId)}/schedule`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success || !result.timeline) {
          throw new Error(result.message || localize(lang, "Unable to load plot schedule timeline.", "शेतजमिनीचे वेळापत्रक लोड करता आले नाही."));
        }
        if (!cancelled) setPlotTimeline(result.timeline);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        const errorText =
          loadError instanceof Error ? loadError.message : localize(lang, "Unable to load plot schedule timeline.", "शेतजमिनीचे वेळापत्रक लोड करता आले नाही.");
        setPlotTimelineError(errorText);
      })
      .finally(() => {
        if (!cancelled) setPlotTimelineLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [farmer, id, lang, selectedPlotId, plotTimelineRefresh]);

  const visiblePlotTimeline =
    plotTimeline?.plot.id === selectedPlotId ? plotTimeline : null;

  const showNotification = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmer || savingAction) return;

    setSavingAction("credentials");
    try {
      const response = await fetchWithTimeout(`/api/farmers/${farmer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: credentialsForm.username,
          ...(credentialsForm.password ? { password: credentialsForm.password } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.farmer) {
        throw new Error(
          result.message || result.error || tr("Unable to update login credentials.", "लॉगिन तपशील अद्ययावत करता आले नाहीत.")
        );
      }

      setFarmer(result.farmer);
      setCredentialsForm({ username: result.farmer.username, password: "" });
      showNotification("success", tr("Farmer login credentials updated.", "शेतकऱ्याचे लॉगिन तपशील अद्ययावत केले."));
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error
          ? error.message
          : tr("Unable to update login credentials.", "लॉगिन तपशील अद्ययावत करता आले नाहीत.")
      );
    } finally {
      setSavingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div role="alert" className="mx-auto mt-8 max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-600" />
        <p className="text-sm text-slate-800">{loadError || tr("Unable to load this farmer.", "या शेतकऱ्याची माहिती लोड करता आली नाही.")}</p>
        {sessionExpired ? (
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
          >
            {tr("Log in", "लॉग इन करा")}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadData();
            }}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
          >
            {tr("Retry", "पुन्हा प्रयत्न करा")}
          </button>
        )}
      </div>
    );
  }
  const selectedPlot = (farmer.plots || []).find((p) => p.id === selectedPlotId) || (farmer.plots || [])[0];
  const selectedScheduleProgress = scheduleProgress.find(
    (progress) =>
      progress.farmerId === farmer.id &&
      progress.plotId === selectedPlot?.id &&
      progress.cropId === selectedPlot?.cropName
  );
  const selectedMasterSchedule = selectedPlot
    ? masterSchedules[selectedPlot.cropName]
    : undefined;
  const maxReleaseDay = selectedMasterSchedule
    ? Math.max(
        0,
        ...selectedMasterSchedule.spraySchedules.map((item) => item.day),
        ...selectedMasterSchedule.fertilizerSchedules.map((item) => item.day)
      )
    : 0;
  const alreadyReleasedDays = selectedScheduleProgress?.totalDaysReleased || 0;
  const canExtendSchedule =
    Boolean(selectedPlot) &&
    maxReleaseDay > alreadyReleasedDays &&
    Number.isInteger(Number(setTotalDays)) &&
    Number(setTotalDays) > alreadyReleasedDays &&
    Number(setTotalDays) <= maxReleaseDay;

  const handleReleaseSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPlot || !canExtendSchedule) return;

    const requestedDays = Number(setTotalDays);
    const firstNewDay = alreadyReleasedDays + 1;
    if (
      !window.confirm(
        tr(
          `Current released schedule: ${
            alreadyReleasedDays ? `Day 1–${alreadyReleasedDays}` : "None"
          }\nNew total schedule: Day 1–${requestedDays}\nNew days to be released: Day ${firstNewDay}–${requestedDays}\n\nContinue?`,
          `सध्या सोडलेले वेळापत्रक: ${
            alreadyReleasedDays ? `दिवस १–${alreadyReleasedDays}` : "नाही"
          }\nनवीन एकूण वेळापत्रक: दिवस १–${requestedDays}\nनवीन सोडले जाणारे दिवस: दिवस ${firstNewDay}–${requestedDays}\n\nपुढे सुरू ठेवायचे?`
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
          farmerId: farmer.id,
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
            entry.farmerId !== farmer.id || entry.plotId !== selectedPlot.id
        ),
        ...(result.history as ScheduleExtensionHistory[]),
      ]);
      setSetTotalDays("");
      setPlotTimelineRefresh((current) => current + 1);
      showNotification("success", result.message || tr("Schedule days released.", "वेळापत्रकाचे दिवस सोडले."));
    } catch {
      showNotification("error", tr("Network error while releasing schedule days.", "वेळापत्रकाचे दिवस सोडताना नेटवर्क त्रुटी आली."));
    } finally {
      setReleaseSaving(false);
    }
  };

  const latestScheduleRelease = scheduleHistory
    .filter(
      (entry) =>
        entry.farmerId === farmer.id &&
        entry.plotId === selectedPlot?.id &&
        entry.cropId === selectedPlot?.cropName
    )
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const canSendWhatsAppForDay = (day: number) =>
    Boolean(
      selectedScheduleProgress &&
        latestScheduleRelease &&
        day <= selectedScheduleProgress.totalDaysReleased &&
        day >= latestScheduleRelease.releasedStartDay &&
        day <= latestScheduleRelease.releasedEndDay
    );

  // 1. WhatsApp Spray trigger
  const handleOpenSprayWhatsApp = (item: PersonalizedSprayItem) => {
    if (!canSendWhatsAppForDay(item.day)) {
      showNotification("error", tr("WhatsApp is available only for days in the latest released extension.", "WhatsApp फक्त अलीकडे सोडलेल्या दिवसांसाठी उपलब्ध आहे."));
      return;
    }
    if (!shop || !selectedPlot) return;
    const msg = generateSprayWhatsAppMessage({
      shopName: shop.name,
      shopContact: shop.mobile,
      farmerName: farmer.name,
      farmerMobile: farmer.whatsapp || farmer.mobile,
      cropName: selectedPlot.cropName,
      plotName: selectedPlot.plotName,
      totalGuntha: selectedPlot.totalGuntha,
      day: item.day,
      time: item.time,
      medicineName: item.medicineName,
      quantity: item.quantity,
      unit: item.unit,
      waterQuantity: item.waterQuantity,
      note: item.note,
    });

    setWaModal({
      isOpen: true,
      farmerName: farmer.name,
      whatsappNumber: farmer.whatsapp || farmer.mobile,
      message: msg,
    });
  };

  // 2. WhatsApp Fertilizer trigger
  const handleOpenFertilizerWhatsApp = (item: PersonalizedFertilizerItem) => {
    if (!canSendWhatsAppForDay(item.day)) {
      showNotification("error", tr("WhatsApp is available only for days in the latest released extension.", "WhatsApp फक्त अलीकडे सोडलेल्या दिवसांसाठी उपलब्ध आहे."));
      return;
    }
    if (!shop || !selectedPlot) return;
    const msg = generateFertilizerWhatsAppMessage({
      shopName: shop.name,
      shopContact: shop.mobile,
      farmerName: farmer.name,
      farmerMobile: farmer.whatsapp || farmer.mobile,
      cropName: selectedPlot.cropName,
      plotName: selectedPlot.plotName,
      totalGuntha: selectedPlot.totalGuntha,
      day: item.day,
      stage: item.stage,
      fertilizerName: item.fertilizerName,
      quantity: item.quantity,
      unit: item.unit,
      applicationMethod: item.applicationMethod,
      waterQuantity: item.waterQuantity,
      note: item.note,
    });

    setWaModal({
      isOpen: true,
      farmerName: farmer.name,
      whatsappNumber: farmer.whatsapp || farmer.mobile,
      message: msg,
    });
  };

  const handleOpenTimelineWhatsApp = (dayNumber: number) => {
    const day = visiblePlotTimeline?.days.find((entry) => entry.day === dayNumber);
    if (
      !day ||
      day.status !== "TODAY" ||
      !selectedScheduleProgress ||
      day.day > selectedScheduleProgress.totalDaysReleased
    ) {
      showNotification("error", tr("Only today's released schedule can be sent.", "फक्त आजचे सोडलेले वेळापत्रक पाठवता येते."));
      return;
    }
    if (!shop || !selectedPlot) return;

    const entries = [
      ...day.sprays.map(
        (item) =>
          `Time: ${item.time}\nMedicine: ${item.medicineName}\nQuantity: ${item.quantity} ${item.unit}\nWater: ${item.waterQuantity}${item.note ? `\nNote: ${item.note}` : ""}`
      ),
      ...day.fertilizers.map(
        (item) =>
          `Fertilizer: ${item.fertilizerName}\nQuantity: ${item.quantity} ${item.unit}\nMethod: ${item.applicationMethod}${item.waterQuantity ? `\nWater: ${item.waterQuantity}` : ""}${item.note ? `\nNote: ${item.note}` : ""}`
      ),
    ];
    const message = [
      `🌾 ${shop.name}`,
      "Today's Crop Schedule",
      `Farmer: ${farmer.name}`,
      `Crop: ${selectedPlot.cropName}`,
      `Plot: ${selectedPlot.plotName} (${formatArea(selectedPlot.totalGuntha).formatted})`,
      `Day: ${day.day}`,
      `Date: ${formatScheduleDate(day.date, "en")}`,
      "",
      entries.join("\n\n"),
    ].join("\n");

    setWaModal({
      isOpen: true,
      farmerName: farmer.name,
      whatsappNumber: farmer.whatsapp || farmer.mobile,
      message,
    });
  };

  const handleEditTimelineSpray = (item: PersonalizedSprayItem) => {
    if (!selectedPlot || savingAction) return;
    setEditingSprayId(item.id);
    setSprayForm({
      day: item.day,
      scheduledDate:
        item.scheduledDate ||
        dateFromCropDay(selectedPlot.sowingDate, item.day) ||
        getDateInIndia(),
      time: item.time,
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      quantity: item.quantity,
      unit: item.unit,
      waterQuantity: item.waterQuantity,
      note: item.note,
    });
    setShowSprayForm(true);
  };

  const handleEditTimelineFertilizer = (item: PersonalizedFertilizerItem) => {
    if (!selectedPlot || savingAction) return;
    setEditingFertId(item.id);
    setFertForm({
      day: item.day,
      scheduledDate:
        item.scheduledDate ||
        dateFromCropDay(selectedPlot.sowingDate, item.day) ||
        getDateInIndia(),
      stage: item.stage,
      fertilizerId: item.fertilizerId,
      fertilizerName: item.fertilizerName,
      quantity: item.quantity,
      unit: item.unit,
      applicationMethod: item.applicationMethod,
      waterQuantity: item.waterQuantity || "",
      note: item.note,
    });
    setShowFertForm(true);
  };

  const handleToggleTimelineCompleted = async (
    type: "spray" | "fertilizer",
    itemId: string
  ) => {
    if (!selectedPlot || savingAction) return;
    setSavingAction("toggle");
    try {
      const response = await fetchWithTimeout(
        `/api/farmers/${farmer.id}/plots/${selectedPlot.id}/schedule`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "TOGGLE_COMPLETED", type, itemId }),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || tr("Unable to update schedule completion.", "वेळापत्रक पूर्ण झाल्याची स्थिती अद्ययावत करता आली नाही."));
      }

      const updatedPlots = farmer.plots.map((plot) =>
        plot.id === selectedPlot.id ? result.plot : plot
      );
      setFarmer({ ...farmer, plots: updatedPlots });
      showNotification("success", tr("Schedule completion updated for this plot.", "या शेतजमिनीच्या वेळापत्रकाची पूर्णता अद्ययावत केली."));
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : tr("Unable to update schedule completion.", "वेळापत्रक पूर्ण झाल्याची स्थिती अद्ययावत करता आली नाही.")
      );
    } finally {
      setSavingAction(null);
    }
  };

  // 3. Save / Update Personalized Spray Schedule item
  const handleSaveSprayItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlot || savingAction) return;
    setSavingAction("spray");

    const action = editingSprayId ? "UPDATE_SPRAY" : "ADD_SPRAY";
    const payload = {
      action,
      item: {
        id: editingSprayId || undefined,
        day: Number(sprayForm.day),
        scheduledDate: sprayForm.scheduledDate,
        time: sprayForm.time,
        medicineId: sprayForm.medicineId,
        medicineName: sprayForm.medicineName,
        quantity: sprayForm.quantity,
        unit: sprayForm.unit,
        waterQuantity: sprayForm.waterQuantity,
        note: sprayForm.note,
      },
    };

    try {
      const res = await fetchWithTimeout(`/api/farmers/${farmer.id}/plots/${selectedPlot.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || tr("Failed to save spray schedule.", "फवारणीचे वेळापत्रक जतन करता आले नाही."));
      }
      if (json.success) {
        // Update local farmer state
        const updatedPlots = farmer.plots.map((p) =>
          p.id === selectedPlot.id ? json.plot : p
        );
        setFarmer({ ...farmer, plots: updatedPlots });
        setShowSprayForm(false);
        setEditingSprayId(null);
        showNotification(
          "success",
          tr(
            `Spray customized for ${farmer.name}'s plot only! (Master Schedule unchanged)`,
            `${farmer.name} यांच्या शेतजमिनीसाठी फवारणीचे वेळापत्रक बदलले! (मास्टर वेळापत्रक बदललेले नाही)`
          )
        );
      }
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : tr("Failed to update personalized spray schedule.", "वैयक्तिक फवारणीचे वेळापत्रक अद्ययावत करता आले नाही.")
      );
    } finally {
      setSavingAction(null);
    }
  };

  const handleDeleteSprayItem = async (itemId: string) => {
    if (savingAction) return;
    if (!confirm(tr("Are you sure you want to remove this spray day from this farmer's plot?", "या शेतकऱ्याच्या शेतजमिनीवरील हा फवारणीचा दिवस हटवायचा आहे का?")))
      return;
    setSavingAction("spray");
    try {
      const res = await fetchWithTimeout(`/api/farmers/${farmer.id}/plots/${selectedPlot.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_SPRAY", itemId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || tr("Failed to delete spray schedule item.", "फवारणीच्या वेळापत्रकातील नोंद हटवता आली नाही."));
      }
      if (json.success) {
        const updatedPlots = farmer.plots.map((p) =>
          p.id === selectedPlot.id ? json.plot : p
        );
        setFarmer({ ...farmer, plots: updatedPlots });
        showNotification("success", tr("Spray day removed from this plot schedule", "या शेतजमिनीच्या वेळापत्रकातून फवारणीचा दिवस हटवला"));
      }
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : tr("Failed to delete spray schedule item.", "फवारणीच्या वेळापत्रकातील नोंद हटवता आली नाही.")
      );
    } finally {
      setSavingAction(null);
    }
  };

  // 4. Save / Update Personalized Fertilizer Schedule item
  const handleSaveFertItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlot || savingAction) return;
    setSavingAction("fertilizer");

    const action = editingFertId ? "UPDATE_FERTILIZER" : "ADD_FERTILIZER";
    const payload = {
      action,
      item: {
        id: editingFertId || undefined,
        day: Number(fertForm.day),
        scheduledDate: fertForm.scheduledDate,
        stage: fertForm.stage,
        fertilizerId: fertForm.fertilizerId,
        fertilizerName: fertForm.fertilizerName,
        quantity: fertForm.quantity,
        unit: fertForm.unit,
        applicationMethod: fertForm.applicationMethod,
        waterQuantity: fertForm.waterQuantity,
        note: fertForm.note,
      },
    };

    try {
      const res = await fetchWithTimeout(`/api/farmers/${farmer.id}/plots/${selectedPlot.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || tr("Failed to save fertilizer schedule.", "खताचे वेळापत्रक जतन करता आले नाही."));
      }
      if (json.success) {
        const updatedPlots = farmer.plots.map((p) =>
          p.id === selectedPlot.id ? json.plot : p
        );
        setFarmer({ ...farmer, plots: updatedPlots });
        setShowFertForm(false);
        setEditingFertId(null);
        showNotification(
          "success",
          tr(
            `Fertilizer customized for ${farmer.name}'s plot only! (Master Schedule unchanged)`,
            `${farmer.name} यांच्या शेतजमिनीसाठी खताचे वेळापत्रक बदलले! (मास्टर वेळापत्रक बदललेले नाही)`
          )
        );
      }
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : tr("Failed to update fertilizer schedule.", "खताचे वेळापत्रक अद्ययावत करता आले नाही.")
      );
    } finally {
      setSavingAction(null);
    }
  };

  const handleDeleteFertItem = async (itemId: string) => {
    if (savingAction) return;
    if (!confirm(tr("Are you sure you want to remove this fertilizer stage from this plot?", "या शेतजमिनीवरील खताचा हा टप्पा हटवायचा आहे का?"))) return;
    setSavingAction("fertilizer");
    try {
      const res = await fetchWithTimeout(`/api/farmers/${farmer.id}/plots/${selectedPlot.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_FERTILIZER", itemId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || tr("Failed to delete fertilizer schedule item.", "खताच्या वेळापत्रकातील नोंद हटवता आली नाही."));
      }
      if (json.success) {
        const updatedPlots = farmer.plots.map((p) =>
          p.id === selectedPlot.id ? json.plot : p
        );
        setFarmer({ ...farmer, plots: updatedPlots });
        showNotification("success", tr("Fertilizer stage removed from this plot schedule", "या शेतजमिनीच्या वेळापत्रकातून खताचा टप्पा हटवला"));
      }
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : tr("Failed to delete fertilizer schedule item.", "खताच्या वेळापत्रकातील नोंद हटवता आली नाही.")
      );
    } finally {
      setSavingAction(null);
    }
  };

  // 5. Reset plot schedule to master
  const handleResetToMaster = async () => {
    if (!selectedPlot || savingAction) return;
    if (
      !confirm(
        tr(
          `Are you sure you want to reset ${selectedPlot.plotName}'s schedule back to the standard ${selectedPlot.cropName} master template? Any custom modifications will be replaced.`,
          `${selectedPlot.plotName} चे वेळापत्रक ${selectedPlot.cropName} च्या मानक मास्टर नमुन्यानुसार रीसेट करायचे आहे का? केलेले कोणतेही विशेष बदल काढून टाकले जातील.`
        )
      )
    )
      return;

    setSavingAction("reset");
    try {
      const res = await fetchWithTimeout(`/api/farmers/${farmer.id}/plots/${selectedPlot.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET_TO_MASTER" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || tr("Failed to reset schedule.", "वेळापत्रक रीसेट करता आले नाही."));
      }
      if (json.success) {
        const updatedPlots = farmer.plots.map((p) =>
          p.id === selectedPlot.id ? json.plot : p
        );
        setFarmer({ ...farmer, plots: updatedPlots });
        showNotification("success", tr("Schedule reset to Master template!", "वेळापत्रक मास्टर नमुन्यानुसार रीसेट केले!"));
      }
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : tr("Failed to reset schedule.", "वेळापत्रक रीसेट करता आले नाही.")
      );
    } finally {
      setSavingAction(null);
    }
  };

  // 6. Add New Plot to this farmer
  const handleAddPlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingAction) return;
    setSavingAction("add-plot");
    try {
      const updatedPlots = [
        ...farmer.plots,
        {
          id: `plt-${Date.now()}`,
          plotName: newPlotForm.plotName,
          isActive: true,
          cropName: newPlotForm.cropName,
          sowingDate: newPlotForm.sowingDate,
          areaAcre: Number(newPlotForm.areaAcre) || 0,
          areaGuntha: Number(newPlotForm.areaGuntha) || 0,
        },
      ];

      const res = await fetchWithTimeout(`/api/farmers/${farmer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plots: updatedPlots }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || tr("Failed to add plot.", "शेतजमीन जोडता आली नाही."));
      }
      if (json.success) {
        setFarmer(json.farmer);
        setShowAddPlotModal(false);
        if (json.farmer.plots.length > 0) {
          setSelectedPlotId(json.farmer.plots[json.farmer.plots.length - 1].id);
          setSetTotalDays("");
        }
        showNotification("success", tr("New plot added and master schedule cloned!", "नवीन शेतजमीन जोडली आणि मास्टर वेळापत्रकाची प्रत तयार केली!"));
      }
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : tr("Failed to add plot.", "शेतजमीन जोडता आली नाही.")
      );
    } finally {
      setSavingAction(null);
    }
  };

  const handleTogglePlotActive = async (plot: Plot) => {
    if (!farmer || savingAction) return;
    const nextIsActive = plot.isActive === false;
    setSavingAction(`plot-status-${plot.id}`);

    try {
      const response = await fetchWithTimeout(`/api/farmers/${farmer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plots: farmer.plots.map((entry) =>
            entry.id === plot.id ? { ...entry, isActive: nextIsActive } : entry
          ),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.farmer) {
        throw new Error(
          result.message || result.error || tr("Unable to update plot status.", "शेतजमिनीची स्थिती अद्ययावत करता आली नाही.")
        );
      }

      setFarmer(result.farmer);
      showNotification(
        "success",
        nextIsActive
          ? tr(`${plot.plotName} is now active.`, `${plot.plotName} आता सक्रिय आहे.`)
          : tr(`${plot.plotName} is now inactive.`, `${plot.plotName} आता निष्क्रिय आहे.`)
      );
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error
          ? error.message
          : tr("Unable to update plot status.", "शेतजमिनीची स्थिती अद्ययावत करता आली नाही.")
      );
    } finally {
      setSavingAction(null);
    }
  };

  const handleDeletePlot = async () => {
    if (!selectedPlot || savingAction) return;
    if (
      !confirm(
        tr(
          `Delete ${selectedPlot.plotName} (${selectedPlot.cropName}) and its schedules? This cannot be undone.`,
          `${selectedPlot.plotName} (${selectedPlot.cropName}) आणि त्याचे वेळापत्रक हटवायचे आहे का? ही कृती पूर्ववत करता येणार नाही.`
        )
      )
    ) {
      return;
    }

    setSavingAction("delete-plot");
    try {
      const res = await fetchWithTimeout(`/api/farmers/${farmer.id}/plots/${selectedPlot.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || tr("Failed to delete plot", "शेतजमीन हटवता आली नाही"));
      }

      const updatedFarmer = json.farmer;
      setFarmer(updatedFarmer);
      setSelectedPlotId(updatedFarmer.plots[0]?.id || "");
      setSetTotalDays("");
      setShowSprayForm(false);
      setShowFertForm(false);
      setEditingSprayId(null);
      setEditingFertId(null);
      showNotification("success", tr("Plot deleted successfully", "शेतजमीन यशस्वीरित्या हटवली"));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : tr("Failed to delete plot", "शेतजमीन हटवता आली नाही");
      showNotification("error", errorMessage);
    } finally {
      setSavingAction(null);
    }
  };

  const totalFarmerGuntha = (farmer.plots || []).reduce((sum, p) => sum + (p.totalGuntha || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Notification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/admin/farmers"
          className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{tr("Back to All Farmers (शेतकरी यादी)", "सर्व शेतकऱ्यांकडे परत")}</span>
        </Link>

        {message && (
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 ${
              message.type === "success"
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{message.text}</span>
          </div>
        )}
        {loadError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
            <span>{tr("Could not load all farmer details:", "शेतकऱ्याची सर्व माहिती लोड करता आली नाही:")} {loadError}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadData();
              }}
              className="rounded-lg bg-amber-200 px-3 py-1.5 font-bold"
            >
              {tr("Retry", "पुन्हा प्रयत्न करा")}
            </button>
          </div>
        )}
      </div>

      {/* 1. Farmer Profile Summary Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start space-x-3.5">
            <div className="w-13 h-13 rounded-2xl bg-linear-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white font-black text-xl shadow-md">
              👨‍🌾
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  {farmer.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {farmer.isActive ? tr("Active", "सक्रिय") : tr("Inactive", "निष्क्रिय")}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>
                    {farmer.village}, Tal. {farmer.taluka}, Dist. {farmer.district}
                  </span>
                </span>
                <span>•</span>
                <span>{tr("Reg:", "नोंदणी:")} {farmer.registrationDate}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Opening Balance Badge */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {tr("Opening Balance", "प्रारंभिक शिल्लक")}
              </span>
              <span
                className={`font-bold text-sm ${
                  farmer.openingBalanceType === "Debit"
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                ₹{farmer.openingBalance} ({farmer.openingBalanceType})
              </span>
            </div>

            {/* Total Area */}
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                {tr("Total Consultancy Area", "एकूण सल्लागार क्षेत्र")}
              </span>
              <span className="font-extrabold text-sm text-emerald-900">
                {formatArea(totalFarmerGuntha).formatted} ({farmer.plots.length} {tr("Plots", "शेतजमिनी")})
              </span>
            </div>
          </div>
        </div>

        {/* Farmer Credentials & Contacts bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">{tr("Mobile", "मोबाईल")}</p>
              <a href={`tel:${farmer.mobile}`} className="font-mono font-bold text-slate-700 hover:text-emerald-700">
                {farmer.mobile}
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">WhatsApp</p>
              <span className="font-mono font-bold text-emerald-800">
                {farmer.whatsapp || farmer.mobile}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">{tr("Website Username", "वेबसाइट वापरकर्ता नाव")}</p>
              <span className="font-mono font-bold text-slate-800">{farmer.username}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">{tr("Farmer Password", "शेतकरी पासवर्ड")}</p>
              <span className="font-mono font-bold text-amber-800">{tr("Not displayed", "दाखवलेला नाही")}</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSaveCredentials}
          className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="block text-xs font-semibold text-slate-700">
            {tr("Farmer Login ID / Username", "शेतकरी लॉगिन आयडी / वापरकर्ता नाव")}
            <input
              type="text"
              required
              value={credentialsForm.username}
              onChange={(event) =>
                setCredentialsForm((current) => ({ ...current, username: event.target.value }))
              }
              autoComplete="off"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            {tr("New Password", "नवीन पासवर्ड")}
            <input
              type="password"
              value={credentialsForm.password}
              onChange={(event) =>
                setCredentialsForm((current) => ({ ...current, password: event.target.value }))
              }
              autoComplete="new-password"
              placeholder={tr("Leave blank to keep current", "सध्याचा पासवर्ड ठेवण्यासाठी रिकामे सोडा")}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <button
            type="submit"
            disabled={savingAction !== null}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {savingAction === "credentials"
              ? tr("Saving...", "जतन करत आहे...")
              : tr("Update Login", "लॉगिन अद्ययावत करा")}
          </button>
        </form>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">{tr("Farm Diary Records", "शेत डायरी नोंदी")}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {tr("Read-only activity and expense history recorded by this farmer.", "या शेतकऱ्याने नोंदवलेला केवळ-वाचन क्रियाकलाप आणि खर्चाचा इतिहास.")}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs">
            <span className="text-emerald-800">{tr("Entries:", "नोंदी:")} </span>
            <strong className="text-emerald-950">{farmDiaryEntries.length}</strong>
            <span className="mx-2 text-emerald-300">·</span>
            <span className="text-emerald-800">{tr("Total:", "एकूण:")} </span>
            <strong className="text-emerald-950">
              {formatRupees.format(
                farmDiaryEntries.reduce((sum, entry) => sum + entry.totalExpense, 0)
              )}
            </strong>
          </div>
        </div>
        {farmDiaryEntries.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            {tr("This farmer has not recorded any farm diary activities yet.", "या शेतकऱ्याने अद्याप शेत डायरीतील कोणत्याही क्रियाकलापांची नोंद केलेली नाही.")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-2 py-2">{tr("Date", "तारीख")}</th>
                  <th className="px-2 py-2">{tr("Plot / Crop", "शेतजमीन / पीक")}</th>
                  <th className="px-2 py-2">{tr("Season", "हंगाम")}</th>
                  <th className="px-2 py-2">{tr("Activity", "क्रियाकलाप")}</th>
                  <th className="px-2 py-2">{tr("Description", "वर्णन")}</th>
                  <th className="px-2 py-2 text-right">{tr("Expense", "खर्च")}</th>
                </tr>
              </thead>
              <tbody>
                {farmDiaryEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-2">{entry.date}</td>
                    <td className="px-2 py-2">
                      {farmer.plots.find((plot) => plot.id === entry.plotId)?.plotName || tr("Plot removed", "शेतजमीन हटवली")}
                      {" · "}{entry.cropName}
                    </td>
                    <td className="px-2 py-2">{entry.season}</td>
                    <td className="px-2 py-2">{entry.activityType}</td>
                    <td className="px-2 py-2">{entry.description}</td>
                    <td className="px-2 py-2 text-right font-bold">
                      {formatRupees.format(entry.totalExpense)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Plot Switcher Tabs & Add Plot Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            {tr("Plots:", "शेतजमिनी:")}
          </span>
          {farmer.plots.map((plot) => {
            const active = plot.id === selectedPlot?.id;
            const plotIsActive = plot.isActive !== false;
            return (
              <div
                key={plot.id}
                className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlotId(plot.id);
                    setSetTotalDays("");
                    setEditingSprayId(null);
                    setEditingFertId(null);
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? "bg-emerald-800 text-white shadow-md shadow-emerald-900/20"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{plot.plotName}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      active ? "bg-amber-400 text-emerald-950 font-bold" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {plot.cropName} • {formatArea(plot.totalGuntha).formatted}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      plotIsActive ? "text-emerald-200" : active ? "text-red-200" : "text-red-700"
                    }`}
                  >
                    {plotIsActive ? tr("Active", "सक्रिय") : tr("Inactive", "निष्क्रिय")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleTogglePlotActive(plot)}
                  disabled={savingAction !== null}
                  aria-label={
                    plotIsActive
                      ? tr(`Deactivate ${plot.plotName}`, `${plot.plotName} निष्क्रिय करा`)
                      : tr(`Activate ${plot.plotName}`, `${plot.plotName} सक्रिय करा`)
                  }
                  className={`rounded-lg px-2.5 py-2 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    plotIsActive
                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  {plotIsActive ? tr("Set inactive", "निष्क्रिय करा") : tr("Set active", "सक्रिय करा")}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setNewPlotForm((current) => ({
              ...current,
              sowingDate: current.sowingDate || new Date().toISOString().split("T")[0],
            }));
            setShowAddPlotModal(true);
          }}
          disabled={savingAction !== null}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{tr("+ Add Another Plot", "+ आणखी शेतजमीन जोडा")}</span>
        </button>
      </div>

      {/* 3. Selected Plot Header Banner & Customization Rule */}
      {selectedPlot && (
        <div className="bg-linear-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-emerald-800 text-white">
                {tr("Active Plot", "सक्रिय शेतजमीन")}
              </span>
              <h2 className="text-base font-extrabold text-slate-800">
                {selectedPlot.plotName} — {selectedPlot.cropName}
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-emerald-800">
                {tr("Area:", "क्षेत्र:")} {formatArea(selectedPlot.totalGuntha).formatted}
              </span>{" "}
              ({selectedPlot.areaAcre} {tr("Acre", "एकर")} {selectedPlot.areaGuntha} {tr("Guntha", "गुंठा")}) • {tr("Sowing Date:", "पेरणीची तारीख:")}{" "}
              <span className="font-mono font-bold text-slate-800">
                {selectedPlot.sowingDate}
              </span>
            </p>
            <div className="flex items-center space-x-1.5 text-[11px] text-amber-800 font-medium pt-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {tr("Personalized Schedule Active. Any edit made below applies", "वैयक्तिक वेळापत्रक सक्रिय. खाली केलेला कोणताही बदल")}
                {" "}<strong>{tr(`only to ${farmer.name}'s field`, `फक्त ${farmer.name} यांच्या शेतासाठी लागू होतो`)}</strong>.
              </span>
            </div>
            <div
              className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                selectedScheduleProgress?.status === "COMPLETED"
                  ? "border-amber-300 bg-amber-50 text-amber-950"
                  : "border-emerald-200 bg-white/80 text-slate-700"
              }`}
            >
              <strong>{tr("Released:", "सोडलेले:")}</strong>{" "}
              {selectedScheduleProgress
                ? tr(`Day 1–${selectedScheduleProgress.totalDaysReleased}`, `दिवस १–${selectedScheduleProgress.totalDaysReleased}`)
                : tr("No days released", "दिवस सोडलेले नाहीत")}
              {" · "}<strong>{tr("Last delivered:", "शेवटचे पाठवलेले:")}</strong>{" "}
              {selectedScheduleProgress?.lastDeliveredDay || 0}
              {" · "}<strong>{tr("Current day:", "सध्याचा दिवस:")}</strong>{" "}
              {selectedScheduleProgress?.currentDay || 0}
              {" · "}<strong>{tr("Status:", "स्थिती:")}</strong>{" "}
              {selectedScheduleProgress?.status === "COMPLETED"
                ? tr("Completed", "पूर्ण")
                : selectedScheduleProgress?.status === "ACTIVE"
                  ? tr("Active", "सक्रिय")
                  : tr("Not started", "सुरू झालेले नाही")}
              {selectedScheduleProgress?.status === "COMPLETED" && (
                <span> — {tr("ready for the next schedule extension.", "पुढील वेळापत्रक वाढीसाठी तयार.")}</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetToMaster}
              disabled={savingAction !== null}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
              title={tr("Re-copy from Master Template", "मास्टर नमुन्यातून पुन्हा प्रत करा")}
              aria-label={tr("Re-copy from Master Template", "मास्टर नमुन्यातून पुन्हा प्रत करा")}
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>{savingAction === "reset" ? tr("Resetting...", "रीसेट करत आहे...") : tr("Reset from Master Template", "मास्टर नमुन्यातून रीसेट करा")}</span>
            </button>
            <button
              onClick={handleDeletePlot}
              disabled={savingAction !== null}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-700 text-xs font-semibold shadow-xs"
              title={tr("Delete this plot and its schedules", "ही शेतजमीन आणि तिचे वेळापत्रक हटवा")}
              aria-label={tr("Delete this plot and its schedules", "ही शेतजमीन आणि तिचे वेळापत्रक हटवा")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{savingAction === "delete-plot" ? tr("Deleting...", "हटवत आहे...") : tr("Delete Plot", "शेतजमीन हटवा")}</span>
            </button>
          </div>
        </div>
      )}

      {selectedPlot && (
        <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {tr("Set Schedule Days for This Plot", "या शेतजमिनीसाठी वेळापत्रकाचे दिवस निश्चित करा")}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {selectedPlot.plotName} · {selectedPlot.cropName}
              {" — "}{tr("Extend this plot’s released schedule without changing the master schedule.", "मास्टर वेळापत्रक न बदलता या शेतजमिनीचे सोडलेले वेळापत्रक वाढवा.")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700">
              <p>
                <strong>{tr("Days currently set:", "सध्या निश्चित केलेले दिवस:")}</strong> {alreadyReleasedDays}
              </p>
              <p className="mt-1">
                <strong>{tr("Master schedule limit:", "मास्टर वेळापत्रकाची मर्यादा:")}</strong>{" "}
                {maxReleaseDay > 0 ? `${maxReleaseDay} ${tr("days", "दिवस")}` : tr("No master days", "मास्टरमध्ये दिवस नाहीत")}
              </p>
            </div>

            <form
              onSubmit={handleReleaseSchedule}
              className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end"
            >
              <label className="flex-1 text-xs font-semibold text-slate-700">
                {tr("Extend total days to", "एकूण दिवस वाढवून")}
                <input
                  type="number"
                  min={alreadyReleasedDays + 1}
                  max={maxReleaseDay || undefined}
                  step={1}
                  value={setTotalDays}
                  onChange={(event) => setSetTotalDays(event.target.value)}
                  placeholder={
                    maxReleaseDay > alreadyReleasedDays
                      ? tr(`Enter ${alreadyReleasedDays + 1}–${maxReleaseDay}`, `${alreadyReleasedDays + 1}–${maxReleaseDay} प्रविष्ट करा`)
                      : tr("No more master days available", "मास्टरमध्ये आणखी दिवस उपलब्ध नाहीत")
                  }
                  disabled={releaseSaving || maxReleaseDay <= alreadyReleasedDays}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
                />
              </label>
              <button
                type="submit"
                disabled={releaseSaving || !canExtendSchedule}
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {releaseSaving ? tr("Setting days...", "दिवस निश्चित करत आहे...") : tr("Set Days", "दिवस निश्चित करा")}
              </button>
            </form>
          </div>
          {alreadyReleasedDays >= maxReleaseDay && maxReleaseDay > 0 && (
            <p className="text-xs text-emerald-800">
              {tr(`This plot has all ${maxReleaseDay} days available in its master schedule.`, `या शेतजमिनीसाठी मास्टर वेळापत्रकातील सर्व ${maxReleaseDay} दिवस उपलब्ध आहेत.`)}
            </p>
          )}
        </section>
      )}

      {selectedPlot && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-bold text-slate-900">{tr("Day-by-Day Plot Schedule", "दिवसानुसार शेतजमिनीचे वेळापत्रक")}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {selectedPlot.plotName} · {selectedPlot.cropName}
                {visiblePlotTimeline?.progress && (
                  <>
                    {" · "}{tr("Day", "दिवस")} {Math.min(
                      visiblePlotTimeline.currentDay,
                      visiblePlotTimeline.totalDaysReleased
                    )} / {visiblePlotTimeline.totalDaysReleased}
                    {" · "}{tr("Started", "सुरू झाले")} {formatScheduleDate(
                      visiblePlotTimeline.progress.scheduleStartDate,
                      lang
                    )}
                  </>
                )}
              </p>
            </div>
            {visiblePlotTimeline && (
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                  visiblePlotTimeline.status === "COMPLETED"
                    ? "bg-amber-100 text-amber-900"
                    : visiblePlotTimeline.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {visiblePlotTimeline.status === "NOT_RELEASED"
                  ? tr("Waiting for release", "सोडण्याची प्रतीक्षा")
                  : visiblePlotTimeline.status === "COMPLETED"
                    ? tr("Completed", "पूर्ण")
                    : visiblePlotTimeline.status === "ACTIVE"
                      ? tr("Active", "सक्रिय")
                      : visiblePlotTimeline.status}
              </span>
            )}
          </div>

          {plotTimelineLoading && (
            <p className="text-xs text-slate-500">{tr("Loading released schedule days…", "सोडलेले वेळापत्रकाचे दिवस लोड होत आहेत…")}</p>
          )}
          {plotTimelineError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">
              {plotTimelineError}
            </p>
          )}
          {visiblePlotTimeline && (
            <PlotScheduleTimeline
              key={visiblePlotTimeline.plot.id}
              timeline={visiblePlotTimeline}
              admin
              onEditSpray={handleEditTimelineSpray}
              onDeleteSpray={handleDeleteSprayItem}
              onEditFertilizer={handleEditTimelineFertilizer}
              onDeleteFertilizer={handleDeleteFertItem}
              onToggleCompleted={handleToggleTimelineCompleted}
              onAddSpray={(day) => {
                if (!selectedPlot) return;
                setEditingSprayId(null);
                setSprayForm((current) => ({
                  ...current,
                  day,
                  scheduledDate:
                    dateFromCropDay(
                      visiblePlotTimeline.progress?.scheduleStartDate || selectedPlot.sowingDate,
                      day
                    ) || getDateInIndia(),
                }));
                setShowSprayForm(true);
              }}
              onAddFertilizer={(day) => {
                if (!selectedPlot) return;
                setEditingFertId(null);
                setFertForm((current) => ({
                  ...current,
                  day,
                  scheduledDate:
                    dateFromCropDay(
                      visiblePlotTimeline.progress?.scheduleStartDate || selectedPlot.sowingDate,
                      day
                    ) || getDateInIndia(),
                }));
                setShowFertForm(true);
              }}
              onSendWhatsApp={handleOpenTimelineWhatsApp}
            />
          )}
        </section>
      )}

      {/* 4. Schedules View Switcher (Spray Schedule vs Fertilizer Schedule) */}
      {selectedPlot ? (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex gap-2">
            <button
              onClick={() => setScheduleViewTab("spray")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                scheduleViewTab === "spray"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <SprayCan className="w-4 h-4" />
              <span>
                {tr("Personalized Spray Schedule", "वैयक्तिक फवारणी वेळापत्रक")} ({selectedPlot?.spraySchedule?.length || 0})
              </span>
            </button>

            <button
              onClick={() => setScheduleViewTab("fertilizer")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                scheduleViewTab === "fertilizer"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Wheat className="w-4 h-4" />
              <span>
                {tr("Personalized Fertilizer Schedule", "वैयक्तिक खत वेळापत्रक")} ({selectedPlot?.fertilizerSchedule?.length || 0})
              </span>
            </button>
          </div>

          <div>
            {scheduleViewTab === "spray" ? (
              <button
                onClick={() => {
                  setEditingSprayId(null);
                  setSprayForm((current) => ({ ...current, scheduledDate: getDateInIndia() }));
                  setShowSprayForm(true);
                }}
                className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{tr("+ Add Spray Day to This Plot", "+ या शेतजमिनीसाठी फवारणीचा दिवस जोडा")}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingFertId(null);
                  setFertForm((current) => ({ ...current, scheduledDate: getDateInIndia() }));
                  setShowFertForm(true);
                }}
                className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{tr("+ Add Fertilizer Stage to This Plot", "+ या शेतजमिनीसाठी खताचा टप्पा जोडा")}</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: SPRAY SCHEDULE TABLE */}
        {scheduleViewTab === "spray" && (
          <div>
            {selectedPlot?.spraySchedule?.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <SprayCan className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>{tr("No spray schedule entries for this plot yet.", "या शेतजमिनीसाठी अद्याप फवारणीच्या नोंदी नाहीत.")}</p>
                <button
                  onClick={() => {
                    setEditingSprayId(null);
                    setSprayForm((current) => ({ ...current, scheduledDate: getDateInIndia() }));
                    setShowSprayForm(true);
                  }}
                  className="mt-2 text-emerald-700 font-bold hover:underline"
                >
                  {tr("Click here to add one", "नोंद जोडण्यासाठी येथे क्लिक करा")}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">{tr("Crop Day", "पिकाचा दिवस")}</th>
                      <th className="py-2.5 px-3">{tr("Scheduled Date", "नियोजित तारीख")}</th>
                      <th className="py-2.5 px-3">{tr("Time", "वेळ")}</th>
                      <th className="py-2.5 px-3">{tr("Medicine (Prescribed)", "औषध (निर्धारित)")}</th>
                      <th className="py-2.5 px-3">{tr("Dosage Quantity", "औषधाचे प्रमाण")}</th>
                      <th className="py-2.5 px-3">{tr("Water Required", "आवश्यक पाणी")}</th>
                      <th className="py-2.5 px-3">{tr("Custom Notes", "विशेष टिपा")}</th>
                      <th className="py-2.5 px-3 text-right">{tr("Send Advisory", "सल्ला पाठवा")}</th>
                      <th className="py-2.5 px-3 text-right">{tr("Actions", "कृती")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedPlot?.spraySchedule || []).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-extrabold text-slate-900 px-2 py-1 rounded bg-slate-100">
                            {tr("Day", "दिवस")} {item.day}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {formatScheduleDate(
                            item.scheduledDate || dateFromCropDay(selectedPlot.sowingDate, item.day) || getDateInIndia(),
                            lang
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.time === "Morning"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {item.time === "Morning" ? tr("Morning", "सकाळ") : item.time === "Evening" ? tr("Evening", "संध्याकाळ") : item.time}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {item.medicineName}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-700">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {item.waterQuantity}
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={item.note}>
                          {item.note || "—"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {canSendWhatsAppForDay(item.day) ? (
                            <button
                              onClick={() => handleOpenSprayWhatsApp(item)}
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              <span>{tr("Send WhatsApp", "WhatsApp पाठवा")}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">{tr("Not in latest release", "नवीनतम वेळापत्रकात नाही")}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingSprayId(item.id);
                              setSprayForm({
                                day: item.day,
                                scheduledDate:
                                  item.scheduledDate ||
                                  dateFromCropDay(selectedPlot.sowingDate, item.day) ||
                                  getDateInIndia(),
                                time: item.time,
                                medicineId: item.medicineId,
                                medicineName: item.medicineName,
                                quantity: item.quantity,
                                unit: item.unit,
                                waterQuantity: item.waterQuantity,
                                note: item.note,
                              });
                              setShowSprayForm(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                            title={tr("Customize this day for this farmer", "या शेतकऱ्यासाठी हा दिवस सानुकूलित करा")}
                            aria-label={tr("Customize this day for this farmer", "या शेतकऱ्यासाठी हा दिवस सानुकूलित करा")}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSprayItem(item.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            title={tr("Delete this day from this plot", "या शेतजमिनीतून हा दिवस हटवा")}
                            aria-label={tr("Delete this day from this plot", "या शेतजमिनीतून हा दिवस हटवा")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FERTILIZER SCHEDULE TABLE */}
        {scheduleViewTab === "fertilizer" && (
          <div>
            {selectedPlot?.fertilizerSchedule?.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <Wheat className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>{tr("No fertilizer schedule entries for this plot yet.", "या शेतजमिनीसाठी अद्याप खताच्या नोंदी नाहीत.")}</p>
                <button
                  onClick={() => {
                    setEditingFertId(null);
                    setFertForm((current) => ({ ...current, scheduledDate: getDateInIndia() }));
                    setShowFertForm(true);
                  }}
                  className="mt-2 text-emerald-700 font-bold hover:underline"
                >
                  {tr("Click here to add one", "नोंद जोडण्यासाठी येथे क्लिक करा")}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">{tr("Crop Day", "पिकाचा दिवस")}</th>
                      <th className="py-2.5 px-3">{tr("Scheduled Date", "नियोजित तारीख")}</th>
                      <th className="py-2.5 px-3">{tr("Crop Stage", "पिकाचा टप्पा")}</th>
                      <th className="py-2.5 px-3">{tr("Fertilizer Name", "खताचे नाव")}</th>
                      <th className="py-2.5 px-3">{tr("Quantity", "प्रमाण")}</th>
                      <th className="py-2.5 px-3">{tr("Application Method", "वापरण्याची पद्धत")}</th>
                      <th className="py-2.5 px-3">{tr("Custom Notes", "विशेष टिपा")}</th>
                      <th className="py-2.5 px-3 text-right">{tr("Send Advisory", "सल्ला पाठवा")}</th>
                      <th className="py-2.5 px-3 text-right">{tr("Actions", "कृती")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedPlot?.fertilizerSchedule || []).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-extrabold text-slate-900 px-2 py-1 rounded bg-slate-100">
                            {tr("Day", "दिवस")} {item.day}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {formatScheduleDate(
                            item.scheduledDate || dateFromCropDay(selectedPlot.sowingDate, item.day) || getDateInIndia(),
                            lang
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {item.stage}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {item.fertilizerName}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-700">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                            {item.applicationMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={item.note}>
                          {item.note || "—"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {canSendWhatsAppForDay(item.day) ? (
                            <button
                              onClick={() => handleOpenFertilizerWhatsApp(item)}
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              <span>{tr("Send WhatsApp", "WhatsApp पाठवा")}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">{tr("Not in latest release", "नवीनतम वेळापत्रकात नाही")}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingFertId(item.id);
                              setFertForm({
                                day: item.day,
                                scheduledDate:
                                  item.scheduledDate ||
                                  dateFromCropDay(selectedPlot.sowingDate, item.day) ||
                                  getDateInIndia(),
                                stage: item.stage,
                                fertilizerId: item.fertilizerId,
                                fertilizerName: item.fertilizerName,
                                quantity: item.quantity,
                                unit: item.unit,
                                applicationMethod: item.applicationMethod,
                                waterQuantity: item.waterQuantity || "",
                                note: item.note,
                              });
                              setShowFertForm(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                            title={tr("Customize this fertilizer stage", "खताचा हा टप्पा सानुकूलित करा")}
                            aria-label={tr("Customize this fertilizer stage", "खताचा हा टप्पा सानुकूलित करा")}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteFertItem(item.id)}
                            title={tr("Delete this fertilizer stage from this plot", "या शेतजमिनीतून खताचा हा टप्पा हटवा")}
                            aria-label={tr("Delete this fertilizer stage from this plot", "या शेतजमिनीतून खताचा हा टप्पा हटवा")}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-bold text-slate-700">{tr("No plots for this farmer yet.", "या शेतकऱ्यासाठी अद्याप शेतजमिनी नाहीत.")}</p>
          <p className="mt-1 text-xs text-slate-500">
            {tr("Add a plot to create and manage its schedules.", "वेळापत्रक तयार करण्यासाठी आणि व्यवस्थापित करण्यासाठी शेतजमीन जोडा.")}
          </p>
        </div>
      )}

      {/* SPRAY EDIT / ADD MODAL */}
      {showSprayForm && selectedPlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveSprayItem}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
          >
            <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSprayId
                  ? tr(`Customize Day ${sprayForm.day} for ${farmer.name}`, `${farmer.name} यांच्यासाठी दिवस ${sprayForm.day} सानुकूलित करा`)
                  : tr(`Add Personalized Spray Day to ${selectedPlot.plotName}`, `${selectedPlot.plotName} साठी वैयक्तिक फवारणीचा दिवस जोडा`)}
              </h3>
              <button
                type="button"
                onClick={() => setShowSprayForm(false)}
                aria-label={tr("Close", "बंद करा")}
                className="text-emerald-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Crop Day (दिवस) *", "पिकाचा दिवस *")}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={sprayForm.day}
                    onChange={(e) =>
                      setSprayForm({ ...sprayForm, day: Number(e.target.value) })
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Timing *", "वेळ *")}
                  </label>
                  <select
                    value={sprayForm.time}
                    onChange={(e) => {
                      if (e.target.value === "Morning" || e.target.value === "Evening") {
                        setSprayForm({ ...sprayForm, time: e.target.value });
                      }
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Morning">{tr("Morning (सकाळ)", "सकाळ")}</option>
                    <option value="Evening">{tr("Evening (संध्याकाळ)", "संध्याकाळ")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Scheduled Date *", "नियोजित तारीख *")}
                </label>
                <input
                  type="date"
                  required
                  value={sprayForm.scheduledDate}
                  onChange={(e) =>
                    setSprayForm({ ...sprayForm, scheduledDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Medicine *", "औषध *")}
                </label>
                <input
                  type="text"
                  required
                  list={`farmer-medicines-${farmer.id}`}
                  value={sprayForm.medicineName}
                  onChange={(e) => {
                    const medicineName = e.target.value;
                    const medicine = medicines.find(
                      (item) => item.name.toLowerCase() === medicineName.trim().toLowerCase()
                    );
                    setSprayForm({
                      ...sprayForm,
                      medicineName,
                      medicineId: medicine?.id || "",
                      unit: medicine?.unitShortName || sprayForm.unit,
                    });
                  }}
                  placeholder={tr("Type a medicine name or choose a suggestion", "औषधाचे नाव टाइप करा किंवा सूचना निवडा")}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
                <datalist id={`farmer-medicines-${farmer.id}`}>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.companyName}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Dosage Quantity & Unit *", "औषधाचे प्रमाण आणि एकक *")}
                  </label>
                  <div className="flex space-x-1">
                    <input
                      type="text"
                      required
                      value={sprayForm.quantity}
                      onChange={(e) =>
                        setSprayForm({ ...sprayForm, quantity: e.target.value })
                      }
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                    <input
                      type="text"
                      required
                      aria-label={tr("Dosage unit", "औषधाच्या प्रमाणाचे एकक")}
                      value={sprayForm.unit}
                      onChange={(e) =>
                        setSprayForm({ ...sprayForm, unit: e.target.value })
                      }
                      className="w-24 rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-mono font-bold text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Water Quantity *", "पाण्याचे प्रमाण *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={sprayForm.waterQuantity}
                    onChange={(e) =>
                      setSprayForm({ ...sprayForm, waterQuantity: e.target.value })
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Custom Notes for Farmer", "शेतकऱ्यासाठी विशेष टिपा")}
                </label>
                <textarea
                  rows={2}
                  value={sprayForm.note}
                  onChange={(e) =>
                    setSprayForm({ ...sprayForm, note: e.target.value })
                  }
                  placeholder={tr("e.g. Advised due to leaf curl noticed in survey.", "उदा. पाहणीत पानांचा गुंडाळा दिसल्याने हा सल्ला दिला.")}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSprayForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-semibold"
                >
                  {tr("Cancel", "रद्द करा")}
                </button>
                <button
                  type="submit"
                  disabled={savingAction !== null}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 text-white text-xs font-bold"
                >
                  {savingAction === "spray" ? tr("Saving...", "जतन करत आहे...") : tr("Save Plot Customization", "शेतजमिनीचे बदल जतन करा")}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* FERTILIZER EDIT / ADD MODAL */}
      {showFertForm && selectedPlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveFertItem}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
          >
            <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingFertId
                  ? tr(`Customize Fertilizer Day ${fertForm.day}`, `खताचा दिवस ${fertForm.day} सानुकूलित करा`)
                  : tr(`Add Fertilizer Stage to ${selectedPlot.plotName}`, `${selectedPlot.plotName} साठी खताचा टप्पा जोडा`)}
              </h3>
              <button
                type="button"
                onClick={() => setShowFertForm(false)}
                aria-label={tr("Close", "बंद करा")}
                className="text-emerald-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Crop Day *", "पिकाचा दिवस *")}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={fertForm.day}
                    onChange={(e) =>
                      setFertForm({ ...fertForm, day: Number(e.target.value) })
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Stage Name *", "टप्प्याचे नाव *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={fertForm.stage}
                    onChange={(e) =>
                      setFertForm({ ...fertForm, stage: e.target.value })
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Scheduled Date *", "नियोजित तारीख *")}
                </label>
                <input
                  type="date"
                  required
                  value={fertForm.scheduledDate}
                  onChange={(e) =>
                    setFertForm({ ...fertForm, scheduledDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Fertilizer *", "खत *")}
                </label>
                <input
                  type="text"
                  required
                  list={`farmer-fertilizers-${farmer.id}`}
                  value={fertForm.fertilizerName}
                  onChange={(e) => {
                    const fertilizerName = e.target.value;
                    const fertilizer = fertilizers.find(
                      (item) =>
                        item.name.toLowerCase() === fertilizerName.trim().toLowerCase()
                    );
                    setFertForm({
                      ...fertForm,
                      fertilizerName,
                      fertilizerId: fertilizer?.id || "",
                      unit: fertilizer?.unit || fertForm.unit,
                    });
                  }}
                  placeholder={tr("Type a fertilizer name or choose a suggestion", "खताचे नाव टाइप करा किंवा सूचना निवडा")}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
                <datalist id={`farmer-fertilizers-${farmer.id}`}>
                  {fertilizers.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.company} - {f.type}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Quantity & Unit *", "प्रमाण आणि एकक *")}
                  </label>
                  <div className="flex space-x-1">
                    <input
                      type="text"
                      required
                      value={fertForm.quantity}
                      onChange={(e) =>
                        setFertForm({ ...fertForm, quantity: e.target.value })
                      }
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                    <input
                      type="text"
                      required
                      aria-label={tr("Fertilizer quantity unit", "खताच्या प्रमाणाचे एकक")}
                      value={fertForm.unit}
                      onChange={(e) =>
                        setFertForm({ ...fertForm, unit: e.target.value })
                      }
                      className="w-24 rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-mono font-bold text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Application Method *", "वापरण्याची पद्धत *")}
                  </label>
                  <select
                    value={fertForm.applicationMethod}
                    onChange={(e) =>
                      setFertForm({ ...fertForm, applicationMethod: e.target.value })
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Drip Irrigation (ठिबकद्वारे)">{tr("Drip Irrigation (ठिबकद्वारे)", "ठिबक सिंचन")}</option>
                    <option value="Broadcasting in bed (बेसल डोस)">{tr("Broadcasting in bed (बेसल डोस)", "वाफ्यात पसरवणे (बेसल डोस)")}</option>
                    <option value="Soil Drenching (आळवणी)">{tr("Soil Drenching (आळवणी)", "जमिनीत आळवणी")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Custom Notes / Guidance", "विशेष टिपा / मार्गदर्शन")}
                </label>
                <textarea
                  rows={2}
                  value={fertForm.note}
                  onChange={(e) =>
                    setFertForm({ ...fertForm, note: e.target.value })
                  }
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowFertForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-semibold"
                >
                  {tr("Cancel", "रद्द करा")}
                </button>
                <button
                  type="submit"
                  disabled={savingAction !== null}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 text-white text-xs font-bold"
                >
                  {savingAction === "fertilizer" ? tr("Saving...", "जतन करत आहे...") : tr("Save Fertilizer Customization", "खताचे बदल जतन करा")}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ADD PLOT MODAL */}
      {showAddPlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleAddPlot}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
          >
            <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">{tr(`Add New Plot to ${farmer.name}`, `${farmer.name} यांच्यासाठी नवीन शेतजमीन जोडा`)}</h3>
              <button
                type="button"
                onClick={() => setShowAddPlotModal(false)}
                disabled={savingAction !== null}
                aria-label={tr("Close", "बंद करा")}
                className="text-emerald-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Plot Name / Location *", "शेतजमिनीचे नाव / ठिकाण *")}
                </label>
                <input
                  type="text"
                  required
                  value={newPlotForm.plotName}
                  onChange={(e) =>
                    setNewPlotForm({ ...newPlotForm, plotName: e.target.value })
                  }
                  placeholder={tr("e.g. Plot 3 (विहिरीचे रान)", "उदा. शेतजमीन ३ (विहिरीचे रान)")}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Crop Name *", "पिकाचे नाव *")}
                </label>
                <select
                  value={newPlotForm.cropName}
                  onChange={(e) =>
                    setNewPlotForm({ ...newPlotForm, cropName: e.target.value })
                  }
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  {crops.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Sowing / Plantation Date *", "पेरणी / लागवडीची तारीख *")}
                </label>
                <input
                  type="date"
                  required
                  value={newPlotForm.sowingDate}
                  onChange={(e) =>
                    setNewPlotForm({ ...newPlotForm, sowingDate: e.target.value })
                  }
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Area Acre (एकर)", "क्षेत्र एकरमध्ये")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newPlotForm.areaAcre}
                    onChange={(e) =>
                      setNewPlotForm({
                        ...newPlotForm,
                        areaAcre: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr("Area Guntha (गुंठा)", "क्षेत्र गुंठ्यात")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={39}
                    value={newPlotForm.areaGuntha}
                    onChange={(e) =>
                      setNewPlotForm({
                        ...newPlotForm,
                        areaGuntha: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlotModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-semibold"
                >
                  {tr("Cancel", "रद्द करा")}
                </button>
                <button
                  type="submit"
                  disabled={savingAction !== null}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 text-white text-xs font-bold"
                >
                  {savingAction === "add-plot" ? tr("Creating...", "तयार करत आहे...") : tr("Create Plot & Clone Schedule", "शेतजमीन तयार करा आणि वेळापत्रक प्रतिकृत करा")}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

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

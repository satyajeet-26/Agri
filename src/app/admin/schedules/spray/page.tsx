"use client";

import React, { useState, useEffect } from "react";
import {
  SprayCan,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  Droplets,
  Calendar,
  Layers,
} from "lucide-react";
import {
  MasterCropSchedule,
  MasterSprayItem,
  Medicine,
  Farmer,
  ScheduleExtensionHistory,
  ScheduleProgress,
  ScheduleTime,
} from "@/types";

export default function SprayMasterPage() {
  const [schedules, setSchedules] = useState<Record<string, MasterCropSchedule>>({});
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [scheduleProgress, setScheduleProgress] = useState<ScheduleProgress[]>([]);
  const [scheduleHistory, setScheduleHistory] = useState<ScheduleExtensionHistory[]>([]);
  const [selectedReleaseFarmerId, setSelectedReleaseFarmerId] = useState("");
  const [selectedReleasePlotId, setSelectedReleasePlotId] = useState("");
  const [setTotalDays, setSetTotalDays] = useState("");
  const [releaseSaving, setReleaseSaving] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<string>("Tomato");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // New crop input
  const [newCropName, setNewCropName] = useState("");

  // Edit / Add Item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    day: number;
    time: ScheduleTime;
    medicines: {
      medicineId: string;
      medicineName: string;
      quantity: string;
      unit: string;
    }[];
    waterQuantity: string;
    note: string;
  }>({
    day: 10,
    time: "Morning",
    medicines: [{ medicineId: "", medicineName: "", quantity: "20", unit: "ml" }],
    waterQuantity: "15 Litres",
    note: "",
  });

  const loadData = async () => {
    try {
      const [resSched, resMed, resFarmers, resRelease] = await Promise.all([
        fetch("/api/schedules/master"),
        fetch("/api/masters/medicines"),
        fetch("/api/farmers"),
        fetch("/api/schedules/release"),
      ]);
      const jsonSched = await resSched.json();
      const jsonMed = await resMed.json();
      const jsonFarmers = await resFarmers.json();
      const jsonRelease = await resRelease.json();

      if (!resSched.ok || !jsonSched.success) {
        throw new Error(jsonSched.message || jsonSched.error || "Unable to load master schedules.");
      }
      if (!resMed.ok || !jsonMed.success) {
        throw new Error(jsonMed.message || jsonMed.error || "Unable to load medicine master data.");
      }

      setSchedules(jsonSched.masterSchedules || {});
      const crops = Object.keys(jsonSched.masterSchedules || {});
      if (crops.length > 0 && !crops.includes(selectedCrop)) {
        setSelectedCrop(crops[0]);
      }

      if (jsonMed.success && jsonMed.data?.medicines) {
        setMedicines(jsonMed.data.medicines);
        if (jsonMed.data.medicines[0]) {
          setForm((prev) => ({
            ...prev,
            medicines: prev.medicines.map((item, index) =>
              index === 0
                ? {
                    ...item,
                    medicineId: jsonMed.data.medicines[0].id,
                    medicineName: jsonMed.data.medicines[0].name,
                    unit: jsonMed.data.medicines[0].unitShortName,
                  }
                : item
            ),
          }));
        }
      }

      if (jsonFarmers.success && Array.isArray(jsonFarmers.farmers)) {
        setFarmers(jsonFarmers.farmers);
        const firstFarmer = jsonFarmers.farmers[0] as Farmer | undefined;
        if (firstFarmer) {
          setSelectedReleaseFarmerId((current) => current || firstFarmer.id);
          setSelectedReleasePlotId((current) => current || firstFarmer.plots[0]?.id || "");
        }
      }

      if (jsonRelease.success) {
        setScheduleProgress(jsonRelease.progress || []);
        setScheduleHistory(jsonRelease.history || []);
      }
    } catch (err) {
      console.error(err);
      showNotification(
        "error",
        err instanceof Error ? err.message : "Unable to load spray schedules."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedReleaseFarmer = farmers.find(
    (farmer) => farmer.id === selectedReleaseFarmerId
  );
  const selectedReleasePlot = selectedReleaseFarmer?.plots.find(
    (plot) => plot.id === selectedReleasePlotId
  );
  const selectedReleaseProgress = scheduleProgress.find(
    (progress) =>
      progress.farmerId === selectedReleaseFarmerId &&
      progress.plotId === selectedReleasePlotId &&
      progress.cropId === selectedReleasePlot?.cropName
  );
  const completedSchedules = scheduleProgress.filter(
    (progress) => progress.status === "COMPLETED"
  );
  const selectedReleaseHistory = scheduleHistory
    .filter(
      (entry) =>
        entry.farmerId === selectedReleaseFarmerId &&
        entry.plotId === selectedReleasePlotId
    )
    .slice()
    .reverse();

  const handleReleaseSchedule = async () => {
    if (!selectedReleaseFarmer || !selectedReleasePlot) return;

    const alreadyReleased = selectedReleaseProgress?.totalDaysReleased || 0;
    const requestedDays = Number(setTotalDays);
    if (!Number.isInteger(requestedDays) || requestedDays < 1) {
      showNotification("error", "Set Days must be a positive whole number.");
      return;
    }

    if (requestedDays <= alreadyReleased) {
      showNotification(
        "error",
        requestedDays === alreadyReleased
          ? `No new schedule days to release. The farmer has already received ${alreadyReleased} days.`
          : `The farmer has already received ${alreadyReleased} days. Set Days must be greater than ${alreadyReleased} to extend the schedule.`
      );
      return;
    }

    const firstNewDay = alreadyReleased + 1;
    const currentlyReleasedRange = alreadyReleased
      ? `Day 1–${alreadyReleased}`
      : "None";
    if (
      !window.confirm(
        `Current released schedule: ${currentlyReleasedRange}\n` +
          `New total schedule: Day 1–${requestedDays}\n` +
          `New days to be released: Day ${firstNewDay}–${requestedDays}\n\nContinue?`
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
          farmerId: selectedReleaseFarmer.id,
          plotId: selectedReleasePlot.id,
          totalDays: requestedDays,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        showNotification(
          "error",
          result.message || "Unable to release schedule days."
        );
        return;
      }

      setScheduleProgress((current) => [
        ...current.filter((entry) => entry.id !== result.progress.id),
        result.progress as ScheduleProgress,
      ]);
      setScheduleHistory((current) => [
        ...current.filter(
          (entry) =>
            entry.farmerId !== selectedReleaseFarmer.id ||
            entry.plotId !== selectedReleasePlot.id
        ),
        ...(result.history as ScheduleExtensionHistory[]),
      ]);
      setSetTotalDays("");
      showNotification("success", result.message);
    } catch {
      showNotification("error", "Network error while releasing schedule days.");
    } finally {
      setReleaseSaving(false);
    }
  };

  const handleAddCrop = async () => {
    if (!newCropName.trim()) return;
    const name = newCropName.trim();
    try {
      const res = await fetch("/api/schedules/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_CROP", newCropName: name }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification("error", json.message || json.error || "Failed to add crop");
        return;
      }
      setSchedules(json.masterSchedules);
      setSelectedCrop(name);
      setNewCropName("");
      showNotification("success", `Crop "${name}" master schedule created!`);
    } catch (err) {
      showNotification("error", "Failed to add crop");
    }
  };

  const handleDeleteCrop = async () => {
    if (!selectedCrop) return;
    if (
      !confirm(
        `Delete "${selectedCrop}" and its master spray and fertilizer schedules? Farmer-specific schedules will not be changed.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/schedules/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_CROP",
          cropName: selectedCrop,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        showNotification("error", json.message || json.error || "Failed to delete crop");
        return;
      }

      const remainingSchedules = json.masterSchedules as Record<string, MasterCropSchedule>;
      const remainingCrops = Object.keys(remainingSchedules);
      setSchedules(remainingSchedules);
      setSelectedCrop(remainingCrops[0] || "");
      setEditingItemId(null);
      showNotification("success", `Crop "${selectedCrop}" and its master schedules deleted.`);
    } catch {
      showNotification("error", "Network error while deleting crop");
    }
  };

  const handleAddMedicineRow = () => {
    const firstMedicine = medicines[0];
    setForm((prev) => ({
      ...prev,
      medicines: [
        ...prev.medicines,
        {
          medicineId: firstMedicine?.id || "",
          medicineName: firstMedicine?.name || "",
          quantity: "20",
          unit: firstMedicine?.unitShortName || "ml",
        },
      ],
    }));
  };

  const handleRemoveMedicineRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrop) return;
    if (form.medicines.length === 0 || form.medicines.some((item) => !item.medicineName.trim())) {
      showNotification("error", "Enter a medicine name for every row before saving.");
      return;
    }

    const action = editingItemId ? "UPDATE_ITEM" : "ADD_ITEM";
    const payload = {
      action,
      cropName: selectedCrop,
      scheduleType: "spray",
      item: {
        ...form.medicines[0],
        id: editingItemId || undefined,
        day: Number(form.day),
        time: form.time,
        waterQuantity: form.waterQuantity,
        note: form.note,
      },
      items: form.medicines,
    };

    try {
      const res = await fetch("/api/schedules/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification("error", json.message || json.error || "Failed to save spray schedule item");
        return;
      }
      setSchedules(json.masterSchedules);
      setEditingItemId(null);
      setForm((prev) => ({
        ...prev,
        day: Number(prev.day) + 7,
        medicines: prev.medicines.slice(0, 1).map((item) => ({
          ...item,
          quantity: "20",
        })),
        note: "",
      }));
      showNotification(
        "success",
        editingItemId
          ? "Spray day updated in Master Schedule!"
          : "Spray day added to Master Schedule!"
      );
    } catch (err) {
      showNotification("error", "Failed to save spray schedule item");
    }
  };

  const handleEditClick = (item: MasterSprayItem) => {
    setEditingItemId(item.id);
    setForm({
      day: item.day,
      time: item.time,
      medicines: [{
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        quantity: item.quantity,
        unit: item.unit,
      }],
      waterQuantity: item.waterQuantity,
      note: item.note,
    });
    window.scrollTo({ top: 180, behavior: "smooth" });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this master schedule entry?")) return;
    try {
      const res = await fetch("/api/schedules/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_ITEM",
          cropName: selectedCrop,
          scheduleType: "spray",
          itemId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification("error", json.message || json.error || "Failed to delete item");
        return;
      }
      setSchedules(json.masterSchedules);
      showNotification("success", "Item deleted from Master Schedule");
    } catch (err) {
      showNotification("error", "Failed to delete item");
    }
  };

  const currentCropSchedule = schedules[selectedCrop];
  const sprayList = currentCropSchedule?.spraySchedules || [];
  const selectedReleaseMaster = selectedReleasePlot
    ? schedules[selectedReleasePlot.cropName]
    : undefined;
  const maxReleaseDay = selectedReleaseMaster
    ? Math.max(
        0,
        ...selectedReleaseMaster.spraySchedules.map((item) => item.day),
        ...selectedReleaseMaster.fertilizerSchedules.map((item) => item.day)
      )
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const cropList = Object.keys(schedules);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            3. Spray Master / Schedule Master
          </h1>
          <p className="text-xs text-slate-500">
            Define standard crop-wise spray schedules. Changes affect the{" "}
            <span className="font-bold text-emerald-700">Master Schedule only</span>.
          </p>
        </div>

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
      </div>

      <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-800">Set Days — Progressive Schedule Release</h2>
          <p className="mt-1 text-xs text-slate-600">
            Release a total crop-day limit for one farmer and plot. Previous days remain released and are never sent again.
          </p>
        </div>

        {completedSchedules.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p className="mb-2 text-xs font-bold text-amber-950">
              Schedule completed — ready for the next extension
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
                      setSelectedReleaseFarmerId(progress.farmerId);
                      setSelectedReleasePlotId(progress.plotId);
                    }}
                    className="block text-left text-xs text-amber-950 underline"
                  >
                    {farmer?.name || "Farmer"} — {plot?.cropName || progress.cropId}, Day {progress.lastDeliveredDay} completed
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold text-slate-700">
            Farmer
            <select
              value={selectedReleaseFarmerId}
              onChange={(event) => {
                const farmer = farmers.find((entry) => entry.id === event.target.value);
                setSelectedReleaseFarmerId(event.target.value);
                setSelectedReleasePlotId(farmer?.plots[0]?.id || "");
                setSetTotalDays("");
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
            >
              <option value="">Select farmer</option>
              {farmers.map((farmer) => (
                <option key={farmer.id} value={farmer.id}>{farmer.name}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Plot and crop
            <select
              value={selectedReleasePlotId}
              onChange={(event) => {
                setSelectedReleasePlotId(event.target.value);
                setSetTotalDays("");
              }}
              disabled={!selectedReleaseFarmer?.plots.length}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
            >
              <option value="">Select plot</option>
              {selectedReleaseFarmer?.plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.plotName} — {plot.cropName}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Set total days
            <input
              type="number"
              min={1}
              max={maxReleaseDay || undefined}
              step={1}
              value={setTotalDays}
              onChange={(event) => setSetTotalDays(event.target.value)}
              placeholder={maxReleaseDay ? `Maximum ${maxReleaseDay}` : "No master days"}
              disabled={!selectedReleasePlot || maxReleaseDay === 0}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
            />
          </label>
        </div>

        {selectedReleasePlot && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p>
              <strong>Farmer:</strong> {selectedReleaseFarmer?.name}
              {" · "}<strong>Crop:</strong> {selectedReleasePlot.cropName}
              {" · "}<strong>Plot:</strong> {selectedReleasePlot.plotName}
            </p>
            <p className="mt-1">
              <strong>Already released:</strong> {selectedReleaseProgress?.totalDaysReleased || 0} days
              {" · "}<strong>Last delivered day:</strong> {selectedReleaseProgress?.lastDeliveredDay || 0}
              {" · "}<strong>Current day:</strong> {selectedReleaseProgress?.currentDay || 0}
              {" · "}<strong>Status:</strong> {selectedReleaseProgress?.status || "Not started"}
            </p>
            <p className="mt-1">
              {selectedReleaseProgress
                ? `Released range: Day 1–${selectedReleaseProgress.totalDaysReleased}`
                : "No schedule days have been released."}
              {maxReleaseDay > 0 && ` · Master schedule maximum: Day ${maxReleaseDay}`}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleReleaseSchedule}
          disabled={!selectedReleasePlot || !setTotalDays || releaseSaving}
          className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {releaseSaving ? "Releasing..." : "Extend Schedule"}
        </button>

        {selectedReleaseHistory.length > 0 && (
          <div className="overflow-x-auto border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-bold text-slate-800">Schedule history</h3>
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="p-2">Action</th>
                  <th className="p-2">Previous total</th>
                  <th className="p-2">New total</th>
                  <th className="p-2">Newly released</th>
                  <th className="p-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedReleaseHistory.map((entry) => (
                  <tr key={entry.id}>
                    <td className="p-2">{entry.actionType}</td>
                    <td className="p-2">{entry.previousTotalDays}</td>
                    <td className="p-2">{entry.newTotalDays}</td>
                    <td className="p-2">Day {entry.releasedStartDay}–{entry.releasedEndDay}</td>
                    <td className="p-2">{new Date(entry.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Crop Selector Bar & Add Crop */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Crop Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            Crops:
          </span>
          {cropList.map((crop) => (
            <button
              key={crop}
              onClick={() => {
                setSelectedCrop(crop);
                setEditingItemId(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCrop === crop
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {crop} ({schedules[crop]?.spraySchedules?.length || 0} Sprays)
            </button>
          ))}
        </div>

        {/* Add New Crop Input */}
        <div className="flex items-center space-x-2 shrink-0">
          <input
            type="text"
            value={newCropName}
            onChange={(e) => setNewCropName(e.target.value)}
            placeholder="New Crop (e.g. Watermelon, Onion)"
            className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl w-48"
          />
          <button
            onClick={handleAddCrop}
            className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
          >
            + Add Crop
          </button>
          <button
            type="button"
            onClick={handleDeleteCrop}
            disabled={!selectedCrop}
            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            title={selectedCrop ? `Delete ${selectedCrop}` : "No crop selected"}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Crop
          </button>
        </div>
      </div>

      {/* Add / Edit Spray Schedule Item Form */}
      <form
        onSubmit={handleSaveItem}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <SprayCan className="w-4 h-4 text-emerald-700" />
            <span>
              {editingItemId
                ? `Edit Day in ${selectedCrop} Spray Master`
                : `Add New Spray Day to ${selectedCrop} Master`}
            </span>
          </h2>
          {editingItemId && (
            <button
              type="button"
              onClick={() => setEditingItemId(null)}
              className="text-xs text-slate-500 hover:underline"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Crop Day (e.g. 4, 10, 20) *
            </label>
            <input
              type="number"
              required
              min={1}
              value={form.day}
              onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Timing *
            </label>
            <select
              value={form.time}
              onChange={(e) =>
                setForm({ ...form, time: e.target.value as ScheduleTime })
              }
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            >
              <option value="Morning">Morning (सकाळ)</option>
              <option value="Evening">Evening (संध्याकाळ)</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Medicines for this day ({form.medicines.length})
            </label>
            {!editingItemId && (
              <button
                type="button"
                onClick={handleAddMedicineRow}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another medicine
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Add each medicine for this day separately; you can add as many as needed.
          </p>

          {form.medicines.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(120px,1fr)_auto] sm:items-end"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medicine {index + 1} *
                </label>
                <input
                  type="text"
                  required
                  list={`spray-master-medicines-${index}`}
                  value={item.medicineName}
                  onChange={(e) => {
                    const medicineName = e.target.value;
                    const medicine = medicines.find(
                      (candidate) =>
                        candidate.name.toLowerCase() === medicineName.trim().toLowerCase()
                    );
                    setForm((prev) => ({
                      ...prev,
                      medicines: prev.medicines.map((row, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...row,
                              medicineName,
                              medicineId: medicine?.id || "",
                              unit: medicine?.unitShortName || row.unit,
                            }
                          : row
                      ),
                    }));
                  }}
                  placeholder="Type a medicine name or choose a suggestion"
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium"
                />
                <datalist id={`spray-master-medicines-${index}`}>
                  {medicines.map((medicine) => (
                    <option key={medicine.id} value={medicine.name}>
                      {medicine.companyName}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity *
                </label>
                <div className="flex space-x-1.5">
                  <input
                    type="text"
                    required
                    value={item.quantity}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        medicines: prev.medicines.map((medicine, itemIndex) =>
                          itemIndex === index
                            ? { ...medicine, quantity: e.target.value }
                            : medicine
                        ),
                      }))
                    }
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
                    placeholder="20"
                  />
                  <input
                    type="text"
                    required
                    aria-label={`Unit for medicine ${index + 1}`}
                    value={item.unit}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        medicines: prev.medicines.map((medicine, itemIndex) =>
                          itemIndex === index
                            ? { ...medicine, unit: e.target.value }
                            : medicine
                        ),
                      }))
                    }
                    className="w-20 rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-bold text-slate-700"
                  />
                </div>
              </div>

              {form.medicines.length > 1 && !editingItemId && (
                <button
                  type="button"
                  onClick={() => handleRemoveMedicineRow(index)}
                  className="justify-self-end rounded-lg p-2 text-red-600 hover:bg-red-50 sm:mb-0.5"
                  aria-label={`Remove medicine ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Water Quantity *
            </label>
            <input
              type="text"
              required
              value={form.waterQuantity}
              onChange={(e) => setForm({ ...form, waterQuantity: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              placeholder="15 Litres"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Important Notes / Spray Advice / Sticker
            </label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              placeholder="e.g. Preventive spray against early blight."
            />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{editingItemId ? "Update Master" : "Add to Master"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Spray Schedule Entries Table */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              Standard Spray Schedule: {selectedCrop}
            </h3>
            <p className="text-xs text-slate-500">
              Total {sprayList.length} spray stages configured in template
            </p>
          </div>
        </div>

        {sprayList.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <SprayCan className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>No spray schedule entries added yet for {selectedCrop}.</p>
            <p className="text-slate-400 mt-1">Use the form above to add Day 4, Day 10, etc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Day / Stage</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Medicine Name</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Water Required</th>
                  <th className="py-2.5 px-3">Important Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sprayList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {item.day}th Day
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.time === "Morning"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {item.time}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
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
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                        title="Edit master schedule day"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        title="Delete from master schedule"
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
    </div>
  );
}

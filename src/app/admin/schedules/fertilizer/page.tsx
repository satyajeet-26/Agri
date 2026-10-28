"use client";

import React, { useState, useEffect } from "react";
import {
  Wheat,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle,
  AlertCircle,
  Droplets,
  Calendar,
} from "lucide-react";
import {
  MasterCropSchedule,
  MasterFertilizerItem,
  Fertilizer,
} from "@/types";

export default function FertilizerMasterPage() {
  const [schedules, setSchedules] = useState<Record<string, MasterCropSchedule>>({});
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>("Tomato");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New crop input
  const [newCropName, setNewCropName] = useState("");

  // Edit / Add Item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    day: number;
    stage: string;
    fertilizerId: string;
    fertilizerName: string;
    quantity: string;
    unit: string;
    applicationMethod: string;
    waterQuantity: string;
    note: string;
  }>({
    day: 1,
    stage: "Basal (लागवड वेळ)",
    fertilizerId: "",
    fertilizerName: "",
    quantity: "50",
    unit: "kg",
    applicationMethod: "Broadcasting in bed (बेसल डोस)",
    waterQuantity: "",
    note: "",
  });

  const loadData = async () => {
    try {
      const [resSched, resFert] = await Promise.all([
        fetch("/api/schedules/master"),
        fetch("/api/masters/medicines"),
      ]);
      const jsonSched = await resSched.json();
      const jsonFert = await resFert.json();

      if (jsonSched.success) {
        setSchedules(jsonSched.masterSchedules || {});
        const crops = Object.keys(jsonSched.masterSchedules || {});
        if (crops.length > 0 && !crops.includes(selectedCrop)) {
          setSelectedCrop(crops[0]);
        }
      }

      if (jsonFert.success && jsonFert.data?.fertilizers) {
        setFertilizers(jsonFert.data.fertilizers);
        if (jsonFert.data.fertilizers[0]) {
          setForm((prev) => ({
            ...prev,
            fertilizerId: jsonFert.data.fertilizers[0].id,
            fertilizerName: jsonFert.data.fertilizers[0].name,
            unit: jsonFert.data.fertilizers[0].unit,
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
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
      if (json.success) {
        setSchedules((prev) => ({
          ...prev,
          [name]: { cropName: name, spraySchedules: [], fertilizerSchedules: [] },
        }));
        setSelectedCrop(name);
        setNewCropName("");
        showNotification("success", `Crop "${name}" created!`);
      }
    } catch (err) {
      showNotification("error", "Failed to add crop");
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrop) return;

    const action = editingItemId ? "UPDATE_ITEM" : "ADD_ITEM";
    const payload = {
      action,
      cropName: selectedCrop,
      scheduleType: "fertilizer",
      item: {
        id: editingItemId || undefined,
        day: Number(form.day),
        stage: form.stage,
        fertilizerId: form.fertilizerId,
        fertilizerName: form.fertilizerName,
        quantity: form.quantity,
        unit: form.unit,
        applicationMethod: form.applicationMethod,
        waterQuantity: form.waterQuantity,
        note: form.note,
      },
    };

    try {
      const res = await fetch("/api/schedules/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setSchedules(json.masterSchedules);
        setEditingItemId(null);
        setForm((prev) => ({
          ...prev,
          day: Number(prev.day) + 15,
          stage: "Growth Stage",
          note: "",
        }));
        showNotification(
          "success",
          editingItemId
            ? "Fertilizer stage updated in Master Schedule!"
            : "Fertilizer stage added to Master Schedule!"
        );
      }
    } catch (err) {
      showNotification("error", "Failed to save fertilizer schedule item");
    }
  };

  const handleEditClick = (item: MasterFertilizerItem) => {
    setEditingItemId(item.id);
    setForm({
      day: item.day,
      stage: item.stage,
      fertilizerId: item.fertilizerId,
      fertilizerName: item.fertilizerName,
      quantity: item.quantity,
      unit: item.unit,
      applicationMethod: item.applicationMethod,
      waterQuantity: item.waterQuantity || "",
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
          scheduleType: "fertilizer",
          itemId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSchedules(json.masterSchedules);
        showNotification("success", "Item deleted from Master Schedule");
      }
    } catch (err) {
      showNotification("error", "Failed to delete item");
    }
  };

  const currentCropSchedule = schedules[selectedCrop];
  const fertList = currentCropSchedule?.fertilizerSchedules || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
            4. Fertilizer Schedule Master
          </h1>
          <p className="text-xs text-slate-500">
            Define standard crop-wise fertilizer & fertigation schedules. Changes affect the{" "}
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

      {/* Crop Selector Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              {crop} ({schedules[crop]?.fertilizerSchedules?.length || 0} Stages)
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <input
            type="text"
            value={newCropName}
            onChange={(e) => setNewCropName(e.target.value)}
            placeholder="New Crop (e.g. Watermelon)"
            className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl w-48"
          />
          <button
            onClick={handleAddCrop}
            className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
          >
            + Add Crop
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      <form
        onSubmit={handleSaveItem}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <Wheat className="w-4 h-4 text-emerald-700" />
            <span>
              {editingItemId
                ? `Edit Stage in ${selectedCrop} Fertilizer Master`
                : `Add Fertilizer Stage to ${selectedCrop} Master`}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Crop Day (e.g. 1, 15, 30) *
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
              Stage Name *
            </label>
            <input
              type="text"
              required
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              placeholder="e.g. Basal, Flowering"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Fertilizer *
            </label>
            <input
              type="text"
              required
              list="fertilizer-master-options"
              value={form.fertilizerName}
              onChange={(e) => {
                const fertilizerName = e.target.value;
                const fertilizer = fertilizers.find(
                  (candidate) =>
                    candidate.name.toLowerCase() === fertilizerName.trim().toLowerCase()
                );
                setForm((current) => ({
                  ...current,
                  fertilizerName,
                  fertilizerId: fertilizer?.id || "",
                  unit: fertilizer?.unit || current.unit,
                }));
              }}
              placeholder="Type a fertilizer name or select a suggestion"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
            />
            <datalist id="fertilizer-master-options">
              {fertilizers.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.company} - {f.type}
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity & Unit *
            </label>
            <div className="flex space-x-1.5">
              <input
                type="text"
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                placeholder="50"
              />
              <input
                type="text"
                required
                aria-label="Fertilizer quantity unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-20 rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-mono font-bold text-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Application Method *
            </label>
            <select
              value={form.applicationMethod}
              onChange={(e) => setForm({ ...form, applicationMethod: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            >
              <option value="Drip Irrigation (ठिबकद्वारे)">Drip Irrigation (ठिबकद्वारे)</option>
              <option value="Broadcasting in bed (बेसल डोस)">Broadcasting in bed (बेसल डोस)</option>
              <option value="Soil Drenching (आळवणी)">Soil Drenching (आळवणी)</option>
              <option value="Foliar Spray (पानांवर फवारणी)">Foliar Spray (पानांवर फवारणी)</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Important Instructions / Notes
            </label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              placeholder="e.g. Give through drip over 2 hours. Ensures rapid vegetative root growth."
            />
          </div>

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

      {/* Table */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              Standard Fertilizer Schedule: {selectedCrop}
            </h3>
            <p className="text-xs text-slate-500">
              Total {fertList.length} application stages in master template
            </p>
          </div>
        </div>

        {fertList.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <Wheat className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>No fertilizer schedule entries added yet for {selectedCrop}.</p>
            <p className="text-slate-400 mt-1">Use the form above to add stages.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Day</th>
                  <th className="py-2.5 px-3">Growth Stage</th>
                  <th className="py-2.5 px-3">Fertilizer Name</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Application Method</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fertList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {item.day}th Day
                      </span>
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
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {item.applicationMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={item.note}>
                      {item.note || "—"}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
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
    </div>
  );
}

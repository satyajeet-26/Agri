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
  ScheduleTime,
} from "@/types";

export default function SprayMasterPage() {
  const [schedules, setSchedules] = useState<Record<string, MasterCropSchedule>>({});
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>("Tomato");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New crop input
  const [newCropName, setNewCropName] = useState("");

  // Edit / Add Item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    day: number;
    time: ScheduleTime;
    medicineId: string;
    medicineName: string;
    quantity: string;
    unit: string;
    waterQuantity: string;
    note: string;
  }>({
    day: 10,
    time: "Morning",
    medicineId: "",
    medicineName: "",
    quantity: "20",
    unit: "ml",
    waterQuantity: "15 Litres",
    note: "",
  });

  const loadData = async () => {
    try {
      const [resSched, resMed] = await Promise.all([
        fetch("/api/schedules/master"),
        fetch("/api/masters/medicines"),
      ]);
      const jsonSched = await resSched.json();
      const jsonMed = await resMed.json();

      if (jsonSched.success) {
        setSchedules(jsonSched.masterSchedules || {});
        const crops = Object.keys(jsonSched.masterSchedules || {});
        if (crops.length > 0 && !crops.includes(selectedCrop)) {
          setSelectedCrop(crops[0]);
        }
      }

      if (jsonMed.success && jsonMed.data?.medicines) {
        setMedicines(jsonMed.data.medicines);
        if (jsonMed.data.medicines[0]) {
          setForm((prev) => ({
            ...prev,
            medicineId: jsonMed.data.medicines[0].id,
            medicineName: jsonMed.data.medicines[0].name,
            unit: jsonMed.data.medicines[0].unitShortName,
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
        showNotification("success", `Crop "${name}" master schedule created!`);
      }
    } catch (err) {
      showNotification("error", "Failed to add crop");
    }
  };

  const handleMedicineChange = (medicineId: string) => {
    const med = medicines.find((m) => m.id === medicineId);
    if (med) {
      setForm((prev) => ({
        ...prev,
        medicineId: med.id,
        medicineName: med.name,
        unit: med.unitShortName,
      }));
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrop) return;

    const action = editingItemId ? "UPDATE_ITEM" : "ADD_ITEM";
    const payload = {
      action,
      cropName: selectedCrop,
      scheduleType: "spray",
      item: {
        id: editingItemId || undefined,
        day: Number(form.day),
        time: form.time,
        medicineId: form.medicineId,
        medicineName: form.medicineName,
        quantity: form.quantity,
        unit: form.unit,
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
          day: Number(prev.day) + 7,
          note: "",
        }));
        showNotification(
          "success",
          editingItemId
            ? "Spray day updated in Master Schedule!"
            : "Spray day added to Master Schedule!"
        );
      }
    } catch (err) {
      showNotification("error", "Failed to save spray schedule item");
    }
  };

  const handleEditClick = (item: MasterSprayItem) => {
    setEditingItemId(item.id);
    setForm({
      day: item.day,
      time: item.time,
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      quantity: item.quantity,
      unit: item.unit,
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
      if (json.success) {
        setSchedules(json.masterSchedules);
        showNotification("success", "Item deleted from Master Schedule");
      }
    } catch (err) {
      showNotification("error", "Failed to delete item");
    }
  };

  const currentCropSchedule = schedules[selectedCrop];
  const sprayList = currentCropSchedule?.spraySchedules || [];

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
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

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Medicine (From Medicine Master) *
            </label>
            <select
              value={form.medicineId}
              onChange={(e) => handleMedicineChange(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.companyName})
                </option>
              ))}
            </select>
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
                placeholder="20"
              />
              <span className="inline-flex items-center px-2.5 rounded-xl bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
                {form.unit}
              </span>
            </div>
          </div>

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

          <div className="sm:col-span-2 lg:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Important Notes / Spray Advice / Sticker
            </label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              placeholder="e.g. Preventive spray against early blight. Spray during cool morning hours with sticker."
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
                      <span className="font-bold text-slate-800 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
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


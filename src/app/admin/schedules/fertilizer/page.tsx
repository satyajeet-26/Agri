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
import { useLanguage } from "@/components/LanguageContext";
import {
  MasterCropSchedule,
  MasterFertilizerItem,
  Fertilizer,
} from "@/types";

export default function FertilizerMasterPage() {
  const { lang } = useLanguage();
  const tr = (en: string, mr: string) => (lang === "mr" ? mr : en);
  const [schedules, setSchedules] = useState<Record<string, MasterCropSchedule>>({});
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([]);
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

      if (!resSched.ok || !jsonSched.success) {
        throw new Error(jsonSched.message || jsonSched.error || tr("Unable to load master schedules.", "मास्टर वेळापत्रके लोड करता आली नाहीत."));
      }
      if (!resFert.ok || !jsonFert.success) {
        throw new Error(jsonFert.message || jsonFert.error || tr("Unable to load fertilizer master data.", "खत मास्टरची माहिती लोड करता आली नाही."));
      }

      setSchedules(jsonSched.masterSchedules || {});
      const crops = Object.keys(jsonSched.masterSchedules || {});
      if (crops.length > 0 && !crops.includes(selectedCrop)) {
        setSelectedCrop(crops[0]);
      }

      if (jsonFert.data?.fertilizers) {
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
      showNotification(
        "error",
        err instanceof Error ? err.message : tr("Unable to load fertilizer schedules.", "खताचे वेळापत्रक लोड करता आले नाही.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        showNotification("error", json.message || json.error || tr("Failed to add crop", "पीक जोडता आले नाही"));
        return;
      }
      setSchedules(json.masterSchedules);
      setSelectedCrop(name);
      setNewCropName("");
      showNotification("success", tr(`Crop "${name}" created!`, `"${name}" पीक तयार केले!`));
    } catch (err) {
      showNotification("error", tr("Failed to add crop", "पीक जोडता आले नाही"));
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
      if (!res.ok || !json.success) {
        showNotification("error", json.message || json.error || tr("Failed to save fertilizer schedule item", "खताच्या वेळापत्रकाची नोंद जतन करता आली नाही"));
        return;
      }
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
          ? tr("Fertilizer stage updated in Master Schedule!", "मास्टर वेळापत्रकातील खताचा टप्पा अद्ययावत केला!")
          : tr("Fertilizer stage added to Master Schedule!", "मास्टर वेळापत्रकात खताचा टप्पा जोडला!")
      );
    } catch (err) {
      showNotification("error", tr("Failed to save fertilizer schedule item", "खताच्या वेळापत्रकाची नोंद जतन करता आली नाही"));
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
    if (!confirm(tr("Are you sure you want to delete this master schedule entry?", "मास्टर वेळापत्रकातील ही नोंद हटवायची आहे का?"))) return;
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
      if (!res.ok || !json.success) {
        showNotification("error", json.message || json.error || tr("Failed to delete item", "नोंद हटवता आली नाही"));
        return;
      }
      setSchedules(json.masterSchedules);
      showNotification("success", tr("Item deleted from Master Schedule", "मास्टर वेळापत्रकातून नोंद हटवली"));
    } catch (err) {
      showNotification("error", tr("Failed to delete item", "नोंद हटवता आली नाही"));
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
            {tr("4. Fertilizer Schedule Master", "४. खत वेळापत्रक मास्टर")}
          </h1>
          <p className="text-xs text-slate-500">
            {tr(
              "Define standard crop-wise fertilizer & fertigation schedules. Changes affect the ",
              "पिकानुसार खत आणि फर्टिगेशनचे मानक वेळापत्रक तयार करा. बदल फक्त "
            )}
            <span className="font-bold text-emerald-700">{tr("Master Schedule only", "मास्टर वेळापत्रकावर")}</span>
            {tr(".", " परिणाम करतात.")}
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
            {tr("Crops:", "पिके:")}
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
              {crop} ({schedules[crop]?.fertilizerSchedules?.length || 0} {tr("Stages", "टप्पे")})
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <input
            type="text"
            value={newCropName}
            onChange={(e) => setNewCropName(e.target.value)}
            placeholder={tr("New Crop (e.g. Watermelon)", "नवीन पीक (उदा. कलिंगड)")}
            className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl w-48"
          />
          <button
            onClick={handleAddCrop}
            className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
          >
            {tr("+ Add Crop", "+ पीक जोडा")}
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
                ? tr(`Edit Stage in ${selectedCrop} Fertilizer Master`, `${selectedCrop} खत मास्टरमधील टप्पा संपादित करा`)
                : tr(`Add Fertilizer Stage to ${selectedCrop} Master`, `${selectedCrop} मास्टरमध्ये खताचा टप्पा जोडा`)}
            </span>
          </h2>
          {editingItemId && (
            <button
              type="button"
              onClick={() => setEditingItemId(null)}
              className="text-xs text-slate-500 hover:underline"
            >
              {tr("Cancel Edit", "संपादन रद्द करा")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tr("Crop Day (e.g. 1, 15, 30) *", "पिकाचा दिवस (उदा. १, १५, ३०) *")}
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
              {tr("Stage Name *", "टप्प्याचे नाव *")}
            </label>
            <input
              type="text"
              required
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              placeholder={tr("e.g. Basal, Flowering", "उदा. बेसल, फुलोरा")}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tr("Select Fertilizer *", "खत निवडा *")}
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
              placeholder={tr("Type a fertilizer name or select a suggestion", "खताचे नाव टाइप करा किंवा सूचना निवडा")}
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
              {tr("Quantity & Unit *", "प्रमाण आणि एकक *")}
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
                aria-label={tr("Fertilizer quantity unit", "खताच्या प्रमाणाचे एकक")}
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-20 rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-mono font-bold text-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tr("Application Method *", "वापरण्याची पद्धत *")}
            </label>
            <select
              value={form.applicationMethod}
              onChange={(e) => setForm({ ...form, applicationMethod: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            >
              <option value="Drip Irrigation (ठिबकद्वारे)">{tr("Drip Irrigation (ठिबकद्वारे)", "ठिबक सिंचन")}</option>
              <option value="Broadcasting in bed (बेसल डोस)">{tr("Broadcasting in bed (बेसल डोस)", "वाफ्यात पसरवणे (बेसल डोस)")}</option>
              <option value="Soil Drenching (आळवणी)">{tr("Soil Drenching (आळवणी)", "जमिनीत आळवणी")}</option>
              <option value="Foliar Spray (पानांवर फवारणी)">{tr("Foliar Spray (पानांवर फवारणी)", "पानांवर फवारणी")}</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tr("Important Instructions / Notes", "महत्त्वाच्या सूचना / टिपा")}
            </label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              placeholder={tr("e.g. Give through drip over 2 hours. Ensures rapid vegetative root growth.", "उदा. २ तास ठिबकद्वारे द्या. यामुळे वाढीच्या टप्प्यात मुळांची जलद वाढ होते.")}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{editingItemId ? tr("Update Master", "मास्टर अद्ययावत करा") : tr("Add to Master", "मास्टरमध्ये जोडा")}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              {tr("Standard Fertilizer Schedule:", "मानक खत वेळापत्रक:")} {selectedCrop}
            </h3>
            <p className="text-xs text-slate-500">
              {tr(`Total ${fertList.length} application stages in master template`, `मास्टर नमुन्यात वापरण्याचे एकूण ${fertList.length} टप्पे`)}
            </p>
          </div>
        </div>

        {fertList.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <Wheat className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>{tr(`No fertilizer schedule entries added yet for ${selectedCrop}.`, `${selectedCrop} साठी अद्याप खत वेळापत्रक नोंदी जोडलेल्या नाहीत.`)}</p>
            <p className="text-slate-400 mt-1">{tr("Use the form above to add stages.", "टप्पे जोडण्यासाठी वरील फॉर्म वापरा.")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{tr("Day", "दिवस")}</th>
                  <th className="py-2.5 px-3">{tr("Growth Stage", "वाढीचा टप्पा")}</th>
                  <th className="py-2.5 px-3">{tr("Fertilizer Name", "खताचे नाव")}</th>
                  <th className="py-2.5 px-3">{tr("Quantity", "प्रमाण")}</th>
                  <th className="py-2.5 px-3">{tr("Application Method", "वापरण्याची पद्धत")}</th>
                  <th className="py-2.5 px-3">{tr("Notes", "टिपा")}</th>
                  <th className="py-2.5 px-3 text-right">{tr("Actions", "कृती")}</th>
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
                        title={tr("Edit fertilizer stage", "खताचा टप्पा संपादित करा")}
                        aria-label={tr("Edit fertilizer stage", "खताचा टप्पा संपादित करा")}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        title={tr("Delete fertilizer stage", "खताचा टप्पा हटवा")}
                        aria-label={tr("Delete fertilizer stage", "खताचा टप्पा हटवा")}
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

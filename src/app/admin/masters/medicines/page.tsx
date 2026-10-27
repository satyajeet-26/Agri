"use client";

import React, { useState, useEffect } from "react";
import {
  Pill,
  Building2,
  Tag,
  Wheat,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  MedicineCompany,
  MedicineCategory,
  Medicine,
  Fertilizer,
  UnitMaster,
  MedicineType,
} from "@/types";

export default function MedicineMasterPage() {
  const [activeTab, setActiveTab] = useState<
    "companies" | "categories" | "medicines" | "fertilizers"
  >("medicines");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [companies, setCompanies] = useState<MedicineCompany[]>([]);
  const [categories, setCategories] = useState<MedicineCategory[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([]);
  const [units, setUnits] = useState<UnitMaster[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Medicine Form
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [medForm, setMedForm] = useState<{
    name: string;
    type: MedicineType;
    companyId: string;
    categoryId: string;
    unitId: string;
  }>({
    name: "",
    type: "Liquid",
    companyId: "",
    categoryId: "",
    unitId: "",
  });

  // Fertilizer Form
  const [editingFertId, setEditingFertId] = useState<string | null>(null);
  const [fertForm, setFertForm] = useState<{
    name: string;
    company: string;
    type: "Granular" | "Water Soluble" | "Liquid" | "Organic";
    unit: string;
    notes: string;
  }>({
    name: "",
    company: "",
    type: "Water Soluble",
    unit: "kg",
    notes: "",
  });

  // Quick Company & Category additions
  const [newCompany, setNewCompany] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const loadData = async () => {
    try {
      const [resMed, resGen] = await Promise.all([
        fetch("/api/masters/medicines"),
        fetch("/api/masters/general"),
      ]);
      const jsonMed = await resMed.json();
      const jsonGen = await resGen.json();

      if (jsonMed.success) {
        setCompanies(jsonMed.data.medicineCompanies || []);
        setCategories(jsonMed.data.medicineCategories || []);
        setMedicines(jsonMed.data.medicines || []);
        setFertilizers(jsonMed.data.fertilizers || []);

        if (jsonMed.data.medicineCompanies?.[0]) {
          setMedForm((prev) => ({ ...prev, companyId: jsonMed.data.medicineCompanies[0].id }));
        }
        if (jsonMed.data.medicineCategories?.[0]) {
          setMedForm((prev) => ({ ...prev, categoryId: jsonMed.data.medicineCategories[0].id }));
        }
      }

      if (jsonGen.success) {
        setUnits(jsonGen.data.units || []);
        if (jsonGen.data.units?.[0]) {
          setMedForm((prev) => ({ ...prev, unitId: jsonGen.data.units[0].id }));
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

  // 1. Company Save
  const handleAddCompany = async () => {
    if (!newCompany.trim()) return;
    const item: MedicineCompany = {
      id: `mc-${Date.now()}`,
      name: newCompany.trim(),
    };
    const updated = [...companies, item];
    setCompanies(updated);
    setNewCompany("");
    await fetch("/api/masters/medicines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "companies", data: updated }),
    });
    showNotification("success", "Company added successfully!");
  };

  const handleDeleteCompany = async (id: string) => {
    const updated = companies.filter((c) => c.id !== id);
    setCompanies(updated);
    await fetch("/api/masters/medicines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "companies", data: updated }),
    });
  };

  // 2. Category Save
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const item: MedicineCategory = {
      id: `cat-${Date.now()}`,
      name: newCategory.trim(),
    };
    const updated = [...categories, item];
    setCategories(updated);
    setNewCategory("");
    await fetch("/api/masters/medicines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "categories", data: updated }),
    });
    showNotification("success", "Category added successfully!");
  };

  const handleDeleteCategory = async (id: string) => {
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    await fetch("/api/masters/medicines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "categories", data: updated }),
    });
  };

  // 3. Medicine Add / Edit
  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medForm.name.trim()) return;

    const comp = companies.find((c) => c.id === medForm.companyId);
    const cat = categories.find((c) => c.id === medForm.categoryId);
    const un = units.find((u) => u.id === medForm.unitId);

    const medData: Medicine = {
      id: editingMedId || `med-${Date.now()}`,
      name: medForm.name.trim(),
      type: medForm.type,
      companyId: medForm.companyId,
      companyName: comp?.name || "Other",
      categoryId: medForm.categoryId,
      categoryName: cat?.name || "General",
      unitId: medForm.unitId,
      unitShortName: un?.shortName || "ml",
    };

    let updated: Medicine[];
    if (editingMedId) {
      updated = medicines.map((m) => (m.id === editingMedId ? medData : m));
      setEditingMedId(null);
    } else {
      updated = [medData, ...medicines];
    }

    setMedicines(updated);
    setMedForm({
      name: "",
      type: "Liquid",
      companyId: companies[0]?.id || "",
      categoryId: categories[0]?.id || "",
      unitId: units[0]?.id || "",
    });

    await fetch("/api/masters/medicines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "medicines", data: updated }),
    });

    showNotification("success", editingMedId ? "Medicine updated!" : "Medicine added!");
  };

  const handleEditMedClick = (med: Medicine) => {
    setEditingMedId(med.id);
    setMedForm({
      name: med.name,
      type: med.type,
      companyId: med.companyId,
      categoryId: med.categoryId,
      unitId: med.unitId,
    });
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const handleDeleteMedicine = async (id: string) => {
    const updated = medicines.filter((m) => m.id !== id);
    setMedicines(updated);
    await fetch("/api/masters/medicines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "medicines", data: updated }),
    });
  };

  // 4. Fertilizer Add / Edit
  const handleSaveFertilizer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fertForm.name.trim()) return;

    const item: Fertilizer = {
      id: editingFertId || `fert-${Date.now()}`,
      name: fertForm.name.trim(),
      company: fertForm.company || "General",
      type: fertForm.type,
      unit: fertForm.unit,
      notes: fertForm.notes,
    };

    let updated: Fertilizer[];
    if (editingFertId) {
      updated = fertilizers.map((f) => (f.id === editingFertId ? item : f));
      setEditingFertId(null);
    } else {
      updated = [item, ...fertilizers];
    }

    setFertilizers(updated);
    setFertForm({
      name: "",
      company: "",
      type: "Water Soluble",
      unit: "kg",
      notes: "",
    });

    await fetch("/api/masters/medicines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "fertilizers", data: updated }),
    });

    showNotification("success", editingFertId ? "Fertilizer updated!" : "Fertilizer added!");
  };

  const handleDeleteFertilizer = async (id: string) => {
    const updated = fertilizers.filter((f) => f.id !== id);
    setFertilizers(updated);
    await fetch("/api/masters/medicines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "fertilizers", data: updated }),
    });
  };

  const filteredMedicines = medicines.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFertilizers = fertilizers.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            2. Medicine & Fertilizer Master
          </h1>
          <p className="text-xs text-slate-500">
            Manage chemical/organic medicines, manufacturing companies, categories, and fertilizers
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("medicines")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "medicines"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>C. Medicine Master ({medicines.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("fertilizers")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "fertilizers"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Wheat className="w-4 h-4" />
          <span>D. Fertilizer Master ({fertilizers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("companies")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "companies"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>A. Medicine Company ({companies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "categories"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>B. Categories ({categories.length})</span>
        </button>
      </div>

      {/* TAB C: MEDICINE MASTER */}
      {activeTab === "medicines" && (
        <div className="space-y-6">
          {/* Add / Edit Medicine Form */}
          <form
            onSubmit={handleSaveMedicine}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Pill className="w-4 h-4 text-emerald-700" />
                <span>{editingMedId ? "Edit Medicine" : "Add New Medicine"}</span>
              </h2>
              {editingMedId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMedId(null);
                    setMedForm({
                      name: "",
                      type: "Liquid",
                      companyId: companies[0]?.id || "",
                      categoryId: categories[0]?.id || "",
                      unitId: units[0]?.id || "",
                    });
                  }}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medicine Name & Technical Content *
                </label>
                <input
                  type="text"
                  required
                  value={medForm.name}
                  onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                  placeholder="e.g. Score (Difenoconazole 25% EC)"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medicine Type *
                </label>
                <select
                  value={medForm.type}
                  onChange={(e) =>
                    setMedForm({ ...medForm, type: e.target.value as MedicineType })
                  }
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="Liquid">Liquid (प्रवाही)</option>
                  <option value="Powder">Powder (पावडर)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company *
                </label>
                <select
                  value={medForm.companyId}
                  onChange={(e) => setMedForm({ ...medForm, companyId: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={medForm.categoryId}
                  onChange={(e) => setMedForm({ ...medForm, categoryId: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="w-full sm:w-48">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Measurement Unit
                </label>
                <select
                  value={medForm.unitId}
                  onChange={(e) => setMedForm({ ...medForm, unitId: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unitName} ({u.shortName})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{editingMedId ? "Update Medicine" : "Save New Medicine"}</span>
              </button>
            </div>
          </form>

          {/* Medicines List Table with Search */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                Registered Medicines ({filteredMedicines.length})
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search medicine or company..."
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Medicine Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMedicines.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-800">{m.name}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === "Liquid"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-3">{m.companyName}</td>
                      <td className="py-3 px-3 text-slate-700">{m.categoryName}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                        {m.unitShortName}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => handleEditMedClick(m)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMedicine(m.id)}
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
          </div>
        </div>
      )}

      {/* TAB D: FERTILIZER MASTER */}
      {activeTab === "fertilizers" && (
        <div className="space-y-6">
          {/* Add / Edit Fertilizer Form */}
          <form
            onSubmit={handleSaveFertilizer}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Wheat className="w-4 h-4 text-emerald-700" />
                <span>{editingFertId ? "Edit Fertilizer" : "Add Fertilizer"}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fertilizer Name (e.g. 10:26:26, DAP, 12:61:00) *
                </label>
                <input
                  type="text"
                  required
                  value={fertForm.name}
                  onChange={(e) => setFertForm({ ...fertForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  placeholder="10:26:26"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company / Brand
                </label>
                <input
                  type="text"
                  value={fertForm.company}
                  onChange={(e) => setFertForm({ ...fertForm, company: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  placeholder="Mahadhan / IFFCO"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fertilizer Type
                </label>
                <select
                  value={fertForm.type}
                  onChange={(e: any) => setFertForm({ ...fertForm, type: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="Water Soluble">Water Soluble (ठिबक खते)</option>
                  <option value="Granular">Granular (दाणेदार खते)</option>
                  <option value="Liquid">Liquid Fertilizer (प्रवाही खत)</option>
                  <option value="Organic">Organic (सेंद्रिय खत)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Unit
                </label>
                <input
                  type="text"
                  value={fertForm.unit}
                  onChange={(e) => setFertForm({ ...fertForm, unit: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  placeholder="kg or bag"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Application Guidance / Notes
                </label>
                <input
                  type="text"
                  value={fertForm.notes}
                  onChange={(e) => setFertForm({ ...fertForm, notes: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  placeholder="e.g. Best for root development & basal stage"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Fertilizer</span>
                </button>
              </div>
            </div>
          </form>

          {/* Fertilizer Table */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Fertilizer Name</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFertilizers.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-800">{f.name}</td>
                      <td className="py-3 px-3">{f.company}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
                          {f.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono">{f.unit}</td>
                      <td className="py-3 px-3 text-slate-500 italic">{f.notes}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteFertilizer(f.id)}
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
          </div>
        </div>
      )}

      {/* TAB A: COMPANIES */}
      {activeTab === "companies" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="Company Name (e.g. Syngenta, Bayer, UPL, Dhanuka, FMC)"
              className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            />
            <button
              onClick={handleAddCompany}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
            >
              Add Company
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
            {companies.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <span className="text-xs font-semibold text-slate-800">{c.name}</span>
                <button
                  onClick={() => handleDeleteCompany(c.id)}
                  className="text-slate-400 hover:text-red-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB B: CATEGORIES */}
      {activeTab === "categories" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category Name (e.g. Fungicide, Bactericides, Organic Insecticides, etc.)"
              className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            />
            <button
              onClick={handleAddCategory}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
            >
              Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <span className="text-xs font-semibold text-slate-800">{cat.name}</span>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="text-slate-400 hover:text-red-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


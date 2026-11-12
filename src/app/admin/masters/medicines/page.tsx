"use client";

import React, { useId, useState, useEffect } from "react";
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
import { useLanguage } from "@/components/LanguageContext";
import {
  MedicineCompany,
  MedicineCategory,
  Medicine,
  Fertilizer,
  UnitMaster,
  MedicineType,
} from "@/types";

type SearchOption = {
  value: string;
  label: string;
};

function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  allowCustom = false,
}: {
  value: string;
  options: SearchOption[];
  onChange: (value: string) => void;
  placeholder: string;
  allowCustom?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const selectedLabel = options.find((option) => option.value === value)?.label || value;
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  const close = () => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  };

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-controls={listId}
        aria-expanded={isOpen}
        aria-autocomplete="list"
        value={isOpen ? query : selectedLabel}
        onFocus={() => {
          setQuery("");
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setActiveIndex(0);
          if (allowCustom) onChange(nextQuery);
        }}
        onBlur={close}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && isOpen && filteredOptions.length > 0) {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % filteredOptions.length);
          } else if (event.key === "ArrowUp" && isOpen && filteredOptions.length > 0) {
            event.preventDefault();
            setActiveIndex((index) =>
              index === 0 ? filteredOptions.length - 1 : index - 1
            );
          } else if (event.key === "Enter" && isOpen) {
            const option = filteredOptions[activeIndex];
            if (option) {
              event.preventDefault();
              onChange(option.value);
              close();
            } else if (allowCustom) {
              close();
            }
          } else if (event.key === "Escape") {
            close();
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
      />
      {isOpen && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-xs ${
                  index === activeIndex
                    ? "bg-emerald-50 text-emerald-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-slate-500">
              {allowCustom
                ? "No matches. Press Enter to use this value."
                : "No matching options."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MedicineMasterPage() {
  const { lang } = useLanguage();
  const tr = (en: string, mr: string) => (lang === "mr" ? mr : en);
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
    technicalContent: string;
    type: MedicineType;
    companyId: string;
    categoryId: string;
    unitId: string;
  }>({
    name: "",
    technicalContent: "",
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
    showNotification("success", tr("Company added successfully!", "कंपनी यशस्वीरित्या जोडली!"));
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
    showNotification("success", tr("Category added successfully!", "वर्ग यशस्वीरित्या जोडला!"));
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
    if (
      !companies.some((company) => company.id === medForm.companyId) ||
      !categories.some((category) => category.id === medForm.categoryId) ||
      !units.some((unit) => unit.id === medForm.unitId)
    ) {
      showNotification(
        "error",
        tr("Select a valid company, category, and measurement unit.", "वैध कंपनी, वर्ग आणि मोजमापाचे एकक निवडा.")
      );
      return;
    }

    const comp = companies.find((c) => c.id === medForm.companyId);
    const cat = categories.find((c) => c.id === medForm.categoryId);
    const un = units.find((u) => u.id === medForm.unitId);

    const medData: Medicine = {
      id: editingMedId || `med-${Date.now()}`,
      name: medForm.name.trim(),
      technicalContent: medForm.technicalContent.trim(),
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
      technicalContent: "",
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

    showNotification("success", editingMedId ? tr("Medicine updated!", "औषध अद्ययावत केले!") : tr("Medicine added!", "औषध जोडले!"));
  };

  const handleEditMedClick = (med: Medicine) => {
    setEditingMedId(med.id);
    setMedForm({
      name: med.name,
      technicalContent: med.technicalContent || "",
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

    showNotification("success", editingFertId ? tr("Fertilizer updated!", "खत अद्ययावत केले!") : tr("Fertilizer added!", "खत जोडले!"));
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
    (m.technicalContent || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            {tr("2. Medicine & Fertilizer Master", "२. औषध आणि खत मास्टर")}
          </h1>
          <p className="text-xs text-slate-500">
            {tr(
              "Manage chemical/organic medicines, manufacturing companies, categories, and fertilizers",
              "रासायनिक/सेंद्रिय औषधे, उत्पादक कंपन्या, वर्ग आणि खते व्यवस्थापित करा"
            )}
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
          <span>{tr("C. Medicine Master", "क. औषध मास्टर")} ({medicines.length})</span>
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
          <span>{tr("D. Fertilizer Master", "ड. खत मास्टर")} ({fertilizers.length})</span>
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
          <span>{tr("A. Medicine Company", "अ. औषध कंपनी")} ({companies.length})</span>
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
          <span>{tr("B. Categories", "ब. वर्ग")} ({categories.length})</span>
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
                <span>{editingMedId ? tr("Edit Medicine", "औषध संपादित करा") : tr("Add New Medicine", "नवीन औषध जोडा")}</span>
              </h2>
              {editingMedId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMedId(null);
                    setMedForm({
                      name: "",
                      technicalContent: "",
                      type: "Liquid",
                      companyId: companies[0]?.id || "",
                      categoryId: categories[0]?.id || "",
                      unitId: units[0]?.id || "",
                    });
                  }}
                  className="text-xs text-slate-500 hover:underline"
                >
                  {tr("Cancel Edit", "संपादन रद्द करा")}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Medicine Name *", "औषधाचे नाव *")}
                </label>
                <input
                  type="text"
                  required
                  value={medForm.name}
                  onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                  placeholder="e.g. Score"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Technical Content", "तांत्रिक घटक")}
                </label>
                <input
                  type="text"
                  value={medForm.technicalContent}
                  onChange={(e) =>
                    setMedForm({ ...medForm, technicalContent: e.target.value })
                  }
                  placeholder="e.g. Difenoconazole 25% EC"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Medicine Type *", "औषधाचा प्रकार *")}
                </label>
                <select
                  value={medForm.type}
                  onChange={(e) =>
                    setMedForm({ ...medForm, type: e.target.value as MedicineType })
                  }
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="Liquid">{tr("Liquid (प्रवाही)", "प्रवाही")}</option>
                  <option value="Powder">{tr("Powder (पावडर)", "पावडर")}</option>
                  <option value="Granules">{tr("Granules (दाणेदार)", "दाणेदार")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Company *", "कंपनी *")}
                </label>
                <SearchableSelect
                  value={medForm.companyId}
                  options={companies.map((company) => ({
                    value: company.id,
                    label: company.name,
                  }))}
                  onChange={(companyId) => setMedForm({ ...medForm, companyId })}
                  placeholder={tr("Search companies...", "कंपन्या शोधा...")}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Category *", "वर्ग *")}
                </label>
                <SearchableSelect
                  value={medForm.categoryId}
                  options={categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                  onChange={(categoryId) => setMedForm({ ...medForm, categoryId })}
                  placeholder={tr("Search categories...", "वर्ग शोधा...")}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="w-full sm:w-48">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Measurement Unit", "मोजमापाचे एकक")}
                </label>
                <SearchableSelect
                  value={medForm.unitId}
                  options={units.map((unit) => ({
                    value: unit.id,
                    label: `${unit.unitName} (${unit.shortName})`,
                  }))}
                  onChange={(unitId) => setMedForm({ ...medForm, unitId })}
                  placeholder={tr("Search measurement units...", "मोजमापाची एकके शोधा...")}
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{editingMedId ? tr("Update Medicine", "औषध अद्ययावत करा") : tr("Save New Medicine", "नवीन औषध जतन करा")}</span>
              </button>
            </div>
          </form>

          {/* Medicines List Table with Search */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                {tr("Registered Medicines", "नोंदणीकृत औषधे")} ({filteredMedicines.length})
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={tr("Search medicine or company...", "औषध किंवा कंपनी शोधा...")}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">{tr("Medicine Name", "औषधाचे नाव")}</th>
                    <th className="py-2.5 px-3">{tr("Technical Content", "तांत्रिक घटक")}</th>
                    <th className="py-2.5 px-3">{tr("Type", "प्रकार")}</th>
                    <th className="py-2.5 px-3">{tr("Company", "कंपनी")}</th>
                    <th className="py-2.5 px-3">{tr("Category", "वर्ग")}</th>
                    <th className="py-2.5 px-3">{tr("Unit", "एकक")}</th>
                    <th className="py-2.5 px-3 text-right">{tr("Actions", "कृती")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMedicines.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-800">{m.name}</td>
                      <td className="py-3 px-3">{m.technicalContent || "—"}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === "Liquid"
                              ? "bg-blue-100 text-blue-800"
                              : m.type === "Granules"
                                ? "bg-emerald-100 text-emerald-800"
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
                          title={tr("Edit medicine", "औषध संपादित करा")}
                          aria-label={tr("Edit medicine", "औषध संपादित करा")}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMedicine(m.id)}
                          title={tr("Delete medicine", "औषध हटवा")}
                          aria-label={tr("Delete medicine", "औषध हटवा")}
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
                <span>{editingFertId ? tr("Edit Fertilizer", "खत संपादित करा") : tr("Add Fertilizer", "खत जोडा")}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Fertilizer Name (e.g. 10:26:26, DAP, 12:61:00) *", "खताचे नाव (उदा. 10:26:26, DAP, 12:61:00) *")}
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
                  {tr("Company / Brand", "कंपनी / ब्रँड")}
                </label>
                <SearchableSelect
                  value={fertForm.company}
                  options={companies.map((company) => ({
                    value: company.name,
                    label: company.name,
                  }))}
                  onChange={(company) => setFertForm({ ...fertForm, company })}
                  placeholder={tr("Search or enter a company...", "कंपनी शोधा किंवा प्रविष्ट करा...")}
                  allowCustom
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Fertilizer Type", "खताचा प्रकार")}
                </label>
                <select
                  value={fertForm.type}
                  onChange={(e: any) => setFertForm({ ...fertForm, type: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="Water Soluble">{tr("Water Soluble (ठिबक खते)", "पाण्यात विरघळणारे")}</option>
                  <option value="Granular">{tr("Granular (दाणेदार खते)", "दाणेदार खत")}</option>
                  <option value="Liquid">{tr("Liquid Fertilizer (प्रवाही खत)", "प्रवाही खत")}</option>
                  <option value="Organic">{tr("Organic (सेंद्रिय खत)", "सेंद्रिय खत")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Default Unit", "मूलभूत एकक")}
                </label>
                <SearchableSelect
                  value={fertForm.unit}
                  options={units.map((unit) => ({
                    value: unit.shortName,
                    label: `${unit.unitName} (${unit.shortName})`,
                  }))}
                  onChange={(unit) => setFertForm({ ...fertForm, unit })}
                  placeholder={tr("Search or enter a unit...", "एकक शोधा किंवा प्रविष्ट करा...")}
                  allowCustom
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr("Application Guidance / Notes", "वापरण्याचे मार्गदर्शन / टिपा")}
                </label>
                <input
                  type="text"
                  value={fertForm.notes}
                  onChange={(e) => setFertForm({ ...fertForm, notes: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  placeholder={tr("e.g. Best for root development & basal stage", "उदा. मुळांच्या वाढीसाठी आणि बेसल टप्प्यासाठी उपयुक्त")}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{tr("Save Fertilizer", "खत जतन करा")}</span>
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
                    <th className="py-2.5 px-3">{tr("Fertilizer Name", "खताचे नाव")}</th>
                    <th className="py-2.5 px-3">{tr("Company", "कंपनी")}</th>
                    <th className="py-2.5 px-3">{tr("Type", "प्रकार")}</th>
                    <th className="py-2.5 px-3">{tr("Unit", "एकक")}</th>
                    <th className="py-2.5 px-3">{tr("Notes", "टिपा")}</th>
                    <th className="py-2.5 px-3 text-right">{tr("Actions", "कृती")}</th>
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
                          title={tr("Delete fertilizer", "खत हटवा")}
                          aria-label={tr("Delete fertilizer", "खत हटवा")}
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
              placeholder={tr("Company Name (e.g. Syngenta, Bayer, UPL, Dhanuka, FMC)", "कंपनीचे नाव (उदा. Syngenta, Bayer, UPL, Dhanuka, FMC)")}
              className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            />
            <button
              onClick={handleAddCompany}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
            >
              {tr("Add Company", "कंपनी जोडा")}
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
                  title={tr("Delete company", "कंपनी हटवा")}
                  aria-label={tr("Delete company", "कंपनी हटवा")}
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
              placeholder={tr("Category Name (e.g. Fungicide, Bactericides, Organic Insecticides, etc.)", "वर्गाचे नाव (उदा. बुरशीनाशक, जीवाणूनाशक, सेंद्रिय कीटकनाशक इ.)")}
              className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            />
            <button
              onClick={handleAddCategory}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
            >
              {tr("Add Category", "वर्ग जोडा")}
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
                  title={tr("Delete category", "वर्ग हटवा")}
                  aria-label={tr("Delete category", "वर्ग हटवा")}
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

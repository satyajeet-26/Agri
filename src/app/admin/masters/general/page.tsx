"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Calendar,
  Ruler,
  KeyRound,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  ShopProfile,
  YearMaster,
  UnitMaster,
  StateMaster,
  DistrictMaster,
  TalukaMaster,
  VillageMaster,
} from "@/types";

export default function GeneralMasterPage() {
  const [activeTab, setActiveTab] = useState<
    "shop" | "years" | "units" | "login" | "locations"
  >("shop");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // States
  const [shop, setShop] = useState<ShopProfile>({
    id: "shop-01",
    name: "",
    ownerName: "",
    tagline: "",
    mobile: "",
    whatsapp: "",
    email: "",
    address: "",
    licenseNumber: "",
    gstNumber: "",
  });

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [years, setYears] = useState<YearMaster[]>([]);
  const [units, setUnits] = useState<UnitMaster[]>([]);
  const [states, setStates] = useState<StateMaster[]>([]);
  const [districts, setDistricts] = useState<DistrictMaster[]>([]);
  const [talukas, setTalukas] = useState<TalukaMaster[]>([]);
  const [villages, setVillages] = useState<VillageMaster[]>([]);

  // Sub-tab for Locations
  const [locationSubTab, setLocationSubTab] = useState<"state" | "district" | "taluka" | "village">("village");

  // Form inputs for adding items
  const [newYear, setNewYear] = useState({ yearName: "", startDate: "", endDate: "" });
  const [newUnit, setNewUnit] = useState({ unitName: "", shortName: "" });
  const [newState, setNewState] = useState("");
  const [newDistrict, setNewDistrict] = useState({ name: "", stateId: "" });
  const [newTaluka, setNewTaluka] = useState({ name: "", districtId: "" });
  const [newVillage, setNewVillage] = useState({ name: "", talukaId: "" });

  const loadData = async () => {
    try {
      const res = await fetch("/api/masters/general");
      const json = await res.json();
      if (json.success) {
        const d = json.data;
        setShop(d.shop || {});
        setAdminEmail(d.admin?.email || "");
        setYears(d.years || []);
        setUnits(d.units || []);
        setStates(d.states || []);
        setDistricts(d.districts || []);
        setTalukas(d.talukas || []);
        setVillages(d.villages || []);

        // Pre-select location parent dropdowns
        if (d.states?.[0]) setNewDistrict((prev) => ({ ...prev, stateId: d.states[0].id }));
        if (d.districts?.[0]) setNewTaluka((prev) => ({ ...prev, districtId: d.districts[0].id }));
        if (d.talukas?.[0]) setNewVillage((prev) => ({ ...prev, talukaId: d.talukas[0].id }));
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

  // 1. Save Shop Profile
  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/masters/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "shop", data: shop }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification("success", "Shop details updated successfully!");
      }
    } catch (err) {
      showNotification("error", "Failed to update shop details.");
    }
  };

  // 2. Save Admin Login Settings
  const handleSaveLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/masters/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "admin_login",
          data: { email: adminEmail, password: adminPassword || undefined },
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification("success", "Admin login credentials updated successfully!");
        setAdminPassword("");
      }
    } catch (err) {
      showNotification("error", "Failed to update login credentials.");
    }
  };

  // 3. Year Master Helpers
  const handleAddYear = async () => {
    if (!newYear.yearName) return;
    const item: YearMaster = {
      id: `yr-${Date.now()}`,
      yearName: newYear.yearName,
      startDate: newYear.startDate || "2026-04-01",
      endDate: newYear.endDate || "2027-03-31",
      isActive: years.length === 0,
    };
    const updated = [...years, item];
    setYears(updated);
    setNewYear({ yearName: "", startDate: "", endDate: "" });
    await fetch("/api/masters/general", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "years", data: updated }),
    });
    showNotification("success", "Year added successfully!");
  };

  const handleToggleYearActive = async (id: string) => {
    const updated = years.map((y) => ({ ...y, isActive: y.id === id }));
    setYears(updated);
    await fetch("/api/masters/general", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "years", data: updated }),
    });
    showNotification("success", "Active financial year updated!");
  };

  const handleDeleteYear = async (id: string) => {
    const updated = years.filter((y) => y.id !== id);
    setYears(updated);
    await fetch("/api/masters/general", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "years", data: updated }),
    });
  };

  // 4. Unit Master Helpers
  const handleAddUnit = async () => {
    if (!newUnit.unitName || !newUnit.shortName) return;
    const item: UnitMaster = {
      id: `u-${Date.now()}`,
      unitName: newUnit.unitName,
      shortName: newUnit.shortName,
    };
    const updated = [...units, item];
    setUnits(updated);
    setNewUnit({ unitName: "", shortName: "" });
    await fetch("/api/masters/general", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "units", data: updated }),
    });
    showNotification("success", "Unit added successfully!");
  };

  const handleDeleteUnit = async (id: string) => {
    const updated = units.filter((u) => u.id !== id);
    setUnits(updated);
    await fetch("/api/masters/general", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "units", data: updated }),
    });
  };

  // 5. Locations Helpers
  const handleAddState = async () => {
    if (!newState) return;
    const item: StateMaster = { id: `st-${Date.now()}`, name: newState };
    const updated = [...states, item];
    setStates(updated);
    setNewState("");
    await fetch("/api/masters/general", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "states", data: updated }),
    });
    showNotification("success", "State added!");
  };

  const handleAddDistrict = async () => {
    if (!newDistrict.name || !newDistrict.stateId) return;
    const item: DistrictMaster = {
      id: `dt-${Date.now()}`,
      stateId: newDistrict.stateId,
      name: newDistrict.name,
    };
    const updated = [...districts, item];
    setDistricts(updated);
    setNewDistrict({ ...newDistrict, name: "" });
    await fetch("/api/masters/general", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "districts", data: updated }),
    });
    showNotification("success", "District added!");
  };

  const handleAddTaluka = async () => {
    if (!newTaluka.name || !newTaluka.districtId) return;
    const item: TalukaMaster = {
      id: `tk-${Date.now()}`,
      districtId: newTaluka.districtId,
      name: newTaluka.name,
    };
    const updated = [...talukas, item];
    setTalukas(updated);
    setNewTaluka({ ...newTaluka, name: "" });
    await fetch("/api/masters/general", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "talukas", data: updated }),
    });
    showNotification("success", "Taluka added!");
  };

  const handleAddVillage = async () => {
    if (!newVillage.name || !newVillage.talukaId) return;
    const item: VillageMaster = {
      id: `vg-${Date.now()}`,
      talukaId: newVillage.talukaId,
      name: newVillage.name,
    };
    const updated = [...villages, item];
    setVillages(updated);
    setNewVillage({ ...newVillage, name: "" });
    await fetch("/api/masters/general", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "villages", data: updated }),
    });
    showNotification("success", "Village added!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            1. General Master Settings
          </h1>
          <p className="text-xs text-slate-500">
            Configure Krushi Seva Kendra Profile, Financial Years, Units, Login, and State/District/Taluka/Village locations
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
          onClick={() => setActiveTab("shop")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "shop"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>A. Company / Shop Name</span>
        </button>

        <button
          onClick={() => setActiveTab("years")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "years"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>B. Year Master</span>
        </button>

        <button
          onClick={() => setActiveTab("units")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "units"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Ruler className="w-4 h-4" />
          <span>C. Unit Master</span>
        </button>

        <button
          onClick={() => setActiveTab("login")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "login"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>D. Login Settings</span>
        </button>

        <button
          onClick={() => setActiveTab("locations")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "locations"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>E–H. State → Village Masters</span>
        </button>
      </div>

      {/* TAB A: Shop Profile */}
      {activeTab === "shop" && (
        <form
          onSubmit={handleSaveShop}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5"
        >
          <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-emerald-700" />
            <span>Krushi Seva Kendra Shop Details</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company / Shop Name *
              </label>
              <input
                type="text"
                required
                value={shop.name}
                onChange={(e) => setShop({ ...shop, name: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Shree Krushi Seva Kendra & Consultancy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Owner / Consultant Name
              </label>
              <input
                type="text"
                value={shop.ownerName}
                onChange={(e) => setShop({ ...shop, ownerName: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Sachin Patil (M.Sc. Agri)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={shop.tagline}
                onChange={(e) => setShop({ ...shop, tagline: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Complete Agricultural Consultancy & Quality Pesticides"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Calling Mobile Number
              </label>
              <input
                type="text"
                value={shop.mobile}
                onChange={(e) => setShop({ ...shop, mobile: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder="+91 9822012345"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official WhatsApp Number (For Advisories)
              </label>
              <input
                type="text"
                value={shop.whatsapp}
                onChange={(e) => setShop({ ...shop, whatsapp: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder="+91 9822012345"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Email ID
              </label>
              <input
                type="email"
                value={shop.email}
                onChange={(e) => setShop({ ...shop, email: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder="contact@krushiseva.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Address / Location
              </label>
              <textarea
                rows={2}
                value={shop.address}
                onChange={(e) => setShop({ ...shop, address: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder="Market Yard, Near Old APMC, Karad, Dist. Satara"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fertilizer & Pesticide License No.
              </label>
              <input
                type="text"
                value={shop.licenseNumber}
                onChange={(e) => setShop({ ...shop, licenseNumber: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder="AGRI/MH/STR/2026/8942"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GST Number
              </label>
              <input
                type="text"
                value={shop.gstNumber}
                onChange={(e) => setShop({ ...shop, gstNumber: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder="27AAAAA0000A1Z5"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Company / Shop Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB B: Year Master */}
      {activeTab === "years" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Financial / Agriculture Year Master</h2>
              <p className="text-xs text-slate-500">Manage financial years (e.g. 2026–27, 2027–28)</p>
            </div>
          </div>

          {/* Add Year Form */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year Name (e.g. 2026–27)</label>
              <input
                type="text"
                value={newYear.yearName}
                onChange={(e) => setNewYear({ ...newYear, yearName: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
                placeholder="2026–27"
              />
            </div>
            <div className="w-full sm:w-44">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={newYear.startDate}
                onChange={(e) => setNewYear({ ...newYear, startDate: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div className="w-full sm:w-44">
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={newYear.endDate}
                onChange={(e) => setNewYear({ ...newYear, endDate: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <button
              onClick={handleAddYear}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Year</span>
            </button>
          </div>

          {/* Years List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Year Name</th>
                  <th className="py-2.5 px-3">Start Date</th>
                  <th className="py-2.5 px-3">End Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {years.map((y) => (
                  <tr key={y.id}>
                    <td className="py-3 px-3 font-bold text-slate-800">{y.yearName}</td>
                    <td className="py-3 px-3">{y.startDate}</td>
                    <td className="py-3 px-3">{y.endDate}</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleYearActive(y.id)}
                        className={`px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                          y.isActive
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {y.isActive ? "✓ Active Year" : "Set Active"}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteYear(y.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB C: Unit Master */}
      {activeTab === "units" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Unit Master</h2>
              <p className="text-xs text-slate-500">Units used for medicines, tonics and fertilizers</p>
            </div>
          </div>

          {/* Add Unit Form */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Full Name (e.g. Milliliter)</label>
              <input
                type="text"
                value={newUnit.unitName}
                onChange={(e) => setNewUnit({ ...newUnit, unitName: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
                placeholder="Milliliter"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Short Name / Symbol (e.g. ml)</label>
              <input
                type="text"
                value={newUnit.shortName}
                onChange={(e) => setNewUnit({ ...newUnit, shortName: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
                placeholder="ml"
              />
            </div>
            <button
              onClick={handleAddUnit}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Unit</span>
            </button>
          </div>

          {/* Units Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Unit Name</th>
                  <th className="py-2.5 px-3">Short Name</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-3 font-semibold text-slate-800">{u.unitName}</td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 font-mono font-bold text-xs">
                        {u.shortName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteUnit(u.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB D: Login Settings */}
      {activeTab === "login" && (
        <form
          onSubmit={handleSaveLogin}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5 max-w-lg"
        >
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">Admin Login Settings</h2>
            <p className="text-xs text-slate-500">Change Admin login email address and security password</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Email ID *
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Admin Password (leave blank to keep unchanged)
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Update Login Credentials</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB E-H: State -> District -> Taluka -> Village */}
      {activeTab === "locations" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">Location Hierarchy Master</h2>
            <p className="text-xs text-slate-500">
              Structured location chain: <span className="font-semibold text-emerald-700">State → District → Taluka → Village</span>
            </p>
          </div>

          {/* Sub tabs for locations */}
          <div className="flex gap-2">
            {(["state", "district", "taluka", "village"] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => setLocationSubTab(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  locationSubTab === sub
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {sub} Master ({sub === "state" ? states.length : sub === "district" ? districts.length : sub === "taluka" ? talukas.length : villages.length})
              </button>
            ))}
          </div>

          {/* State Form & Table */}
          {locationSubTab === "state" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  placeholder="State Name (e.g. Maharashtra)"
                  className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
                <button
                  onClick={handleAddState}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  Add State
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {states.map((s) => (
                  <div key={s.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                    {s.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* District Form & Table */}
          {locationSubTab === "district" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={newDistrict.stateId}
                  onChange={(e) => setNewDistrict({ ...newDistrict, stateId: e.target.value })}
                  className="text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="">Select State</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newDistrict.name}
                  onChange={(e) => setNewDistrict({ ...newDistrict, name: e.target.value })}
                  placeholder="District Name (e.g. Satara)"
                  className="text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
                <button
                  onClick={handleAddDistrict}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  Add District
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {districts.map((d) => (
                  <div key={d.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                    {d.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Taluka Form & Table */}
          {locationSubTab === "taluka" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={newTaluka.districtId}
                  onChange={(e) => setNewTaluka({ ...newTaluka, districtId: e.target.value })}
                  className="text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="">Select District</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newTaluka.name}
                  onChange={(e) => setNewTaluka({ ...newTaluka, name: e.target.value })}
                  placeholder="Taluka Name (e.g. Karad)"
                  className="text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
                <button
                  onClick={handleAddTaluka}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  Add Taluka
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {talukas.map((t) => (
                  <div key={t.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                    {t.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Village Form & Table */}
          {locationSubTab === "village" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={newVillage.talukaId}
                  onChange={(e) => setNewVillage({ ...newVillage, talukaId: e.target.value })}
                  className="text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="">Select Taluka</option>
                  {talukas.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newVillage.name}
                  onChange={(e) => setNewVillage({ ...newVillage, name: e.target.value })}
                  placeholder="Village Name (e.g. Vadgaon, Kole)"
                  className="text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
                <button
                  onClick={handleAddVillage}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  Add Village
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {villages.map((v) => (
                  <div key={v.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                    {v.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


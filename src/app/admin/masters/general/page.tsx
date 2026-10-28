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

function createLocationId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

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
  const [locationSubTab, setLocationSubTab] = useState<
    "state" | "district" | "taluka" | "village"
  >("state");
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedTalukaId, setSelectedTalukaId] = useState("");
  const [newLocationName, setNewLocationName] = useState("");

  // Form inputs for adding items
  const [newYear, setNewYear] = useState({ yearName: "", startDate: "", endDate: "" });
  const [newUnit, setNewUnit] = useState({ unitName: "", shortName: "" });

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
        const firstState = d.states?.[0];
        const firstDistrict = d.districts?.find(
          (district: DistrictMaster) => district.stateId === firstState?.id
        );
        const firstTaluka = d.talukas?.find(
          (taluka: TalukaMaster) => taluka.districtId === firstDistrict?.id
        );
        setSelectedStateId(firstState?.id || "");
        setSelectedDistrictId(firstDistrict?.id || "");
        setSelectedTalukaId(firstTaluka?.id || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveLocationList = async (
    section: "states" | "districts" | "talukas" | "villages",
    data: StateMaster[] | DistrictMaster[] | TalukaMaster[] | VillageMaster[]
  ) => {
    try {
      const res = await fetch("/api/masters/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification("error", json.error || `Failed to save ${section}.`);
        return false;
      }
      return true;
    } catch {
      showNotification("error", `Failed to save ${section}.`);
      return false;
    }
  };

  const handleAddLocation = async () => {
    const name = newLocationName.trim();
    if (!name) return;

    if (locationSubTab === "state") {
      if (states.some((state) => state.name.toLowerCase() === name.toLowerCase())) {
        showNotification("error", "This state already exists.");
        return;
      }
      const state = { id: createLocationId("st"), name };
      const updated = [...states, state];
      if (await saveLocationList("states", updated)) {
        setStates(updated);
        setSelectedStateId(state.id);
        setSelectedDistrictId("");
        setSelectedTalukaId("");
        setNewLocationName("");
        showNotification("success", "State added.");
      }
      return;
    }

    if (locationSubTab === "district") {
      if (!selectedStateId) {
        showNotification("error", "Add and select a state first.");
        return;
      }
      if (districts.some((district) => district.stateId === selectedStateId && district.name.toLowerCase() === name.toLowerCase())) {
        showNotification("error", "This district already exists in the selected state.");
        return;
      }
      const district = { id: createLocationId("dt"), stateId: selectedStateId, name };
      const updated = [...districts, district];
      if (await saveLocationList("districts", updated)) {
        setDistricts(updated);
        setSelectedDistrictId(district.id);
        setSelectedTalukaId("");
        setNewLocationName("");
        showNotification("success", "District added.");
      }
      return;
    }

    if (locationSubTab === "taluka") {
      if (!selectedDistrictId) {
        showNotification("error", "Add and select a district first.");
        return;
      }
      if (talukas.some((taluka) => taluka.districtId === selectedDistrictId && taluka.name.toLowerCase() === name.toLowerCase())) {
        showNotification("error", "This taluka already exists in the selected district.");
        return;
      }
      const taluka = { id: createLocationId("tk"), districtId: selectedDistrictId, name };
      const updated = [...talukas, taluka];
      if (await saveLocationList("talukas", updated)) {
        setTalukas(updated);
        setSelectedTalukaId(taluka.id);
        setNewLocationName("");
        showNotification("success", "Taluka added.");
      }
      return;
    }

    if (!selectedTalukaId) {
      showNotification("error", "Add and select a taluka first.");
      return;
    }
    if (villages.some((village) => village.talukaId === selectedTalukaId && village.name.toLowerCase() === name.toLowerCase())) {
      showNotification("error", "This village already exists in the selected taluka.");
      return;
    }
    const village = { id: createLocationId("vg"), talukaId: selectedTalukaId, name };
    const updated = [...villages, village];
    if (await saveLocationList("villages", updated)) {
      setVillages(updated);
      setNewLocationName("");
      showNotification("success", "Village added.");
    }
  };

  const handleDeleteLocation = async (
    section: "states" | "districts" | "talukas" | "villages",
    id: string,
    name: string
  ) => {
    const level = section.slice(0, -1);
    const cascadeWarning =
      section === "states"
        ? " All districts, talukas, and villages inside it will also be deleted."
        : section === "districts"
          ? " All talukas and villages inside it will also be deleted."
          : section === "talukas"
            ? " All villages inside it will also be deleted."
            : "";
    if (!confirm(`Delete ${level} "${name}"?${cascadeWarning}`)) return;

    try {
      const res = await fetch("/api/masters/general", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification("error", json.error || `Failed to delete ${level}.`);
        return;
      }
      setStates(json.data.states);
      setDistricts(json.data.districts);
      setTalukas(json.data.talukas);
      setVillages(json.data.villages);
      setSelectedStateId((current) =>
        json.data.states.some((state: StateMaster) => state.id === current)
          ? current
          : json.data.states[0]?.id || ""
      );
      setSelectedDistrictId((current) =>
        json.data.districts.some((district: DistrictMaster) => district.id === current)
          ? current
          : ""
      );
      setSelectedTalukaId((current) =>
        json.data.talukas.some((taluka: TalukaMaster) => taluka.id === current)
          ? current
          : ""
      );
      showNotification("success", `${level[0].toUpperCase()}${level.slice(1)} deleted.`);
    } catch {
      showNotification("error", `Failed to delete ${level}.`);
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
            Configure the shop profile, financial years, units, and admin login
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
          <span>E. Location Master</span>
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

      {activeTab === "locations" && (
        <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-800">Location Master</h2>
            <p className="text-xs text-slate-500">
              Type and add each location in order: state, district, taluka, then village.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["state", "district", "taluka", "village"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  setLocationSubTab(level);
                  setNewLocationName("");
                }}
                className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ${
                  locationSubTab === level
                    ? "border border-emerald-300 bg-emerald-100 text-emerald-900"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {level} ({level === "state" ? states.length : level === "district" ? districts.length : level === "taluka" ? talukas.length : villages.length})
              </button>
            ))}
          </div>

          {locationSubTab !== "state" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                  State
                  <select
                    value={selectedStateId}
                    onChange={(e) => {
                      const stateId = e.target.value;
                      const firstDistrict = districts.find((item) => item.stateId === stateId);
                      const firstTaluka = talukas.find((item) => item.districtId === firstDistrict?.id);
                      setSelectedStateId(stateId);
                      setSelectedDistrictId(firstDistrict?.id || "");
                      setSelectedTalukaId(firstTaluka?.id || "");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
                  >
                    <option value="">Select State</option>
                    {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
                  </select>
              </label>
              {(locationSubTab === "taluka" || locationSubTab === "village") && (
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  District
                  <select
                    value={selectedDistrictId}
                    onChange={(e) => {
                      const districtId = e.target.value;
                      const firstTaluka = talukas.find((item) => item.districtId === districtId);
                      setSelectedDistrictId(districtId);
                      setSelectedTalukaId(firstTaluka?.id || "");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
                  >
                    <option value="">Select District</option>
                    {districts.filter((item) => item.stateId === selectedStateId).map((district) => (
                      <option key={district.id} value={district.id}>{district.name}</option>
                    ))}
                  </select>
                </label>
              )}
              {locationSubTab === "village" && (
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  Taluka
                  <select
                    value={selectedTalukaId}
                    onChange={(e) => setSelectedTalukaId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
                  >
                    <option value="">Select Taluka</option>
                    {talukas.filter((item) => item.districtId === selectedDistrictId).map((taluka) => (
                      <option key={taluka.id} value={taluka.id}>{taluka.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleAddLocation();
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input
              type="text"
              required
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              placeholder={`Type ${locationSubTab} name`}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              Add {locationSubTab}
            </button>
          </form>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(locationSubTab === "state"
              ? states
              : locationSubTab === "district"
                ? districts.filter((item) => item.stateId === selectedStateId)
                : locationSubTab === "taluka"
                  ? talukas.filter((item) => item.districtId === selectedDistrictId)
                  : villages.filter((item) => item.talukaId === selectedTalukaId)
            ).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800">
                <span>{item.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    void handleDeleteLocation(
                      locationSubTab === "state"
                        ? "states"
                        : locationSubTab === "district"
                          ? "districts"
                          : locationSubTab === "taluka"
                            ? "talukas"
                            : "villages",
                      item.id,
                      item.name
                    )
                  }
                  aria-label={`Delete ${locationSubTab} ${item.name}`}
                  title={`Delete ${locationSubTab}`}
                  className="rounded-md p-1.5 text-red-600 hover:bg-red-100 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

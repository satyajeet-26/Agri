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
import { useLanguage } from "@/components/LanguageContext";
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
  const { lang } = useLanguage();
  const mr = lang === "mr";
  const locationLabels = {
    state: mr ? "राज्य" : "state",
    district: mr ? "जिल्हा" : "district",
    taluka: mr ? "तालुका" : "taluka",
    village: mr ? "गाव" : "village",
  };
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
    logoUrl: "/logo.png",
    licenseNumber: "",
    fertilizerLicenseNumber: "",
    pesticideLicenseNumber: "",
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
        setShop({
          ...d.shop,
          logoUrl: d.shop?.logoUrl || "/logo.png",
          fertilizerLicenseNumber:
            d.shop?.fertilizerLicenseNumber || d.shop?.licenseNumber || "",
          pesticideLicenseNumber:
            d.shop?.pesticideLicenseNumber || d.shop?.licenseNumber || "",
        });
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
        showNotification("error", json.error || (mr ? `${section} जतन करता आले नाही.` : `Failed to save ${section}.`));
        return false;
      }
      return true;
    } catch {
      showNotification("error", mr ? `${section} जतन करता आले नाही.` : `Failed to save ${section}.`);
      return false;
    }
  };

  const handleAddLocation = async () => {
    const name = newLocationName.trim();
    if (!name) return;

    if (locationSubTab === "state") {
      if (states.some((state) => state.name.toLowerCase() === name.toLowerCase())) {
        showNotification("error", mr ? "हे राज्य आधीपासून अस्तित्वात आहे." : "This state already exists.");
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
        showNotification("success", mr ? "राज्य जोडले." : "State added.");
      }
      return;
    }

    if (locationSubTab === "district") {
      if (!selectedStateId) {
        showNotification("error", mr ? "प्रथम राज्य जोडा आणि निवडा." : "Add and select a state first.");
        return;
      }
      if (districts.some((district) => district.stateId === selectedStateId && district.name.toLowerCase() === name.toLowerCase())) {
        showNotification("error", mr ? "निवडलेल्या राज्यात हा जिल्हा आधीपासून आहे." : "This district already exists in the selected state.");
        return;
      }
      const district = { id: createLocationId("dt"), stateId: selectedStateId, name };
      const updated = [...districts, district];
      if (await saveLocationList("districts", updated)) {
        setDistricts(updated);
        setSelectedDistrictId(district.id);
        setSelectedTalukaId("");
        setNewLocationName("");
        showNotification("success", mr ? "जिल्हा जोडला." : "District added.");
      }
      return;
    }

    if (locationSubTab === "taluka") {
      if (!selectedDistrictId) {
        showNotification("error", mr ? "प्रथम जिल्हा जोडा आणि निवडा." : "Add and select a district first.");
        return;
      }
      if (talukas.some((taluka) => taluka.districtId === selectedDistrictId && taluka.name.toLowerCase() === name.toLowerCase())) {
        showNotification("error", mr ? "निवडलेल्या जिल्ह्यात हा तालुका आधीपासून आहे." : "This taluka already exists in the selected district.");
        return;
      }
      const taluka = { id: createLocationId("tk"), districtId: selectedDistrictId, name };
      const updated = [...talukas, taluka];
      if (await saveLocationList("talukas", updated)) {
        setTalukas(updated);
        setSelectedTalukaId(taluka.id);
        setNewLocationName("");
        showNotification("success", mr ? "तालुका जोडला." : "Taluka added.");
      }
      return;
    }

    if (!selectedTalukaId) {
      showNotification("error", mr ? "प्रथम तालुका जोडा आणि निवडा." : "Add and select a taluka first.");
      return;
    }
    if (villages.some((village) => village.talukaId === selectedTalukaId && village.name.toLowerCase() === name.toLowerCase())) {
      showNotification("error", mr ? "निवडलेल्या तालुक्यात हे गाव आधीपासून आहे." : "This village already exists in the selected taluka.");
      return;
    }
    const village = { id: createLocationId("vg"), talukaId: selectedTalukaId, name };
    const updated = [...villages, village];
    if (await saveLocationList("villages", updated)) {
      setVillages(updated);
      setNewLocationName("");
      showNotification("success", mr ? "गाव जोडले." : "Village added.");
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
        ? mr ? " त्यातील सर्व जिल्हे, तालुके आणि गावे देखील हटवली जातील." : " All districts, talukas, and villages inside it will also be deleted."
        : section === "districts"
          ? mr ? " त्यातील सर्व तालुके आणि गावे देखील हटवली जातील." : " All talukas and villages inside it will also be deleted."
          : section === "talukas"
            ? mr ? " त्यातील सर्व गावे देखील हटवली जातील." : " All villages inside it will also be deleted."
            : "";
    const levelLabel = mr
      ? section === "states" ? "राज्य" : section === "districts" ? "जिल्हा" : section === "talukas" ? "तालुका" : "गाव"
      : level;
    if (!confirm(mr ? `“${name}” ${levelLabel} हटवायचे का?${cascadeWarning}` : `Delete ${level} "${name}"?${cascadeWarning}`)) return;

    try {
      const res = await fetch("/api/masters/general", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification("error", json.error || (mr ? `${levelLabel} हटवता आला नाही.` : `Failed to delete ${level}.`));
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
      showNotification("success", mr ? `${levelLabel} हटवले.` : `${level[0].toUpperCase()}${level.slice(1)} deleted.`);
    } catch {
      showNotification("error", mr ? `${levelLabel} हटवता आला नाही.` : `Failed to delete ${level}.`);
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
        showNotification("success", mr ? "दुकानाचा तपशील यशस्वीरित्या अद्ययावत केला!" : "Shop details updated successfully!");
      }
    } catch (err) {
      showNotification("error", mr ? "दुकानाचा तपशील अद्ययावत करता आला नाही." : "Failed to update shop details.");
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
        showNotification("success", mr ? "प्रशासक लॉगिन तपशील यशस्वीरित्या अद्ययावत केले!" : "Admin login credentials updated successfully!");
        setAdminPassword("");
      }
    } catch (err) {
      showNotification("error", mr ? "लॉगिन तपशील अद्ययावत करता आले नाहीत." : "Failed to update login credentials.");
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
    showNotification("success", mr ? "वर्ष यशस्वीरित्या जोडले!" : "Year added successfully!");
  };

  const handleToggleYearActive = async (id: string) => {
    const updated = years.map((y) => ({ ...y, isActive: y.id === id }));
    setYears(updated);
    await fetch("/api/masters/general", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "years", data: updated }),
    });
    showNotification("success", mr ? "सक्रिय आर्थिक वर्ष अद्ययावत केले!" : "Active financial year updated!");
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
    showNotification("success", mr ? "एकक यशस्वीरित्या जोडले!" : "Unit added successfully!");
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
        <span className="ml-3 text-sm text-slate-600">{mr ? "माहिती लोड होत आहे..." : "Loading settings..."}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {mr ? "१. सामान्य मुख्य सेटिंग्ज" : "1. General Master Settings"}
          </h1>
          <p className="text-xs text-slate-500">
            {mr ? "दुकानाचे प्रोफाइल, आर्थिक वर्षे, मोजमापाची एकके आणि प्रशासक लॉगिन सेट करा" : "Configure the shop profile, financial years, units, and admin login"}
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
          <span>{mr ? "अ. कंपनी / दुकानाचे नाव" : "A. Company / Shop Name"}</span>
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
          <span>{mr ? "ब. वर्ष नोंद" : "B. Year Master"}</span>
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
          <span>{mr ? "क. एकक नोंद" : "C. Unit Master"}</span>
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
          <span>{mr ? "ड. लॉगिन सेटिंग्ज" : "D. Login Settings"}</span>
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
          <span>{mr ? "इ. ठिकाण नोंद" : "E. Location Master"}</span>
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
            <span>{mr ? "कृषी सेवा केंद्र दुकानाचा तपशील" : "Krushi Seva Kendra Shop Details"}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mr ? "कंपनी / दुकानाचे नाव *" : "Company / Shop Name *"}
              </label>
              <input
                type="text"
                required
                value={shop.name}
                onChange={(e) => setShop({ ...shop, name: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder={mr ? "उदा. भारती कृषी सेवा केंद्र" : "e.g. Bharathi Krushi Seva Kendra"}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mr ? "मालक / सल्लागाराचे नाव" : "Owner / Consultant Name"}
              </label>
              <input
                type="text"
                value={shop.ownerName}
                onChange={(e) => setShop({ ...shop, ownerName: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder={mr ? "उदा. सचिन पाटील (एम.एस्सी. ॲग्री)" : "e.g. Sachin Patil (M.Sc. Agri)"}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mr ? "बोधवाक्य / उपशीर्षक" : "Tagline / Subtitle"}
              </label>
              <input
                type="text"
                value={shop.tagline}
                onChange={(e) => setShop({ ...shop, tagline: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder={mr ? "उदा. संपूर्ण कृषी सल्ला सेवा व दर्जेदार कीटकनाशके" : "e.g. Complete Agricultural Consultancy & Quality Pesticides"}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mr ? "लोगो प्रतिमा URL" : "Logo Image URL"}
              </label>
              <input
                type="url"
                value={shop.logoUrl || ""}
                onChange={(e) => setShop({ ...shop, logoUrl: e.target.value || "/logo.png" })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder="/logo.png or https://example.com/logo.png"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                {mr ? "वेबसाइटवर वापरण्यासाठी सार्वजनिक प्रतिमा URL टाका." : "Use a public image URL for the website branding."}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mr ? "संपर्क मोबाइल क्रमांक" : "Calling Mobile Number"}
              </label>
              <input
                type="text"
                value={shop.mobile}
                onChange={(e) => setShop({ ...shop, mobile: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mr ? "अधिकृत व्हॉट्सॲप क्रमांक (सल्ल्यांसाठी)" : "Official WhatsApp Number (For Advisories)"}
              </label>
              <input
                type="text"
                value={shop.whatsapp}
                onChange={(e) => setShop({ ...shop, whatsapp: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mr ? "दुकानाचा ईमेल पत्ता" : "Shop Email ID"}
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
                {mr ? "दुकानाचा पत्ता / ठिकाण" : "Shop Address / Location"}
              </label>
              <textarea
                rows={2}
                value={shop.address}
                onChange={(e) => setShop({ ...shop, address: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder={mr ? "मार्केट यार्ड, जुनी एपीएमसीजवळ, कराड, जि. सातारा" : "Market Yard, Near Old APMC, Karad, Dist. Satara"}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mr ? "खत परवाना क्रमांक" : "Fertilizer License No."}
              </label>
              <input
                type="text"
                value={shop.fertilizerLicenseNumber || ""}
                onChange={(e) =>
                  setShop({ ...shop, fertilizerLicenseNumber: e.target.value })
                }
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder={mr ? "खत परवाना क्रमांक टाका" : "Enter fertilizer license number"}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mr ? "कीटकनाशक परवाना क्रमांक" : "Pesticide License No."}
              </label>
              <input
                type="text"
                value={shop.pesticideLicenseNumber || ""}
                onChange={(e) =>
                  setShop({ ...shop, pesticideLicenseNumber: e.target.value })
                }
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                placeholder={mr ? "कीटकनाशक परवाना क्रमांक टाका" : "Enter pesticide license number"}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mr ? "जीएसटी क्रमांक" : "GST Number"}
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
              <span>{mr ? "कंपनी / दुकानाचे प्रोफाइल जतन करा" : "Save Company / Shop Profile"}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB B: Year Master */}
      {activeTab === "years" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">{mr ? "आर्थिक / कृषी वर्ष नोंद" : "Financial / Agriculture Year Master"}</h2>
              <p className="text-xs text-slate-500">{mr ? "आर्थिक वर्षे व्यवस्थापित करा (उदा. २०२६–२७, २०२७–२८)" : "Manage financial years (e.g. 2026–27, 2027–28)"}</p>
            </div>
          </div>

          {/* Add Year Form */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-700 mb-1">{mr ? "वर्षाचे नाव (उदा. २०२६–२७)" : "Year Name (e.g. 2026–27)"}</label>
              <input
                type="text"
                value={newYear.yearName}
                onChange={(e) => setNewYear({ ...newYear, yearName: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
                placeholder="2026–27"
              />
            </div>
            <div className="w-full sm:w-44">
              <label className="block text-xs font-semibold text-slate-700 mb-1">{mr ? "सुरुवातीची तारीख" : "Start Date"}</label>
              <input
                type="date"
                value={newYear.startDate}
                onChange={(e) => setNewYear({ ...newYear, startDate: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div className="w-full sm:w-44">
              <label className="block text-xs font-semibold text-slate-700 mb-1">{mr ? "शेवटची तारीख" : "End Date"}</label>
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
              <span>{mr ? "वर्ष जोडा" : "Add Year"}</span>
            </button>
          </div>

          {/* Years List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{mr ? "वर्षाचे नाव" : "Year Name"}</th>
                  <th className="py-2.5 px-3">{mr ? "सुरुवातीची तारीख" : "Start Date"}</th>
                  <th className="py-2.5 px-3">{mr ? "शेवटची तारीख" : "End Date"}</th>
                  <th className="py-2.5 px-3">{mr ? "स्थिती" : "Status"}</th>
                  <th className="py-2.5 px-3 text-right">{mr ? "कृती" : "Actions"}</th>
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
                        {y.isActive ? (mr ? "✓ सक्रिय वर्ष" : "✓ Active Year") : (mr ? "सक्रिय करा" : "Set Active")}
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
              <h2 className="text-base font-bold text-slate-800">{mr ? "एकक नोंद" : "Unit Master"}</h2>
              <p className="text-xs text-slate-500">{mr ? "औषधे, टॉनिक आणि खतांसाठी वापरली जाणारी एकके" : "Units used for medicines, tonics and fertilizers"}</p>
            </div>
          </div>

          {/* Add Unit Form */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-700 mb-1">{mr ? "एककाचे पूर्ण नाव (उदा. मिलीलीटर)" : "Unit Full Name (e.g. Milliliter)"}</label>
              <input
                type="text"
                value={newUnit.unitName}
                onChange={(e) => setNewUnit({ ...newUnit, unitName: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
                placeholder="Milliliter"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-xs font-semibold text-slate-700 mb-1">{mr ? "लघुनाव / चिन्ह (उदा. ml)" : "Short Name / Symbol (e.g. ml)"}</label>
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
              <span>{mr ? "एकक जोडा" : "Add Unit"}</span>
            </button>
          </div>

          {/* Units Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{mr ? "एककाचे नाव" : "Unit Name"}</th>
                  <th className="py-2.5 px-3">{mr ? "लघुनाव" : "Short Name"}</th>
                  <th className="py-2.5 px-3 text-right">{mr ? "कृती" : "Actions"}</th>
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
            <h2 className="text-base font-bold text-slate-800">{mr ? "प्रशासक लॉगिन सेटिंग्ज" : "Admin Login Settings"}</h2>
            <p className="text-xs text-slate-500">{mr ? "प्रशासक लॉगिन ईमेल पत्ता आणि सुरक्षा पासवर्ड बदला" : "Change Admin login email address and security password"}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mr ? "प्रशासक ईमेल पत्ता *" : "Admin Email ID *"}
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
                {mr ? "नवीन प्रशासक पासवर्ड (बदलायचा नसल्यास रिक्त ठेवा)" : "New Admin Password (leave blank to keep unchanged)"}
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder={mr ? "नवीन पासवर्ड टाका" : "Enter new password"}
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
              <span>{mr ? "लॉगिन तपशील अद्ययावत करा" : "Update Login Credentials"}</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === "locations" && (
        <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-800">{mr ? "ठिकाण नोंद" : "Location Master"}</h2>
            <p className="text-xs text-slate-500">
              {mr ? "ठिकाणे या क्रमाने टाका व जोडा: राज्य, जिल्हा, तालुका आणि गाव." : "Type and add each location in order: state, district, taluka, then village."}
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
                {locationLabels[level]} ({level === "state" ? states.length : level === "district" ? districts.length : level === "taluka" ? talukas.length : villages.length})
              </button>
            ))}
          </div>

          {locationSubTab !== "state" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                  {mr ? "राज्य" : "State"}
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
                    <option value="">{mr ? "राज्य निवडा" : "Select State"}</option>
                    {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
                  </select>
              </label>
              {(locationSubTab === "taluka" || locationSubTab === "village") && (
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  {mr ? "जिल्हा" : "District"}
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
                    <option value="">{mr ? "जिल्हा निवडा" : "Select District"}</option>
                    {districts.filter((item) => item.stateId === selectedStateId).map((district) => (
                      <option key={district.id} value={district.id}>{district.name}</option>
                    ))}
                  </select>
                </label>
              )}
              {locationSubTab === "village" && (
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  {mr ? "तालुका" : "Taluka"}
                  <select
                    value={selectedTalukaId}
                    onChange={(e) => setSelectedTalukaId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
                  >
                    <option value="">{mr ? "तालुका निवडा" : "Select Taluka"}</option>
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
              placeholder={mr ? `${locationLabels[locationSubTab]}चे नाव टाका` : `Type ${locationSubTab} name`}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              {mr ? `${locationLabels[locationSubTab]} जोडा` : `Add ${locationSubTab}`}
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
                  aria-label={mr ? `${locationLabels[locationSubTab]} ${item.name} हटवा` : `Delete ${locationSubTab} ${item.name}`}
                  title={mr ? `${locationLabels[locationSubTab]} हटवा` : `Delete ${locationSubTab}`}
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

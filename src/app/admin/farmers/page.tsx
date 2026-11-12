"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle,
  AlertCircle,
  Search,
  ArrowUpRight,
  MapPin,
  Lock,
  Grid,
  Calendar,
  X,
} from "lucide-react";
import { formatArea, calculateTotalGuntha } from "@/lib/area";
import { readFarmerProfilePhoto } from "@/lib/farmer-photo";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { useLanguage } from "@/components/LanguageContext";
import {
  Farmer,
  StateMaster,
  DistrictMaster,
  TalukaMaster,
  VillageMaster,
  OpeningBalanceType,
} from "@/types";

const getTodayDateValue = () => new Date().toISOString().split("T")[0];

export default function FarmerMasterPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const mr = lang === "mr";
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [states, setStates] = useState<StateMaster[]>([]);
  const [districts, setDistricts] = useState<DistrictMaster[]>([]);
  const [talukas, setTalukas] = useState<TalukaMaster[]>([]);
  const [villages, setVillages] = useState<VillageMaster[]>([]);
  const [crops, setCrops] = useState<string[]>(["Tomato", "Sugarcane", "Ginger"]);

  const [loading, setLoading] = useState(true);
  const [savingFarmer, setSavingFarmer] = useState(false);
  const [deletingFarmerId, setDeletingFarmerId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [identityForm, setIdentityForm] = useState({
    aadhaarNumber: "",
    profilePhotoDataUrl: "",
  });

  // New Farmer Form State
  const [form, setForm] = useState<{
    name: string;
    mobile: string;
    whatsapp: string;
    openingBalanceType: OpeningBalanceType;
    openingBalance: number;
    registrationDate: string;
    state: string;
    district: string;
    taluka: string;
    village: string;
    username: string;
    password: string;
    plots: {
      plotName: string;
      cropName: string;
      sowingDate: string;
      areaAcre: number;
      areaGuntha: number;
    }[];
  }>({
    name: "",
    mobile: "",
    whatsapp: "",
    openingBalanceType: "Debit",
    openingBalance: 0,
    registrationDate: "",
    state: "",
    district: "",
    taluka: "",
    village: "",
    username: "",
    password: "",
    plots: [
      {
        plotName: "Plot 1",
        cropName: "Tomato",
        sowingDate: "",
        areaAcre: 1,
        areaGuntha: 0,
      },
    ],
  });

  const loadData = async () => {
    try {
      const [resFarmers, resGen, resSched] = await Promise.all([
        fetchWithTimeout("/api/farmers"),
        fetchWithTimeout("/api/masters/general"),
        fetchWithTimeout("/api/schedules/master"),
      ]);
      const jsonFarmers = await resFarmers.json();
      const jsonGen = await resGen.json();
      const jsonSched = await resSched.json();

      if (resFarmers.status === 401) {
        router.replace("/login");
        return;
      }

      if (!resFarmers.ok || !jsonFarmers.success) {
        throw new Error(jsonFarmers.message || jsonFarmers.error || (mr ? "शेतकऱ्यांची माहिती लोड करता आली नाही." : "Unable to load farmers."));
      }
      if (!resGen.ok || !jsonGen.success) {
        throw new Error(jsonGen.message || jsonGen.error || (mr ? "ठिकाणाचा तपशील लोड करता आला नाही." : "Unable to load location details."));
      }
      if (!resSched.ok || !jsonSched.success) {
        throw new Error(jsonSched.message || jsonSched.error || (mr ? "पिकांचे वेळापत्रक लोड करता आले नाही." : "Unable to load crop schedules."));
      }

      setFarmers(jsonFarmers.farmers || []);
      const locationData = jsonGen.data;
      setStates(locationData.states || []);
      setDistricts(locationData.districts || []);
      setTalukas(locationData.talukas || []);
      setVillages(locationData.villages || []);

      const initialState = locationData.states?.[0];
      const initialDistrict = locationData.districts?.find(
        (district: DistrictMaster) => district.stateId === initialState?.id
      );
      const initialTaluka = locationData.talukas?.find(
        (taluka: TalukaMaster) => taluka.districtId === initialDistrict?.id
      );
      const initialVillage = locationData.villages?.find(
        (village: VillageMaster) => village.talukaId === initialTaluka?.id
      );
      setForm((current) => ({
        ...current,
        state: initialState?.name || "",
        district: initialDistrict?.name || "",
        taluka: initialTaluka?.name || "",
        village: initialVillage?.name || "",
      }));

      if (jsonSched.masterSchedules) {
        setCrops(Object.keys(jsonSched.masterSchedules));
      }
      setLoadError("");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : mr ? "शेतकरी नोंद माहिती लोड करता आली नाही." : "Unable to load farmer master.";
      setLoadError(errorMessage);
      console.error("Farmer master data load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = getTodayDateValue();
    setForm((prev) => ({
      ...prev,
      registrationDate: prev.registrationDate || today,
      plots: prev.plots.map((plot, idx) => ({
        ...plot,
        sowingDate: plot.sowingDate || (idx === 0 ? today : plot.sowingDate),
      })),
    }));
    loadData();
  }, []);

  const showNotification = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Add plot row in form
  const handleAddPlotRow = () => {
    setForm((prev) => ({
      ...prev,
      plots: [
        ...prev.plots,
        {
          plotName: `Plot ${prev.plots.length + 1}`,
          cropName: crops[0] || "Tomato",
          sowingDate: getTodayDateValue(),
          areaAcre: 1,
          areaGuntha: 0,
        },
      ],
    }));
  };

  const handleRemovePlotRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      plots: prev.plots.filter((_, i) => i !== index),
    }));
  };

  const handlePlotFieldChange = (index: number, field: string, value: any) => {
    setForm((prev) => {
      const updated = [...prev.plots];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, plots: updated };
    });
  };

  // Submit Add Farmer
  const handleCreateFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingFarmer) return;
    if (!form.name || !form.mobile) {
      showNotification("error", mr ? "शेतकऱ्याचे नाव आणि मोबाइल क्रमांक आवश्यक आहे." : "Farmer name and mobile number are required");
      return;
    }
    const aadhaarDigits = identityForm.aadhaarNumber.replace(/[\s-]/g, "");
    if (aadhaarDigits && !/^[2-9]\d{11}$/.test(aadhaarDigits)) {
      showNotification(
        "error",
        mr
          ? "आधार क्रमांक २ ते ९ ने सुरू होणारा १२ अंकी क्रमांक असावा."
          : "Aadhaar must be 12 digits and start with a number from 2 to 9."
      );
      return;
    }

    setSavingFarmer(true);
    try {
      const res = await fetchWithTimeout("/api/farmers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          aadhaarNumber: identityForm.aadhaarNumber,
          ...(identityForm.profilePhotoDataUrl
            ? { profilePhotoDataUrl: identityForm.profilePhotoDataUrl }
            : {}),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFarmers((currentFarmers) => [json.farmer, ...currentFarmers]);
        setShowAddModal(false);
        showNotification(
          "success",
          mr ? `शेतकरी व शेतजमिनी जतन केल्या. लॉगिन वापरकर्तानाव: ${json.farmer.username}` : `Farmer and plots saved. Login username: ${json.farmer.username}`
        );
        // Reset form
        setForm({
          name: "",
          mobile: "",
          whatsapp: "",
          openingBalanceType: "Debit",
          openingBalance: 0,
          registrationDate: getTodayDateValue(),
          state: states[0]?.name || "",
          district:
            districts.find((district) => district.stateId === states[0]?.id)?.name || "",
          taluka:
            talukas.find((taluka) =>
              districts.find((district) => district.stateId === states[0]?.id)?.id ===
              taluka.districtId
            )?.name || "",
          village:
            villages.find((village) =>
              talukas.find((taluka) =>
                districts.find((district) => district.stateId === states[0]?.id)?.id ===
                taluka.districtId
              )?.id === village.talukaId
            )?.name || "",
          username: "",
          password: "",
          plots: [
            {
              plotName: "Plot 1",
              cropName: crops[0] || "Tomato",
              sowingDate: getTodayDateValue(),
              areaAcre: 1,
              areaGuntha: 0,
            },
          ],
        });
        setIdentityForm({ aadhaarNumber: "", profilePhotoDataUrl: "" });
      } else {
        showNotification(
          "error",
          json.message || json.error || (mr ? `शेतकरी जोडता आला नाही (HTTP ${res.status})` : `Failed to add farmer (HTTP ${res.status})`)
        );
      }
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : mr ? "शेतकरी जतन करताना नेटवर्क त्रुटी आली." : "Network error while saving farmer."
      );
    } finally {
      setSavingFarmer(false);
    }
  };

  const handleDeleteFarmer = async (farmerId: string) => {
    if (deletingFarmerId) return;
    if (!confirm(mr ? "हा शेतकरी आणि त्याच्या सर्व शेतजमिनींची वेळापत्रके हटवायची आहेत का?" : "Are you sure you want to delete this farmer and all their plot schedules?"))
      return;
    setDeletingFarmerId(farmerId);
    try {
      const res = await fetchWithTimeout(`/api/farmers/${encodeURIComponent(farmerId)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || (mr ? `शेतकरी हटवता आला नाही (HTTP ${res.status}).` : `Failed to delete farmer (HTTP ${res.status}).`));
      }
      setFarmers((current) => current.filter((farmer) => farmer.id !== farmerId));
      showNotification("success", mr ? "शेतकरी यशस्वीरित्या हटवला." : "Farmer removed successfully");
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : mr ? "शेतकरी हटवता आला नाही." : "Failed to delete farmer."
      );
    } finally {
      setDeletingFarmerId(null);
    }
  };

  const filteredFarmers = farmers.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.mobile.includes(searchQuery) ||
      f.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedStateId = states.find((state) => state.name === form.state)?.id;
  const formDistricts = districts.filter((district) => district.stateId === selectedStateId);
  const selectedDistrictId = formDistricts.find(
    (district) => district.name === form.district
  )?.id;
  const formTalukas = talukas.filter((taluka) => taluka.districtId === selectedDistrictId);
  const selectedTalukaId = formTalukas.find((taluka) => taluka.name === form.taluka)?.id;
  const formVillages = villages.filter((village) => village.talukaId === selectedTalukaId);
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <span className="ml-3 text-sm text-slate-600">{mr ? "शेतकऱ्यांची माहिती लोड होत आहे..." : "Loading farmers..."}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadData();
            }}
            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold"
          >
            {mr ? "पुन्हा प्रयत्न करा" : "Retry"}
          </button>
        </div>
      )}
      {message && (
        <div
          role={message.type === "success" ? "status" : "alert"}
          className={`fixed right-4 top-4 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
            message.type === "success"
              ? "border-emerald-300 bg-emerald-100 text-emerald-900"
              : "border-red-300 bg-red-100 text-red-900"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {mr ? "५. शेतकरी नोंद व शेतजमिनी" : "5. Farmer Master & Plots"}
          </h1>
          <p className="text-xs text-slate-500">
            {mr
              ? "नवीन शेतकऱ्यांची नोंदणी करा, अनेक शेतजमिनी जोडा आणि वैयक्तिक फवारणी व खतांचे वेळापत्रक तयार करा"
              : "Register new farmers, assign multiple plots, and customize individualized spray & fertilizer schedules"}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={savingFarmer || loading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>{mr ? "नवीन शेतकरी जोडा" : "Add New Farmer"}</span>
          </button>
        </div>
      </div>

      {/* Farmers List Table with Search */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-slate-800 text-base">
              {mr ? `नोंदणीकृत शेतकरी (${filteredFarmers.length})` : `Registered Farmers List (${filteredFarmers.length})`}
            </h3>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={mr ? "नाव, मोबाइल, गाव किंवा वापरकर्त्यानुसार शोधा..." : "Search by name, mobile, village, user..."}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">{mr ? "शेतकऱ्याचे नाव" : "Farmer Name"}</th>
                <th className="py-2.5 px-3">{mr ? "मोबाइल व व्हॉट्सॲप" : "Mobile & WhatsApp"}</th>
                <th className="py-2.5 px-3">{mr ? "गाव / ठिकाण" : "Village / Location"}</th>
                <th className="py-2.5 px-3">{mr ? "शेतजमिनींची संख्या" : "Plots Count"}</th>
                <th className="py-2.5 px-3">{mr ? "एकूण सल्ला क्षेत्र" : "Total Consultancy Area"}</th>
                <th className="py-2.5 px-3">{mr ? "लॉगिन वापरकर्तानाव" : "Login Username"}</th>
                <th className="py-2.5 px-3">{mr ? "प्रारंभिक शिल्लक" : "Opening Balance"}</th>
                <th className="py-2.5 px-3 text-right">{mr ? "कृती" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFarmers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    {mr ? "कोणतेही शेतकरी आढळले नाहीत." : "No farmers found."}
                  </td>
                </tr>
              ) : filteredFarmers.map((f) => {
                const totalGuntha = (f.plots || []).reduce((sum, p) => sum + (p.totalGuntha || 0), 0);
                const area = formatArea(totalGuntha).formatted;

                return (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{f.name}</div>
                      <span className="text-[10px] text-slate-400">
                        Reg: {f.registrationDate}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-700">
                      <div>📞 {f.mobile}</div>
                      <div className="text-emerald-700 text-[11px]">💬 {f.whatsapp}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">{f.village}</span>
                      <p className="text-[10px] text-slate-400">{f.taluka}, {f.district}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-bold text-xs">
                        {(f.plots || []).length} {mr ? "शेतजमिनी" : (f.plots || []).length === 1 ? "Plot" : "Plots"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-700">
                      {area}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                        {f.username}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          f.openingBalanceType === "Debit"
                            ? "text-red-600"
                            : "text-emerald-600"
                        }`}
                      >
                        ₹{f.openingBalance} ({mr ? f.openingBalanceType === "Debit" ? "डेबिट" : "क्रेडिट" : f.openingBalanceType})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      {/* Manage & Customize Profile Button */}
                      <Link
                        href={`/admin/farmers/${f.id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
                        title={mr ? "प्रोफाइल पहा व शेतजमिनींचे वेळापत्रक बदला" : "View profile & customize plot schedules"}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{mr ? "बदला व सानुकूलित करा" : "Edit & Customize"}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteFarmer(f.id)}
                        disabled={deletingFarmerId !== null}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={deletingFarmerId === f.id ? (mr ? "शेतकरी हटवत आहे" : "Deleting farmer") : (mr ? "शेतकरी हटवा" : "Delete farmer")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD FARMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">{mr ? "नवीन शेतकरी जोडा व शेतजमिनी नियुक्त करा" : "Add New Farmer & Assign Plots"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={savingFarmer}
                className="text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleCreateFarmer}
              onInvalid={() =>
                showNotification(
                  "error",
                  mr ? "कृपया सर्व आवश्यक माहिती भरा आणि ठळक केलेली मूल्ये तपासा." : "Please complete all required fields and check any highlighted values."
                )
              }
              className="p-6 space-y-6 max-h-[80vh] overflow-y-auto"
            >
              {/* 1. Personal Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 pb-1 border-b border-slate-200">
                  {mr ? "१. वैयक्तिक व संपर्क माहिती" : "1. Personal & Contact Information"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {mr ? "शेतकऱ्याचे पूर्ण नाव *" : "Farmer Full Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Ramesh Dnyandeo Patil"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {mr ? "नोंदणी दिनांक" : "Registration Date"}
                    </label>
                    <input
                      type="date"
                      value={form.registrationDate}
                      onChange={(e) => setForm({ ...form, registrationDate: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {mr ? "मोबाइल क्रमांक *" : "Mobile Number *"}
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.mobile}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          mobile: e.target.value,
                          whatsapp: form.whatsapp ? form.whatsapp : e.target.value,
                        })
                      }
                      placeholder="9822114455"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <h5 className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 sm:col-span-2 lg:col-span-3">
                    {mr
                      ? "शेतकऱ्याची ओळख — आधार क्रमांक आणि फोटो (ऐच्छिक)"
                      : "Farmer Identity — Aadhaar Number & Photo (Optional)"}
                  </h5>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {mr ? "आधार क्रमांक (ऐच्छिक)" : "Aadhaar Number (optional)"}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={14}
                      value={identityForm.aadhaarNumber}
                      onChange={(event) =>
                        setIdentityForm((current) => ({
                          ...current,
                          aadhaarNumber: event.target.value,
                        }))
                      }
                      placeholder={mr ? "१२ अंकी आधार क्रमांक" : "12-digit Aadhaar number"}
                      autoComplete="off"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      {mr
                        ? "आधार क्रमांक एन्क्रिप्ट करून फक्त प्रशासकासाठी ठेवला जाईल."
                        : "Encrypted and visible only to admins in masked form."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {mr ? "शेतकऱ्याचा फोटो" : "Farmer Photo"}
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={async (event) => {
                        const input = event.currentTarget;
                        const file = input.files?.[0];
                        if (!file) return;
                        try {
                          const profilePhotoDataUrl = await readFarmerProfilePhoto(file);
                          setIdentityForm((current) => ({
                            ...current,
                            profilePhotoDataUrl,
                          }));
                        } catch (error: unknown) {
                          showNotification(
                            "error",
                            error instanceof Error
                              ? error.message
                              : mr
                                ? "निवडलेला फोटो वाचता आला नाही."
                                : "Unable to read the selected photo."
                          );
                          input.value = "";
                        }
                      }}
                      className="w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-semibold file:text-emerald-800"
                    />
                    {identityForm.profilePhotoDataUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <img
                          src={identityForm.profilePhotoDataUrl}
                          alt={mr ? "शेतकऱ्याचा फोटो पूर्वदृश्य" : "Farmer photo preview"}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setIdentityForm((current) => ({
                              ...current,
                              profilePhotoDataUrl: "",
                            }))
                          }
                          className="text-xs font-semibold text-red-700 hover:underline"
                        >
                          {mr ? "फोटो काढा" : "Remove photo"}
                        </button>
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-slate-500">
                      {mr ? "JPG, PNG किंवा WebP; कमाल 1 MB." : "JPG, PNG, or WebP; maximum 1 MB."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {mr ? "व्हॉट्सॲप क्रमांक (वेळापत्रकांसाठी)" : "WhatsApp Number (For Schedules)"}
                    </label>
                    <input
                      type="tel"
                      value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      placeholder="9822114455"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {mr ? "प्रारंभिक शिल्लक प्रकार" : "Opening Balance Type"}
                    </label>
                    <select
                      value={form.openingBalanceType}
                      onChange={(e: any) =>
                        setForm({ ...form, openingBalanceType: e.target.value })
                      }
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="Debit">{mr ? "डेबिट (नावे / उधारी)" : "Debit (नावे / उधारी)"}</option>
                      <option value="Credit">{mr ? "क्रेडिट (जमा / आगाऊ)" : "Credit (जमा / आगाऊ)"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {mr ? "प्रारंभिक शिल्लक रक्कम (₹)" : "Opening Balance Amount (₹)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.openingBalance}
                      onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-3 border-b border-slate-200 pb-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  {mr ? "२. ठिकाणाचा तपशील (ऐच्छिक)" : "2. Location Details (optional)"}
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <label className="text-xs font-semibold text-slate-700">
                    {mr ? "राज्य" : "State"}
                    <select
                      value={form.state}
                      onChange={(e) => {
                        const stateName = e.target.value;
                        const state = states.find((item) => item.name === stateName);
                        const district = districts.find((item) => item.stateId === state?.id);
                        const taluka = talukas.find((item) => item.districtId === district?.id);
                        const village = villages.find((item) => item.talukaId === taluka?.id);
                        setForm({
                          ...form,
                          state: stateName,
                          district: district?.name || "",
                          taluka: taluka?.name || "",
                          village: village?.name || "",
                        });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
                    >
                      <option value="">{mr ? "राज्य निवडा" : "Select State"}</option>
                      {states.map((state) => <option key={state.id} value={state.name}>{state.name}</option>)}
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-slate-700">
                    {mr ? "जिल्हा" : "District"}
                    <select
                      value={form.district}
                      onChange={(e) => {
                        const districtName = e.target.value;
                        const district = formDistricts.find((item) => item.name === districtName);
                        const taluka = talukas.find((item) => item.districtId === district?.id);
                        const village = villages.find((item) => item.talukaId === taluka?.id);
                        setForm({
                          ...form,
                          district: districtName,
                          taluka: taluka?.name || "",
                          village: village?.name || "",
                        });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
                    >
                      <option value="">{mr ? "जिल्हा निवडा" : "Select District"}</option>
                      {formDistricts.map((district) => <option key={district.id} value={district.name}>{district.name}</option>)}
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-slate-700">
                    {mr ? "तालुका" : "Taluka"}
                    <select
                      value={form.taluka}
                      onChange={(e) => {
                        const talukaName = e.target.value;
                        const taluka = formTalukas.find((item) => item.name === talukaName);
                        const village = villages.find((item) => item.talukaId === taluka?.id);
                        setForm({ ...form, taluka: talukaName, village: village?.name || "" });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
                    >
                      <option value="">{mr ? "तालुका निवडा" : "Select Taluka"}</option>
                      {formTalukas.map((taluka) => <option key={taluka.id} value={taluka.name}>{taluka.name}</option>)}
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-slate-700">
                    {mr ? "गाव" : "Village"}
                    <select
                      value={form.village}
                      onChange={(e) => setForm({ ...form, village: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs"
                    >
                      <option value="">{mr ? "गाव निवडा" : "Select Village"}</option>
                      {formVillages.map((village) => <option key={village.id} value={village.name}>{village.name}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              {/* 2. Website Login Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 pb-1 border-b border-slate-200">
                  {mr ? "३. शेतकरी वेबसाइट लॉगिन तपशील" : "3. Farmer Website Login Credentials"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {mr ? "वेबसाइट वापरकर्तानाव (ऐच्छिक)" : "Website Username (optional)"}
                    </label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder={mr ? "आपोआप तयार करण्यासाठी रिक्त ठेवा" : "Leave blank to generate automatically"}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {mr ? "लॉगिन पासवर्ड *" : "Login Password *"}
                    </label>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={mr ? "लॉगिन पासवर्ड सेट करा" : "Set login password"}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Multiple Plots Setup */}
              <div>
                <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    {mr ? "४. शेतजमिनींचा तपशील" : "4. Farmer Plot Details (एकापेक्षा जास्त शेतजमीन)"}
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddPlotRow}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{mr ? "+ आणखी शेतजमीन जोडा" : "+ Add Another Plot"}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {form.plots.map((plot, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-end gap-3"
                    >
                      <div className="w-full md:w-36">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          {mr ? "शेतजमिनीचे नाव / क्रमांक" : "Plot Name / No."}
                        </label>
                        <input
                          type="text"
                          required
                          value={plot.plotName}
                          onChange={(e) => handlePlotFieldChange(idx, "plotName", e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div className="w-full md:w-40">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          {mr ? "पिकाचे नाव *" : "Crop Name *"}
                        </label>
                        <select
                          value={plot.cropName}
                          onChange={(e) => handlePlotFieldChange(idx, "cropName", e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-medium"
                        >
                          {crops.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full md:w-36">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          {mr ? "पेरणी / लागवड दिनांक" : "Sowing / Plantation Date"}
                        </label>
                        <input
                          type="date"
                          value={plot.sowingDate}
                          onChange={(e) => handlePlotFieldChange(idx, "sowingDate", e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div className="w-full md:w-28">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          {mr ? "एकर" : "Acre (एकर)"}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={plot.areaAcre}
                          onChange={(e) =>
                            handlePlotFieldChange(idx, "areaAcre", Number(e.target.value))
                          }
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div className="w-full md:w-28">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          {mr ? "गुंठा" : "Guntha (गुंठा)"}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={39}
                          value={plot.areaGuntha}
                          onChange={(e) =>
                            handlePlotFieldChange(idx, "areaGuntha", Number(e.target.value))
                          }
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      {form.plots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePlotRow(idx)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg mb-0.5"
                          title={mr ? "शेतजमीन काढून टाका" : "Remove plot"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={savingFarmer}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  {mr ? "रद्द करा" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingFarmer}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 text-white text-xs font-bold shadow-md"
                >
                  {savingFarmer ? (mr ? "जतन करत आहे..." : "Saving...") : (mr ? "जतन करा व शेतकऱ्याची नोंदणी करा" : "Save & Register Farmer")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

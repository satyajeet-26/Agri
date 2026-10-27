"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [states, setStates] = useState<StateMaster[]>([]);
  const [districts, setDistricts] = useState<DistrictMaster[]>([]);
  const [talukas, setTalukas] = useState<TalukaMaster[]>([]);
  const [villages, setVillages] = useState<VillageMaster[]>([]);
  const [crops, setCrops] = useState<string[]>(["Tomato", "Sugarcane", "Ginger"]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    password: "1234",
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
        fetch("/api/farmers"),
        fetch("/api/masters/general"),
        fetch("/api/schedules/master"),
      ]);
      const jsonFarmers = await resFarmers.json();
      const jsonGen = await resGen.json();
      const jsonSched = await resSched.json();

      if (jsonFarmers.success) setFarmers(jsonFarmers.farmers || []);

      if (jsonGen.success) {
        setStates(jsonGen.data.states || []);
        setDistricts(jsonGen.data.districts || []);
        setTalukas(jsonGen.data.talukas || []);
        setVillages(jsonGen.data.villages || []);

        if (jsonGen.data.states?.[0]) {
          setForm((prev) => ({
            ...prev,
            state: jsonGen.data.states[0].name,
            district: jsonGen.data.districts[0]?.name || "",
            taluka: jsonGen.data.talukas[0]?.name || "",
            village: jsonGen.data.villages[0]?.name || "",
          }));
        }
      }

      if (jsonSched.success && jsonSched.masterSchedules) {
        setCrops(Object.keys(jsonSched.masterSchedules));
      }
    } catch (err) {
      console.error(err);
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
    setTimeout(() => setMessage(null), 3000);
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
    if (!form.name || !form.mobile) {
      showNotification("error", "Farmer name and mobile number are required");
      return;
    }

    try {
      const res = await fetch("/api/farmers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setFarmers([json.farmer, ...farmers]);
        setShowAddModal(false);
        showNotification("success", "Farmer registered and plot schedules cloned successfully!");
        // Reset form
        setForm({
          name: "",
          mobile: "",
          whatsapp: "",
          openingBalanceType: "Debit",
          openingBalance: 0,
          registrationDate: getTodayDateValue(),
          state: states[0]?.name || "",
          district: districts[0]?.name || "",
          taluka: talukas[0]?.name || "",
          village: villages[0]?.name || "",
          username: "",
          password: "1234",
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
      } else {
        showNotification("error", json.message || "Failed to add farmer");
      }
    } catch (err) {
      showNotification("error", "Network error while saving farmer");
    }
  };

  const handleDeleteFarmer = async (farmerId: string) => {
    if (!confirm("Are you sure you want to delete this farmer and all their plot schedules?"))
      return;
    try {
      const res = await fetch(`/api/farmers/${farmerId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setFarmers(farmers.filter((f) => f.id !== farmerId));
        showNotification("success", "Farmer removed successfully");
      }
    } catch (err) {
      showNotification("error", "Failed to delete farmer");
    }
  };

  const filteredFarmers = farmers.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.mobile.includes(searchQuery) ||
      f.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
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
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            5. Farmer Master & Plots
          </h1>
          <p className="text-xs text-slate-500">
            Register new farmers, assign multiple plots, and customize individualized spray & fertilizer schedules
          </p>
        </div>

        <div className="flex items-center space-x-2">
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

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Farmer (नवीन शेतकरी जोडा)</span>
          </button>
        </div>
      </div>

      {/* Farmers List Table with Search */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-slate-800 text-base">
              Registered Farmers List ({filteredFarmers.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, mobile, village, user..."
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Farmer Name</th>
                <th className="py-2.5 px-3">Mobile & WhatsApp</th>
                <th className="py-2.5 px-3">Village / Location</th>
                <th className="py-2.5 px-3">Plots Count</th>
                <th className="py-2.5 px-3">Total Consultancy Area</th>
                <th className="py-2.5 px-3">Login Username</th>
                <th className="py-2.5 px-3">Opening Balance</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFarmers.map((f) => {
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
                        {(f.plots || []).length} {(f.plots || []).length === 1 ? "Plot" : "Plots"}
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
                        ₹{f.openingBalance} ({f.openingBalanceType})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      {/* Manage & Customize Profile Button */}
                      <Link
                        href={`/admin/farmers/${f.id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
                        title="View profile & customize plot schedules"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit & Customize</span>
                      </Link>

                      <button
                        onClick={() => handleDeleteFarmer(f.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete farmer"
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
                <h3 className="font-bold text-base">Add New Farmer & Assign Plots</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateFarmer} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* 1. Personal Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 pb-1 border-b border-slate-200">
                  1. Personal & Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Farmer Full Name *
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
                      Registration Date
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
                      Mobile Number *
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      WhatsApp Number (For Schedules)
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
                      Opening Balance Type
                    </label>
                    <select
                      value={form.openingBalanceType}
                      onChange={(e: any) =>
                        setForm({ ...form, openingBalanceType: e.target.value })
                      }
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="Debit">Debit (नावे / उधारी)</option>
                      <option value="Credit">Credit (जमा / आगाऊ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Opening Balance Amount (₹)
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

              {/* 2. Location Information (State -> District -> Taluka -> Village) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 pb-1 border-b border-slate-200">
                  2. Location Details (गाव व पत्ता)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                    <select
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      {states.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                    <select
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      {districts.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Taluka</label>
                    <select
                      value={form.taluka}
                      onChange={(e) => setForm({ ...form, taluka: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      {talukas.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Village *</label>
                    <select
                      value={form.village}
                      onChange={(e) => setForm({ ...form, village: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                    >
                      {villages.map((v) => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Website Login Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 pb-1 border-b border-slate-200">
                  3. Farmer Website Login Credentials
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Website Username (युझरनेम) *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder="e.g. ramesh or 9822114455"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Login Password (पासवर्ड) *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="1234"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Multiple Plots Setup */}
              <div>
                <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    4. Farmer Plot Details (एकापेक्षा जास्त शेतजमीन)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddPlotRow}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Another Plot</span>
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
                          Plot Name / No.
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
                          Crop Name *
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
                          Sowing / Plantation Date
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
                          Acre (एकर)
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
                          Guntha (गुंठा)
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
                          title="Remove plot"
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
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md"
                >
                  Save & Register Farmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


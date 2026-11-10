"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Edit3,
  MapPin,
  Plus,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { getDateInIndia, formatScheduleDate } from "@/lib/schedule-date";
import { MarketRate, StateMaster, DistrictMaster } from "@/types";
import { useLanguage } from "@/components/LanguageContext";

interface RateForm {
  cropName: string;
  cropVariety: string;
  state: string;
  district: string;
  marketName: string;
  minimumPrice: string;
  maximumPrice: string;
  modalPrice: string;
  arrivalQuantity: string;
  rateDate: string;
  adminNotes: string;
}

const emptyForm = (rateDate: string): RateForm => ({
  cropName: "",
  cropVariety: "",
  state: "",
  district: "",
  marketName: "",
  minimumPrice: "",
  maximumPrice: "",
  modalPrice: "",
  arrivalQuantity: "",
  rateDate,
  adminNotes: "",
});

function getErrorMessage(value: unknown, fallback: string): string {
  return value && typeof value === "object" && "message" in value &&
    typeof value.message === "string"
    ? value.message
    : fallback;
}

export default function AdminMarketRatesPage() {
  const { lang } = useLanguage();
  const mr = lang === "mr";
  const [rates, setRates] = useState<MarketRate[]>([]);
  const [states, setStates] = useState<StateMaster[]>([]);
  const [districts, setDistricts] = useState<DistrictMaster[]>([]);
  const [crops, setCrops] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [varieties, setVarieties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<MarketRate | null>(null);
  const [form, setForm] = useState<RateForm>(() => emptyForm(getDateInIndia()));
  const [listDate, setListDate] = useState(getDateInIndia());
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const formRef = useRef<HTMLFormElement>(null);

  const loadData = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/market-rates", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(getErrorMessage(result, "Unable to load market rates."));
      }
      setRates(result.rates || []);
      setStates(result.states || []);
      setDistricts(result.districts || []);
      setCrops(result.crops || []);
      setMarkets(result.markets || []);
      setVarieties(result.varieties || []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load market rates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  const today = getDateInIndia();
  const publishedToday = rates.filter(
    (rate) => rate.rateDate === today && rate.status === "PUBLISHED"
  );
  const cropCountToday = new Set(publishedToday.map((rate) => rate.cropName.toLowerCase())).size;
  const pendingToday = rates.filter(
    (rate) => rate.rateDate === today && rate.status === "DRAFT"
  ).length;
  const marketsToday = new Set(publishedToday.map((rate) => rate.marketName.toLowerCase())).size;

  const visibleRates = useMemo(
    () =>
      rates.filter(
        (rate) =>
          (!listDate || rate.rateDate === listDate) &&
          (statusFilter === "ALL" || rate.status === statusFilter)
      ),
    [listDate, rates, statusFilter]
  );

  const openNewForm = () => {
    setEditingRate(null);
    setForm(emptyForm(today));
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const openEditForm = (rate: MarketRate) => {
    setEditingRate(rate);
    setForm({
      cropName: rate.cropName,
      cropVariety: rate.cropVariety,
      state: rate.state,
      district: rate.district,
      marketName: rate.marketName,
      minimumPrice: String(rate.minimumPrice),
      maximumPrice: String(rate.maximumPrice),
      modalPrice: String(rate.modalPrice),
      arrivalQuantity: rate.arrivalQuantity === null ? "" : String(rate.arrivalQuantity),
      rateDate: rate.rateDate,
      adminNotes: rate.adminNotes || "",
    });
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const saveRate = async (status: "DRAFT" | "PUBLISHED") => {
    const formElement = formRef.current;
    if (!formElement?.reportValidity()) return;

    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      ...form,
      minimumPrice: Number(form.minimumPrice),
      maximumPrice: Number(form.maximumPrice),
      modalPrice: Number(form.modalPrice),
      arrivalQuantity: form.arrivalQuantity === "" ? null : Number(form.arrivalQuantity),
      status,
    };

    try {
      const response = await fetch(
        editingRate
          ? `/api/admin/market-rates/${encodeURIComponent(editingRate.id)}`
          : "/api/admin/market-rates",
        {
          method: editingRate ? "PUT" : "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(getErrorMessage(result, "Unable to save this market rate."));
      }
      setNotice(
        status === "PUBLISHED"
          ? mr ? "बाजारभाव सर्व शेतकऱ्यांसाठी प्रकाशित केला." : "Market rate published for all farmers."
          : mr ? "दर खाजगी मसुदा म्हणून जतन केला." : "Rate saved as a private draft."
      );
      setFormOpen(false);
      await loadData();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this market rate.");
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async (rate: MarketRate) => {
    if (!window.confirm(`Delete the draft for ${rate.cropName} at ${rate.marketName}?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/market-rates/${encodeURIComponent(rate.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(getErrorMessage(result, "Unable to delete draft."));
      }
      setNotice(mr ? "मसुदा हटवला." : "Draft deleted.");
      await loadData();
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete draft.");
    }
  };

  const updateForm = (field: keyof RateForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-2xl bg-linear-to-r from-emerald-800 to-green-700 p-5 text-white shadow-lg sm:flex-row sm:items-center sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">
            {mr ? "प्रशासक बाजार व्यवस्थापन" : "Admin Market Management"}
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">{mr ? "दैनिक बाजारभाव" : "Daily Market Rates"}</h1>
          <p className="mt-1 text-sm text-emerald-100">
            {mr ? "शेतकऱ्यांसाठी अधिकृत बाजारभाव भरा आणि प्रकाशित करा." : "Enter, review, and publish official rates for farmers."}
          </p>
        </div>
        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-extrabold text-emerald-950 shadow hover:bg-amber-300"
        >
          <Plus className="h-4 w-4" />
          {mr ? "आजचा बाजारभाव जोडा" : "Add Today's Market Rate"}
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: mr ? "आजचे प्रकाशित दर" : "Today's Published Rates", value: publishedToday.length, icon: CheckCircle2, color: "emerald" },
          { label: mr ? "आज अपडेट केलेली पिके" : "Crops Updated Today", value: cropCountToday, icon: BarChart3, color: "sky" },
          { label: mr ? "प्रलंबित दर" : "Pending Rates", value: pendingToday, icon: Clock3, color: "amber" },
          { label: mr ? "बाजारांची संख्या" : "Markets Covered", value: marketsToday, icon: Store, color: "violet" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">{item.label}</p>
                <Icon className={`h-5 w-5 ${item.color === "emerald" ? "text-emerald-700" : item.color === "sky" ? "text-sky-700" : item.color === "amber" ? "text-amber-700" : "text-violet-700"}`} />
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900">{item.value}</p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{mr ? "बाजारभाव नोंदी" : "Market Rate Records"}</h2>
            <p className="text-xs text-slate-500">{mr ? "मसुदे खाजगी राहतात. प्रकाशित दर इतिहासात जतन होतात." : "Draft rates remain private. Published rates stay in history."}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="date"
              value={listDate}
              onChange={(event) => setListDate(event.target.value)}
              className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm"
              aria-label={mr ? "दराच्या तारखेनुसार फिल्टर" : "Filter by rate date"}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              aria-label={mr ? "स्थितीनुसार फिल्टर" : "Filter by status"}
            >
              <option value="ALL">{mr ? "सर्व स्थिती" : "All statuses"}</option>
              <option value="PUBLISHED">{mr ? "प्रकाशित" : "Published"}</option>
              <option value="DRAFT">{mr ? "मसुदे" : "Drafts"}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">{mr ? "बाजारभाव लोड होत आहेत..." : "Loading market rates..."}</p>
        ) : visibleRates.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">{mr ? "या तारखेसाठी आणि फिल्टरसाठी दर उपलब्ध नाहीत." : "No market rates for this date and filter."}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleRates.map((rate) => (
              <article key={rate.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-slate-900">
                      {rate.cropName} <span className="font-semibold text-slate-500">({rate.cropVariety})</span>
                    </h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${rate.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {rate.status === "PUBLISHED" ? mr ? "प्रकाशित" : "PUBLISHED" : mr ? "मसुदा" : "DRAFT"}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5" />
                    {rate.marketName}, {rate.district}, {rate.state} · {formatScheduleDate(rate.rateDate, "en")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-800">
                    ₹{rate.minimumPrice.toLocaleString("en-IN")} – ₹{rate.maximumPrice.toLocaleString("en-IN")}
                    <span className="ml-2 text-emerald-800">{mr ? "मोडल" : "Modal"} ₹{rate.modalPrice.toLocaleString("en-IN")}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => openEditForm(rate)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> {mr ? "बदला" : "Edit"}
                  </button>
                  {rate.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => void deleteDraft(rate)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {mr ? "हटवा" : "Delete"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setFormOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="market-rate-form-title"
            className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="market-rate-form-title" className="text-xl font-black text-slate-900">
                  {editingRate
                    ? mr ? "बाजारभाव बदला" : "Edit Market Rate"
                    : mr ? "आजचा बाजारभाव जोडा" : "Add Today's Market Rate"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {editingRate?.status === "PUBLISHED"
                    ? mr ? "या प्रकाशित दरातील बदल शेतकऱ्यांना लगेच दिसतील." : "Changes to this published rate are visible to farmers immediately."
                    : mr ? "खाजगी मसुदा जतन करा किंवा सर्व शेतकऱ्यांसाठी लगेच प्रकाशित करा." : "Save as a private draft or publish immediately to all farmers."}
                </p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} disabled={saving} aria-label="Close form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

            <form
              ref={formRef}
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void saveRate(editingRate?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT");
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-bold text-slate-700">
                  {mr ? "दर तारीख" : "Rate Date"} *
                  <input required type="date" value={form.rateDate} onChange={(event) => updateForm("rateDate", event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" />
                </label>
                <label className="space-y-1 text-xs font-bold text-slate-700">
                  {mr ? "पिकाचे नाव" : "Crop Name"} *
                  <input required list="crop-options" value={form.cropName} onChange={(event) => updateForm("cropName", event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" placeholder={mr ? "पीक निवडा किंवा लिहा" : "Select or enter crop"} />
                  <datalist id="crop-options">{crops.map((crop) => <option key={crop} value={crop} />)}</datalist>
                </label>
                <label className="space-y-1 text-xs font-bold text-slate-700">
                  {mr ? "पिकाची जात" : "Crop Variety"} *
                  <input required list="variety-options" value={form.cropVariety} onChange={(event) => updateForm("cropVariety", event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" placeholder={mr ? "उदा. लाल कांदा" : "e.g. Red Onion"} />
                  <datalist id="variety-options">{varieties.map((variety) => <option key={variety} value={variety} />)}</datalist>
                </label>
                <label className="space-y-1 text-xs font-bold text-slate-700">
                  {mr ? "राज्य" : "State"} *
                  <input required list="state-options" value={form.state} onChange={(event) => updateForm("state", event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" placeholder={mr ? "राज्य निवडा किंवा लिहा" : "Select or enter state"} />
                  <datalist id="state-options">{states.map((state) => <option key={state.id} value={state.name} />)}</datalist>
                </label>
                <label className="space-y-1 text-xs font-bold text-slate-700">
                  {mr ? "जिल्हा" : "District"} *
                  <input required list="district-options" value={form.district} onChange={(event) => updateForm("district", event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" placeholder={mr ? "जिल्हा निवडा किंवा लिहा" : "Select or enter district"} />
                  <datalist id="district-options">
                    {districts
                      .filter((district) => states.find((state) => state.id === district.stateId)?.name === form.state)
                      .map((district) => <option key={district.id} value={district.name} />)}
                  </datalist>
                </label>
                <label className="space-y-1 text-xs font-bold text-slate-700">
                  {mr ? "एपीएमसी बाजार" : "APMC Market"} *
                  <input required list="market-options" value={form.marketName} onChange={(event) => updateForm("marketName", event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" placeholder={mr ? "बाजार निवडा किंवा लिहा" : "Select or enter market"} />
                  <datalist id="market-options">{markets.map((market) => <option key={market} value={market} />)}</datalist>
                </label>
                {[
                  ["minimumPrice", `${mr ? "किमान दर" : "Minimum Price"} (₹ / ${mr ? "क्विंटल" : "Quintal"}) *`],
                  ["maximumPrice", `${mr ? "कमाल दर" : "Maximum Price"} (₹ / ${mr ? "क्विंटल" : "Quintal"}) *`],
                  ["modalPrice", `${mr ? "मोडल दर" : "Modal Price"} (₹ / ${mr ? "क्विंटल" : "Quintal"}) *`],
                ].map(([field, label]) => (
                  <label key={field} className="space-y-1 text-xs font-bold text-slate-700">
                    {label}
                    <input
                      required
                      type="number"
                      min="0.01"
                      max="1000000000"
                      step="0.01"
                      value={form[field as keyof RateForm]}
                      onChange={(event) => updateForm(field as keyof RateForm, event.target.value)}
                      className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal"
                    />
                  </label>
                ))}
                <label className="space-y-1 text-xs font-bold text-slate-700">
                  {mr ? "आवक (ऐच्छिक)" : "Arrival Quantity (optional)"}
                  <input type="number" min="0" max="1000000000" step="0.01" value={form.arrivalQuantity} onChange={(event) => updateForm("arrivalQuantity", event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" placeholder={mr ? "क्विंटलमध्ये प्रमाण" : "Quantity in quintals"} />
                </label>
                <label className="space-y-1 text-xs font-bold text-slate-700 sm:col-span-2">
                  {mr ? "प्रशासकाची नोंद (ऐच्छिक)" : "Admin Notes (optional)"}
                  <textarea rows={2} maxLength={2000} value={form.adminNotes} onChange={(event) => updateForm("adminNotes", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
                </label>
              </div>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                <button type="button" onClick={() => setFormOpen(false)} disabled={saving} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  {mr ? "रद्द करा" : "Cancel"}
                </button>
                {editingRate?.status !== "PUBLISHED" && (
                  <button type="button" onClick={() => void saveRate("DRAFT")} disabled={saving} className="min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-900 hover:bg-amber-100">
                    {mr ? "मसुदा जतन करा" : "Save as Draft"}
                  </button>
                )}
                <button type="button" onClick={() => void saveRate("PUBLISHED")} disabled={saving} className="min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-extrabold text-white hover:bg-emerald-800 disabled:opacity-60">
                  {saving
                    ? mr ? "जतन करत आहे..." : "Saving..."
                    : editingRate?.status === "PUBLISHED"
                      ? mr ? "बदल जतन करा" : "Save Changes"
                      : mr ? "दर प्रकाशित करा" : "Publish Rate"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

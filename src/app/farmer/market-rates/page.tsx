"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, CalendarDays, MapPin, Search, Store } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";
import { formatScheduleDate, getDateInIndia } from "@/lib/schedule-date";

interface PublishedMarketRate {
  id: string;
  cropName: string;
  cropVariety: string;
  state: string;
  district: string;
  marketName: string;
  rateUnit: "KG" | "TON";
  minimumPrice: number;
  maximumPrice: number;
  modalPrice: number;
  arrivalQuantity: number | null;
  rateDate: string;
  status: "PUBLISHED";
  createdAt: string;
  updatedAt: string;
}

function isRate(value: unknown): value is PublishedMarketRate {
  if (!value || typeof value !== "object") return false;
  const rate = value as Partial<PublishedMarketRate>;
  return (
    typeof rate.id === "string" &&
    typeof rate.cropName === "string" &&
    typeof rate.cropVariety === "string" &&
    typeof rate.state === "string" &&
    typeof rate.district === "string" &&
    typeof rate.marketName === "string" &&
    (rate.rateUnit === "KG" || rate.rateUnit === "TON") &&
    typeof rate.minimumPrice === "number" &&
    typeof rate.maximumPrice === "number" &&
    typeof rate.modalPrice === "number" &&
    typeof rate.rateDate === "string" &&
    typeof rate.updatedAt === "string" &&
    rate.status === "PUBLISHED"
  );
}

function formatPrice(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function FarmerMarketRatesPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const today = getDateInIndia();
  const [rates, setRates] = useState<PublishedMarketRate[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [market, setMarket] = useState("");
  const [trendCrop, setTrendCrop] = useState("");
  const [trendUnit, setTrendUnit] = useState<"KG" | "TON">("KG");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError("");
    const stored = localStorage.getItem("agri_user");
    if (!stored) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(stored) as { id?: string; role?: string };
      if (user.role !== "FARMER" || !user.id) {
        router.replace("/login");
        return;
      }
      const response = await fetch(
        `/api/farmers/${encodeURIComponent(user.id)}/market-rates`,
        { cache: "no-store", credentials: "same-origin" }
      );
      const result = await response.json();
      if (response.status === 401) {
        localStorage.removeItem("agri_user");
        router.replace("/login");
        return;
      }
      if (!response.ok || !result.success || !Array.isArray(result.rates)) {
        throw new Error(result.message || "Unable to load market rates.");
      }
      const published = result.rates.filter(isRate);
      setRates(published);
      setTrendCrop((current) => current || published[0]?.cropName || "");
      setTrendUnit(published[0]?.rateUnit || "KG");
    } catch (loadError: unknown) {
      if (loadError instanceof SyntaxError) {
        setError(lang === "mr" ? "बाजारभाव माहिती वाचता आली नाही." : "Could not read market rate information.");
      } else {
        setError(
          loadError instanceof Error
            ? loadError.message
            : lang === "mr" ? "बाजारभाव लोड करता आले नाहीत." : "Unable to load market rates."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [lang, router]);

  useEffect(() => {
    queueMicrotask(() => void loadRates());
  }, [loadRates]);

  const districts = useMemo(
    () => [...new Set(rates.map((rate) => rate.district))].sort((a, b) => a.localeCompare(b)),
    [rates]
  );
  const markets = useMemo(
    () =>
      [...new Set(
        rates
          .filter((rate) => !district || rate.district === district)
          .map((rate) => rate.marketName)
      )].sort((a, b) => a.localeCompare(b)),
    [district, rates]
  );
  const visibleRates = useMemo(
    () =>
      rates.filter(
        (rate) =>
          rate.rateDate === selectedDate &&
          (!district || rate.district === district) &&
          (!market || rate.marketName === market) &&
          (!search ||
            `${rate.cropName} ${rate.cropVariety}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
      ),
    [district, market, rates, search, selectedDate]
  );
  const trendRates = useMemo(
    () =>
      rates
        .filter(
          (rate) =>
            rate.cropName === trendCrop &&
            rate.rateUnit === trendUnit &&
            (!district || rate.district === district) &&
            (!market || rate.marketName === market)
        )
        .sort((a, b) => a.rateDate.localeCompare(b.rateDate) || a.updatedAt.localeCompare(b.updatedAt)),
    [district, market, rates, trendCrop, trendUnit]
  );
  const chartPoints = useMemo(() => {
    if (trendRates.length === 0) return "";
    const values = trendRates.map((rate) => rate.modalPrice);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values
      .map((value, index) => {
        const x = trendRates.length === 1 ? 50 : 8 + (index / (trendRates.length - 1)) * 84;
        const y = 88 - ((value - min) / range) * 70;
        return `${x},${y}`;
      })
      .join(" ");
  }, [trendRates]);
  const isToday = selectedDate === today;

  return (
    <main className="min-h-screen bg-slate-100 pb-10 text-slate-900">
      <header className="sticky top-0 z-30 bg-emerald-800 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/farmer" className="inline-flex items-center gap-2 text-sm font-bold">
            <ArrowLeft className="h-4 w-4" />
            {lang === "mr" ? "मुख्य पान" : "Dashboard"}
          </Link>
          <span className="flex items-center gap-2 text-sm font-extrabold">
            <Store className="h-4 w-4 text-amber-300" />
            {lang === "mr" ? "बाजार भाव" : "Market Rates"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 px-4 pt-5">
        <section className="rounded-2xl bg-linear-to-r from-emerald-800 to-green-700 p-5 text-white shadow-lg sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">
            {lang === "mr" ? "केंद्राकडून प्रकाशित" : "Published by your Kendra"}
          </p>
          <div className="mt-1 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">
                {isToday
                  ? lang === "mr" ? "आजचे बाजारभाव" : "Today's Market Rates"
                  : lang === "mr" ? "बाजारभाव इतिहास" : "Market Rate History"}
              </h1>
              <p className="mt-1 text-sm text-emerald-100">
                {lang === "mr"
                  ? "दर प्रशासकाकडून हाताने अपडेट केले जातात. मागील दर इतिहासात उपलब्ध आहेत."
                  : "Rates are entered manually by the Admin. Older published rates remain available in history."}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-xl bg-white/10 px-3 py-2 text-sm font-bold sm:self-auto">
              <CalendarDays className="h-4 w-4" />
              {formatScheduleDate(selectedDate, lang)}
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={lang === "mr" ? "पीक शोधा" : "Search crop"}
              className="min-h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm"
            />
          </label>
          <select
            value={district}
            onChange={(event) => {
              setDistrict(event.target.value);
              setMarket("");
            }}
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            aria-label={lang === "mr" ? "जिल्ह्यानुसार फिल्टर" : "Filter by district"}
          >
            <option value="">{lang === "mr" ? "सर्व जिल्हे" : "All districts"}</option>
            {districts.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select
            value={market}
            onChange={(event) => setMarket(event.target.value)}
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            aria-label={lang === "mr" ? "बाजारानुसार फिल्टर" : "Filter by APMC market"}
          >
            <option value="">{lang === "mr" ? "सर्व बाजार" : "All APMC markets"}</option>
            {markets.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              aria-label={lang === "mr" ? "दराची तारीख निवडा" : "Select rate date"}
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="rounded-lg bg-emerald-100 px-3 text-xs font-extrabold text-emerald-900 hover:bg-emerald-200"
            >
              {lang === "mr" ? "आज" : "Today"}
            </button>
          </div>
        </section>

        {error && (
          <div role="alert" className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center">
            <span>{error}</span>
            <button type="button" onClick={() => void loadRates()} className="shrink-0 rounded-lg bg-red-100 px-3 py-2 text-xs font-bold">
              {lang === "mr" ? "पुन्हा प्रयत्न करा" : "Try again"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            {lang === "mr" ? "बाजारभाव लोड होत आहेत..." : "Loading published market rates..."}
          </div>
        ) : visibleRates.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Store className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 font-extrabold text-slate-800">
              {isToday
                ? lang === "mr" ? "आजचा दर अद्याप अपडेट झालेला नाही." : "Today's rate not yet updated."
                : lang === "mr" ? "या तारखेसाठी प्रकाशित दर उपलब्ध नाहीत." : "No published rates are available for this date."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {isToday
                ? lang === "mr" ? "कृपया नंतर पुन्हा तपासा." : "Please check again later."
                : formatScheduleDate(selectedDate, lang)}
            </p>
          </div>
        ) : (
          <>
            <section aria-label={isToday ? "Today's published market rates" : "Market rate history"} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {visibleRates.map((rate) => (
                <article key={rate.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
                    <div>
                      <h2 className="text-lg font-black uppercase text-slate-900">{rate.cropName}</h2>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">{rate.cropVariety}</p>
                      <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                          {rate.marketName ? `${rate.marketName} · ` : ""}{rate.district}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800">
                      {lang === "mr" ? "प्रशासकाने अपडेट केलेला दर" : "Rate updated by Admin"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-slate-100 px-2 py-4 text-center">
                    {([
                      [lang === "mr" ? "किमान" : "Minimum", rate.minimumPrice],
                      [lang === "mr" ? "कमाल" : "Maximum", rate.maximumPrice],
                      [lang === "mr" ? "मोडल" : "Modal", rate.modalPrice],
                    ] as [string, number][]).map(([label, price]) => (
                      <div key={label} className="px-1">
                        <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
                        <p className={`mt-1 text-sm font-black ${label === (lang === "mr" ? "मोडल" : "Modal") ? "text-emerald-800" : "text-slate-900"}`}>
                          ₹{formatPrice(price)} / {rate.rateUnit === "TON" ? lang === "mr" ? "टन" : "ton" : "kg"}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-[11px] text-slate-600">
                    <span>{lang === "mr" ? "दर तारीख:" : "Rate date:"} {formatScheduleDate(rate.rateDate, lang)}</span>
                    <span>{lang === "mr" ? "अपडेट:" : "Updated:"} {new Intl.DateTimeFormat(lang === "mr" ? "mr-IN" : "en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(rate.updatedAt))}</span>
                  </div>
                </article>
              ))}
            </section>

            {!isToday && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h2 className="text-base font-extrabold text-slate-900">
                    {lang === "mr" ? "बाजारभाव इतिहास" : "Rate History"}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                      <tr>
                        {[lang === "mr" ? "तारीख" : "Date", lang === "mr" ? "पीक / जात" : "Crop / Variety", lang === "mr" ? "बाजार / जिल्हा" : "Market / District", lang === "mr" ? "किमान" : "Minimum", lang === "mr" ? "कमाल" : "Maximum", lang === "mr" ? "मोडल" : "Modal", lang === "mr" ? "अपडेट तारीख" : "Updated"].map((heading) => (
                          <th key={heading} scope="col" className="px-4 py-3 font-extrabold">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleRates.map((rate) => (
                        <tr key={rate.id} className="text-slate-700">
                          <td className="whitespace-nowrap px-4 py-3">{formatScheduleDate(rate.rateDate, lang)}</td>
                          <td className="px-4 py-3 font-semibold">{rate.cropName}<span className="block text-[10px] font-normal text-slate-500">{rate.cropVariety}</span></td>
                          <td className="px-4 py-3">{rate.marketName ? <>{rate.marketName}<span className="block text-[10px] text-slate-500">{rate.district}</span></> : rate.district}</td>
                          <td className="whitespace-nowrap px-4 py-3">₹{formatPrice(rate.minimumPrice)} / {rate.rateUnit === "TON" ? lang === "mr" ? "टन" : "ton" : "kg"}</td>
                          <td className="whitespace-nowrap px-4 py-3">₹{formatPrice(rate.maximumPrice)} / {rate.rateUnit === "TON" ? lang === "mr" ? "टन" : "ton" : "kg"}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-extrabold text-emerald-800">₹{formatPrice(rate.modalPrice)} / {rate.rateUnit === "TON" ? lang === "mr" ? "टन" : "ton" : "kg"}</td>
                          <td className="whitespace-nowrap px-4 py-3">{new Intl.DateTimeFormat(lang === "mr" ? "mr-IN" : "en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(rate.updatedAt))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <BarChart3 className="h-5 w-5 text-emerald-700" />
                {lang === "mr" ? "पीकनिहाय मोडल दराचा कल" : "Crop-wise Modal Price Trend"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {lang === "mr" ? "प्रकाशित ऐतिहासिक दरांवर आधारित" : "Based on published historical rates"}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={trendCrop}
                onChange={(event) => setTrendCrop(event.target.value)}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                aria-label={lang === "mr" ? "कलासाठी पीक निवडा" : "Select crop for trend"}
              >
                {[...new Set(rates.map((rate) => rate.cropName))].map((crop) => (
                  <option key={crop} value={crop}>{crop}</option>
                ))}
              </select>
              <select
                value={trendUnit}
                onChange={(event) => setTrendUnit(event.target.value as "KG" | "TON")}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                aria-label={lang === "mr" ? "कलासाठी दराचे एकक निवडा" : "Select price unit for trend"}
              >
                <option value="KG">{lang === "mr" ? "किलो (kg)" : "Kilogram (kg)"}</option>
                <option value="TON">{lang === "mr" ? "टन" : "Tonne (ton)"}</option>
              </select>
            </div>
          </div>
          {trendRates.length < 2 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
              {lang === "mr" ? "दराचा कल दाखवण्यासाठी किमान दोन दिवसांचे प्रकाशित दर आवश्यक आहेत." : "At least two published dates are needed to show a price trend."}
            </p>
          ) : (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>₹{formatPrice(Math.max(...trendRates.map((rate) => rate.modalPrice)))} / {trendUnit === "TON" ? lang === "mr" ? "टन" : "ton" : "kg"}</span>
                <span>₹{formatPrice(Math.min(...trendRates.map((rate) => rate.modalPrice)))} / {trendUnit === "TON" ? lang === "mr" ? "टन" : "ton" : "kg"}</span>
              </div>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${trendCrop} modal price trend`}>
                <line x1="5" y1="18" x2="95" y2="18" stroke="#e2e8f0" strokeWidth="0.6" />
                <line x1="5" y1="53" x2="95" y2="53" stroke="#e2e8f0" strokeWidth="0.6" />
                <line x1="5" y1="88" x2="95" y2="88" stroke="#e2e8f0" strokeWidth="0.6" />
                <polyline points={chartPoints} fill="none" stroke="#047857" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                {trendRates.map((rate, index) => {
                  const [x, y] = chartPoints.split(" ")[index].split(",");
                  return <circle key={`${rate.id}-${index}`} cx={x} cy={y} r="1.7" fill="#047857"><title>{`${formatScheduleDate(rate.rateDate, lang)}: ₹${formatPrice(rate.modalPrice)} / ${trendUnit === "TON" ? "ton" : "kg"}`}</title></circle>;
                })}
              </svg>
              <div className="mt-1 flex justify-between gap-2 text-[10px] text-slate-500">
                <span>{formatScheduleDate(trendRates[0].rateDate, lang)}</span>
                <span>{formatScheduleDate(trendRates[trendRates.length - 1].rateDate, lang)}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

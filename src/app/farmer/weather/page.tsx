"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  LocateFixed,
  MapPin,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";
import { formatScheduleDate } from "@/lib/schedule-date";

interface WeatherDay {
  date: string;
  code: number;
  high: number;
  low: number;
  rainProbability: number;
  rainAmount: number;
}

interface FarmerWeather {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    source: "profile" | "device";
  };
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
  };
  updatedAt: string;
}

function isWeatherResponse(value: unknown): value is FarmerWeather {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<FarmerWeather>;
  return Boolean(
    result.location &&
      result.current &&
      typeof result.current.temperature_2m === "number" &&
      typeof result.current.weather_code === "number" &&
      result.daily &&
      Array.isArray(result.daily.time) &&
      Array.isArray(result.daily.weather_code) &&
      Array.isArray(result.daily.temperature_2m_max) &&
      Array.isArray(result.daily.temperature_2m_min) &&
      Array.isArray(result.daily.precipitation_probability_max) &&
      Array.isArray(result.daily.precipitation_sum)
  );
}

function weatherDescription(code: number, language: "en" | "mr"): string {
  const descriptions: Record<number, [string, string]> = {
    0: ["Clear sky", "निरभ्र आकाश"],
    1: ["Mostly clear", "मुख्यतः निरभ्र"],
    2: ["Partly cloudy", "अंशतः ढगाळ"],
    3: ["Overcast", "ढगाळ"],
    45: ["Fog", "धुके"],
    48: ["Rime fog", "दाट धुके"],
    51: ["Light drizzle", "हलकी रिमझिम"],
    53: ["Drizzle", "रिमझिम पाऊस"],
    55: ["Heavy drizzle", "जोरदार रिमझिम"],
    56: ["Freezing drizzle", "गोठणारी रिमझिम"],
    57: ["Heavy freezing drizzle", "जोरदार गोठणारी रिमझिम"],
    61: ["Light rain", "हलका पाऊस"],
    63: ["Rain", "पाऊस"],
    65: ["Heavy rain", "जोरदार पाऊस"],
    66: ["Freezing rain", "गोठणारा पाऊस"],
    67: ["Heavy freezing rain", "जोरदार गोठणारा पाऊस"],
    71: ["Light snow", "हलका बर्फ"],
    73: ["Snow", "बर्फवृष्टी"],
    75: ["Heavy snow", "जोरदार बर्फवृष्टी"],
    77: ["Snow grains", "बर्फाचे कण"],
    80: ["Light rain showers", "हलक्या सरी"],
    81: ["Rain showers", "पावसाच्या सरी"],
    82: ["Heavy rain showers", "जोरदार पावसाच्या सरी"],
    85: ["Light snow showers", "हलकी बर्फवृष्टी"],
    86: ["Heavy snow showers", "जोरदार बर्फवृष्टी"],
    95: ["Thunderstorm", "वादळासह पाऊस"],
    96: ["Thunderstorm with hail", "गारांसह वादळ"],
    99: ["Heavy thunderstorm with hail", "जोरदार गारांसह वादळ"],
  };
  return descriptions[code]?.[language === "mr" ? 1 : 0] ??
    (language === "mr" ? "हवामानाची स्थिती" : "Weather conditions");
}

function weatherIcon(code: number, isDay = true): LucideIcon {
  if (code >= 95) return CloudLightning;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  if (code >= 71 && code <= 86) return CloudDrizzle;
  if (code >= 45 && code <= 48) return Cloud;
  if (code === 0 && isDay) return Sun;
  if (code <= 2 && isDay) return CloudSun;
  return Cloud;
}

function getForecastDays(weather: FarmerWeather): WeatherDay[] {
  return weather.daily.time.map((date, index) => ({
    date,
    code: weather.daily.weather_code[index],
    high: weather.daily.temperature_2m_max[index],
    low: weather.daily.temperature_2m_min[index],
    rainProbability: weather.daily.precipitation_probability_max[index],
    rainAmount: weather.daily.precipitation_sum[index],
  }));
}

export default function FarmerWeatherPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [farmerId, setFarmerId] = useState("");
  const [weather, setWeather] = useState<FarmerWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const loadWeather = useCallback(
    async (id: string, coordinates?: { latitude: number; longitude: number }) => {
      setLoading(true);
      setError("");
      const query = coordinates
        ? `?latitude=${encodeURIComponent(String(coordinates.latitude))}&longitude=${encodeURIComponent(String(coordinates.longitude))}`
        : "";

      try {
        const response = await fetch(
          `/api/farmers/${encodeURIComponent(id)}/weather${query}`,
          { cache: "no-store", credentials: "same-origin" }
        );
        const result = await response.json();
        if (response.status === 401) {
          localStorage.removeItem("agri_user");
          router.replace("/login");
          return;
        }
        if (!response.ok || !result.success || !isWeatherResponse(result)) {
          throw new Error(result.message || "Unable to load your local weather.");
        }
        setWeather(result);
      } catch (loadError: unknown) {
        const message =
          loadError instanceof Error ? loadError.message : "Unable to load your local weather.";
        setError(message);
      } finally {
        setLoading(false);
        setLocating(false);
      }
    },
    [router]
  );

  useEffect(() => {
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
      const id = user.id;
      queueMicrotask(() => {
        setFarmerId(id);
        void loadWeather(id);
      });
    } catch {
      localStorage.removeItem("agri_user");
      router.replace("/login");
    }
  }, [loadWeather, router]);

  const useCurrentLocation = () => {
    if (!farmerId) return;
    if (!navigator.geolocation) {
      setError(
        lang === "mr"
          ? "या ब्राउझरमध्ये लोकेशन उपलब्ध नाही. प्रोफाइलमधील ठिकाण वापरा."
          : "Location is not available in this browser. Use your saved profile location instead."
      );
      return;
    }

    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void loadWeather(farmerId, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (locationError) => {
        setLocating(false);
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? lang === "mr"
              ? "लोकेशनची परवानगी दिलेली नाही. प्रोफाइलमधील ठिकाण वापरा किंवा ब्राउझर सेटिंग्जमध्ये परवानगी द्या."
              : "Location permission was denied. Use your saved profile location or allow location in browser settings."
            : lang === "mr"
              ? "तुमचे लोकेशन मिळू शकले नाही. प्रोफाइलमधील ठिकाण वापरून पाहा."
              : "Could not get your location. Try using your saved profile location."
        );
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  };

  const currentIcon = weather
    ? weatherIcon(weather.current.weather_code, weather.current.is_day === 1)
    : CloudSun;

  return (
    <main className="min-h-screen bg-slate-100 pb-10 text-slate-900">
      <header className="sticky top-0 z-30 bg-emerald-800 text-white shadow-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/farmer" className="inline-flex items-center gap-2 text-sm font-bold">
            <ArrowLeft className="h-4 w-4" />
            {lang === "mr" ? "मुख्य पान" : "Dashboard"}
          </Link>
          <span className="flex items-center gap-2 text-sm font-extrabold">
            <CloudSun className="h-4 w-4 text-amber-300" />
            {lang === "mr" ? "स्थानिक हवामान" : "Local Weather"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-5 px-4 pt-5">
        <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {lang === "mr" ? "तुमच्या भागातील हवामान" : "Weather for your area"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {lang === "mr"
                ? "तुमच्या प्रोफाइलमधील गावावर आधारित हवामान. अचूक स्थानासाठी लोकेशन वापरा."
                : "Forecast uses your saved village. Allow device location for a more precise local forecast."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={loading || locating || !farmerId}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
            >
              <LocateFixed className="h-4 w-4" />
              {locating
                ? lang === "mr" ? "लोकेशन शोधत आहे..." : "Finding location..."
                : lang === "mr" ? "माझे लोकेशन वापरा" : "Use my location"}
            </button>
            <button
              type="button"
              onClick={() => farmerId && void loadWeather(farmerId)}
              disabled={loading || locating || !farmerId}
              aria-label={lang === "mr" ? "पुन्हा अपडेट करा" : "Refresh forecast"}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              {lang === "mr" ? "गाव वापरा" : "Use saved village"}
            </button>
          </div>
        </section>

        {error && (
          <div role="alert" className="flex flex-col justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center">
            <span>{error}</span>
            {weather && (
              <button
                type="button"
                onClick={() => farmerId && void loadWeather(farmerId)}
                className="shrink-0 rounded-lg bg-amber-200 px-3 py-2 text-xs font-bold"
              >
                {lang === "mr" ? "गावाचे हवामान दाखवा" : "Use saved location"}
              </button>
            )}
          </div>
        )}

        {loading && !weather && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
            {lang === "mr" ? "हवामान माहिती मिळवत आहे..." : "Getting local weather..."}
          </div>
        )}

        {!loading && !weather && !error && (
          <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            {lang === "mr" ? "हवामान उपलब्ध नाही." : "Weather is not available right now."}
            <button
              type="button"
              onClick={() => farmerId && void loadWeather(farmerId)}
              className="ml-2 font-bold text-emerald-800 underline"
            >
              {lang === "mr" ? "पुन्हा प्रयत्न करा" : "Try again"}
            </button>
          </div>
        )}

        {weather && (
          <>
            <section className="overflow-hidden rounded-3xl bg-linear-to-br from-sky-700 via-sky-600 to-emerald-700 p-5 text-white shadow-lg sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-100">
                    <MapPin className="h-4 w-4" />
                    {weather.location.source === "device"
                      ? lang === "mr" ? "तुमचे सध्याचे स्थान" : "Your current location"
                      : weather.location.name}
                  </p>
                  <p className="mt-1 text-xs text-sky-100">
                    {weather.location.source === "device"
                      ? lang === "mr" ? "तुमच्या डिव्हाइसच्या लोकेशनवरून" : "Based on your device location"
                      : lang === "mr" ? "तुमच्या प्रोफाइलमधील गावावरून" : "Based on your saved village"}
                  </p>
                  <div className="mt-5 flex items-center gap-4">
                    {(() => {
                      const Icon = currentIcon;
                      return <Icon className="h-16 w-16 shrink-0 text-amber-200" strokeWidth={1.5} />;
                    })()}
                    <div>
                      <p className="text-6xl font-black tracking-tight">
                        {Math.round(weather.current.temperature_2m)}°
                      </p>
                      <p className="mt-1 text-sm font-semibold text-sky-50">
                        {weatherDescription(weather.current.weather_code, lang)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:min-w-64">
                  <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                    <p className="flex items-center gap-1.5 text-xs text-sky-100">
                      <Thermometer className="h-4 w-4" />
                      {lang === "mr" ? "जाणवणारे" : "Feels like"}
                    </p>
                    <p className="mt-1 text-lg font-extrabold">{Math.round(weather.current.apparent_temperature)}°C</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                    <p className="flex items-center gap-1.5 text-xs text-sky-100">
                      <Droplets className="h-4 w-4" />
                      {lang === "mr" ? "आर्द्रता" : "Humidity"}
                    </p>
                    <p className="mt-1 text-lg font-extrabold">{weather.current.relative_humidity_2m}%</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                    <p className="flex items-center gap-1.5 text-xs text-sky-100">
                      <Wind className="h-4 w-4" />
                      {lang === "mr" ? "वाऱ्याचा वेग" : "Wind"}
                    </p>
                    <p className="mt-1 text-lg font-extrabold">{Math.round(weather.current.wind_speed_10m)} km/h</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                    <p className="flex items-center gap-1.5 text-xs text-sky-100">
                      <CloudRain className="h-4 w-4" />
                      {lang === "mr" ? "पाऊस" : "Rain"}
                    </p>
                    <p className="mt-1 text-lg font-extrabold">{weather.current.precipitation} mm</p>
                  </div>
                </div>
              </div>
              <p className="mt-5 text-[11px] text-sky-100">
                {lang === "mr" ? "अपडेट:" : "Updated:"}{" "}
                {new Intl.DateTimeFormat(lang === "mr" ? "mr-IN" : "en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: weather.location.timezone,
                }).format(new Date(weather.updatedAt))}
              </p>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {lang === "mr" ? "पुढील ५ दिवस" : "5-Day Forecast"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {lang === "mr" ? "दैनिक तापमान आणि पावसाचा अंदाज" : "Daily temperatures and rain outlook"}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {getForecastDays(weather).map((day, index) => {
                  const Icon = weatherIcon(day.code);
                  return (
                    <article key={day.date} className={`rounded-2xl border bg-white p-4 shadow-sm ${index === 0 ? "border-emerald-300 ring-1 ring-emerald-100" : "border-slate-200"}`}>
                      <p className="text-xs font-bold text-slate-500">
                        {index === 0
                          ? lang === "mr" ? "आज" : "Today"
                          : formatScheduleDate(day.date, lang)}
                      </p>
                      <div className="my-3 flex items-center justify-between gap-2">
                        <Icon className="h-8 w-8 text-sky-700" />
                        <p className="text-right text-sm font-extrabold text-slate-900">
                          {Math.round(day.high)}° <span className="font-semibold text-slate-400">{Math.round(day.low)}°</span>
                        </p>
                      </div>
                      <p className="min-h-8 text-xs font-semibold text-slate-700">
                        {weatherDescription(day.code, lang)}
                      </p>
                      <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                        <p className="flex items-center gap-1.5">
                          <Droplets className="h-3.5 w-3.5 text-sky-600" />
                          {day.rainProbability}% {lang === "mr" ? "पावसाची शक्यता" : "rain chance"}
                        </p>
                        <p>{day.rainAmount} mm {lang === "mr" ? "पाऊस" : "rainfall"}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
              <p className="font-extrabold">
                {lang === "mr" ? "शेतकऱ्यांसाठी सूचना" : "Farm weather note"}
              </p>
              <p className="mt-1">
                {lang === "mr"
                  ? "हा अंदाज स्थानिक हवामान मॉडेलवर आधारित आहे आणि शेतातील प्रत्यक्ष स्थितीपेक्षा वेगळा असू शकतो. फवारणी किंवा सिंचनापूर्वी शेतातील स्थिती तपासा."
                  : "This forecast is model-based and may differ from conditions in your field. Check local conditions before spraying or irrigating."}
              </p>
              <p className="mt-2 text-[10px] text-amber-800">
                {lang === "mr" ? "हवामान डेटा:" : "Weather data by"}{" "}
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline"
                >
                  Open-Meteo
                </a>
              </p>
            </aside>
          </>
        )}
      </div>
    </main>
  );
}

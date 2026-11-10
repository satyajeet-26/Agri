import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isFarmerRequest } from "@/lib/farmer-auth";

interface GeocodingResult {
  name?: string;
  latitude?: number;
  longitude?: number;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  country?: string;
  country_code?: string;
  timezone?: string;
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasNumericValues(value: unknown, length: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every(isFiniteNumber)
  );
}

function isValidForecast(value: unknown): value is {
  timezone?: unknown;
  current: Record<string, unknown>;
  daily: Record<string, unknown>;
} {
  if (!isRecord(value) || !isRecord(value.current) || !isRecord(value.daily)) {
    return false;
  }

  const current = value.current;
  const daily = value.daily;
  const dates = daily.time;
  if (
    typeof current.time !== "string" ||
    !isFiniteNumber(current.temperature_2m) ||
    !isFiniteNumber(current.relative_humidity_2m) ||
    !isFiniteNumber(current.apparent_temperature) ||
    !isFiniteNumber(current.is_day) ||
    !isFiniteNumber(current.precipitation) ||
    !isFiniteNumber(current.weather_code) ||
    !isFiniteNumber(current.wind_speed_10m) ||
    !Array.isArray(dates) ||
    dates.length !== 5 ||
    !dates.every((date) => typeof date === "string")
  ) {
    return false;
  }

  return (
    hasNumericValues(daily.weather_code, dates.length) &&
    hasNumericValues(daily.temperature_2m_max, dates.length) &&
    hasNumericValues(daily.temperature_2m_min, dates.length) &&
    hasNumericValues(daily.precipitation_probability_max, dates.length) &&
    hasNumericValues(daily.precipitation_sum, dates.length)
  );
}

function isCoordinates(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

async function fetchJson(url: URL, timeoutMessage: string): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.error("Open-Meteo request failed.", {
        status: response.status,
        endpoint: url.hostname,
      });
      throw new Error("Weather information is temporarily unavailable. Please try again.");
    }
    return await response.json();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function resolveFarmerLocation(farmer: {
  village: string;
  taluka: string;
  district: string;
  state: string;
}): Promise<GeocodingResult> {
  const searchName = [farmer.village, farmer.taluka, farmer.district]
    .map((value) => value.trim())
    .find(Boolean);
  if (!searchName) {
    throw new Error("Your village is not saved in your farmer profile. Use your current location instead.");
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", searchName);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  url.searchParams.set("countryCode", "IN");
  const result = await fetchJson(url, "Location lookup timed out. Please try again.");
  if (!isRecord(result) || !Array.isArray(result.results)) {
    throw new Error("The location service returned invalid search results.");
  }
  const data = result as GeocodingResponse;
  const locations = (data.results || []).filter(
    (result) =>
      typeof result.latitude === "number" &&
      typeof result.longitude === "number" &&
      result.country_code === "IN"
  );
  if (locations.length === 0) {
    throw new Error("We could not find your saved village. Use your current location to check the weather.");
  }

  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const expectedState = normalize(farmer.state);
  const expectedDistrict = normalize(farmer.district);
  const expectedTaluka = normalize(farmer.taluka);
  const matched = locations.find(
    (location) =>
      (!expectedState || normalize(location.admin1 || "") === expectedState) &&
      (!expectedDistrict ||
        normalize(location.admin2 || "") === expectedDistrict ||
        normalize(location.admin3 || "") === expectedDistrict) &&
      (!expectedTaluka ||
        normalize(location.admin2 || "") === expectedTaluka ||
        normalize(location.admin3 || "") === expectedTaluka)
  );
  return matched || locations[0];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    if (!isFarmerRequest(request, id, db)) {
      return NextResponse.json(
        { success: false, message: "Farmer authentication is required." },
        { status: 401 }
      );
    }

    const farmer = db.farmers.find((entry) => entry.id === id);
    if (!farmer) {
      return NextResponse.json(
        { success: false, message: "Farmer account not found." },
        { status: 404 }
      );
    }

    const query = new URL(request.url).searchParams;
    const latitudeValue = query.get("latitude");
    const longitudeValue = query.get("longitude");
    if ((latitudeValue === null) !== (longitudeValue === null)) {
      return NextResponse.json(
        { success: false, message: "Both latitude and longitude are required." },
        { status: 400 }
      );
    }

    let latitude: number;
    let longitude: number;
    let locationName: string;
    let source: "profile" | "device";
    if (latitudeValue !== null && longitudeValue !== null) {
      latitude = Number(latitudeValue);
      longitude = Number(longitudeValue);
      if (!isCoordinates(latitude, longitude)) {
        return NextResponse.json(
          { success: false, message: "The provided location coordinates are invalid." },
          { status: 400 }
        );
      }
      locationName = "Your current location";
      source = "device";
    } else {
      const location = await resolveFarmerLocation(farmer);
      latitude = location.latitude as number;
      longitude = location.longitude as number;
      locationName = [
        location.name,
        location.admin3,
        location.admin2,
        location.admin1,
      ]
        .filter((value, index, values) => value && values.indexOf(value) === index)
        .join(", ");
      source = "profile";
    }

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(latitude));
    forecastUrl.searchParams.set("longitude", String(longitude));
    forecastUrl.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m"
    );
    forecastUrl.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum"
    );
    forecastUrl.searchParams.set("timezone", "auto");
    forecastUrl.searchParams.set("forecast_days", "5");

    const forecast = await fetchJson(
      forecastUrl,
      "Weather forecast timed out. Please try again."
    );
    if (!isValidForecast(forecast)) {
      throw new Error("The weather service returned an incomplete or invalid forecast.");
    }

    return NextResponse.json({
      success: true,
      location: {
        name: locationName,
        latitude,
        longitude,
        timezone: typeof forecast.timezone === "string" ? forecast.timezone : "auto",
        source,
      },
      current: forecast.current,
      daily: forecast.daily,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("GET farmer weather failed:", error);
    const message = error instanceof Error ? error.message : "Unable to load local weather.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}

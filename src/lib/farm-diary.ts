import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { isFarmerRequest } from "@/lib/farmer-auth";
import { FarmDiaryActivityType, FarmDiaryEntry } from "@/types";

const ACTIVITY_TYPES: FarmDiaryActivityType[] = [
  "Spraying",
  "Fertilizer Application",
  "Pesticide Application",
  "Irrigation",
  "Labour",
  "Seeds",
  "Machinery",
  "Harvesting",
  "Other",
];
const MAX_PHOTO_BYTES = 1024 * 1024;
const MAX_EXPENSE = 100_000_000;

export interface DiaryEntryInput {
  plotId: string;
  date: string;
  season: string;
  activityType: FarmDiaryActivityType;
  description: string;
  productName: string;
  quantity: number | null;
  unit: string;
  labourCost: number;
  productCost: number;
  otherExpenses: number;
  notes: string;
  photoDataUrl?: string;
}

export class DiaryValidationError extends Error {}

export function parseDiaryEntryInput(body: unknown): DiaryEntryInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new DiaryValidationError("A valid diary entry is required.");
  }
  const input = body as Record<string, unknown>;
  const text = (key: string, maxLength: number, required = false): string => {
    const value = input[key];
    if (typeof value !== "string") {
      if (required) throw new DiaryValidationError(`${key} is required.`);
      return "";
    }
    const trimmed = value.trim();
    if (trimmed.length > maxLength) {
      throw new DiaryValidationError(`${key} must be ${maxLength} characters or fewer.`);
    }
    if (required && !trimmed) throw new DiaryValidationError(`${key} is required.`);
    return trimmed;
  };
  const numeric = (value: unknown, label: string, defaultValue = 0): number => {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value !== "number" && typeof value !== "string") {
      throw new DiaryValidationError(`${label} must be a valid number.`);
    }
    if (typeof value === "string" && !value.trim()) return defaultValue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new DiaryValidationError(`${label} must be a valid number.`);
    return parsed;
  };
  const expense = (key: string): number => {
    const value = numeric(input[key], key);
    if (value < 0 || value > MAX_EXPENSE) {
      throw new DiaryValidationError("Expenses must be valid non-negative amounts.");
    }
    return Math.round((value + Number.EPSILON) * 100) / 100;
  };

  const date = text("date", 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new DiaryValidationError("Choose a valid activity date.");
  }
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new DiaryValidationError("Choose a valid activity date.");
  }
  const activityType = input.activityType;
  if (typeof activityType !== "string" || !ACTIVITY_TYPES.includes(activityType as FarmDiaryActivityType)) {
    throw new DiaryValidationError("Choose a valid activity type.");
  }

  const rawQuantity = input.quantity;
  let quantity: number | null = null;
  if (rawQuantity !== undefined && rawQuantity !== null && rawQuantity !== "") {
    quantity = numeric(rawQuantity, "Quantity");
    if (quantity < 0 || quantity > 1_000_000_000) {
      throw new DiaryValidationError("Quantity must be a valid non-negative number.");
    }
  }

  const rawPhoto = input.photoDataUrl;
  let photoDataUrl: string | undefined;
  if (rawPhoto !== undefined && rawPhoto !== null && rawPhoto !== "") {
    if (typeof rawPhoto !== "string") throw new DiaryValidationError("The photo must be a valid image.");
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(rawPhoto);
    if (!match) throw new DiaryValidationError("Upload a JPG, PNG, or WebP photo.");
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) {
      throw new DiaryValidationError("Photos must be smaller than 1 MB.");
    }
    const isJpeg = match[1] === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      match[1] === "image/png" &&
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp =
      match[1] === "image/webp" &&
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP";
    if (!isJpeg && !isPng && !isWebp) {
      throw new DiaryValidationError("The uploaded file is not a valid image.");
    }
    photoDataUrl = rawPhoto;
  }

  return {
    plotId: text("plotId", 160, true),
    date,
    season: text("season", 80, true),
    activityType: activityType as FarmDiaryActivityType,
    description: text("description", 1000, true),
    productName: text("productName", 200),
    quantity,
    unit: text("unit", 32),
    labourCost: expense("labourCost"),
    productCost: expense("productCost"),
    otherExpenses: expense("otherExpenses"),
    notes: text("notes", 2000),
    photoDataUrl,
  };
}

export async function authorizeDiaryRequest(request: Request, farmerId: string) {
  const db = await getDb();
  const isAdmin = isAdminRequest(request, db);
  if (!isAdmin && !isFarmerRequest(request, farmerId, db)) {
    return {
      response: NextResponse.json(
        { success: false, message: "Authentication is required." },
        { status: 401 }
      ),
    };
  }
  const farmer = db.farmers.find((entry) => entry.id === farmerId);
  if (!farmer) {
    return {
      response: NextResponse.json(
        { success: false, message: "Farmer not found." },
        { status: 404 }
      ),
    };
  }
  return { db, farmer, isAdmin };
}

export function createDiaryEntry(
  input: DiaryEntryInput,
  farmerId: string,
  cropName: string
): FarmDiaryEntry {
  const now = new Date().toISOString();
  const totalExpense =
    Math.round(
      (input.labourCost + input.productCost + input.otherExpenses + Number.EPSILON) * 100
    ) / 100;
  return {
    ...input,
    id: randomUUID(),
    farmerId,
    cropName,
    totalExpense,
    createdAt: now,
    updatedAt: now,
  };
}

export async function readDiaryRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new DiaryValidationError("A valid JSON request body is required.");
  }
}
